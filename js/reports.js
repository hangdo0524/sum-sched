/**
 * Reports & Statistics Module
 */

import { getSubjects, getSessions, getSessionsByDateRange } from './data.js';
import { formatDate, addDays, getWeekStart, parseDate, getDayOfWeek } from './scheduler.js';

// Get all sessions for a date range including fixed sessions from schedules
function getAllSessionsForRange(startDate, endDate, subjects, storedSessions) {
  const allSessions = [];
  const processedKeys = new Set();

  // Generate date range
  const dates = [];
  let current = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  while (current <= end) {
    dates.push(formatDate(current));
    current.setDate(current.getDate() + 1);
  }

  // Add fixed sessions from subject schedules
  subjects.forEach(subject => {
    if (!['fixed', 'fixed-plus'].includes(subject.type)) return;
    if (!subject.schedule) return;

    subject.schedule.forEach(slot => {
      if (slot.selected === false) return; // Skip unselected slots

      dates.forEach(dateStr => {
        const dayOfWeek = getDayOfWeek(dateStr);
        if (slot.day !== dayOfWeek) return;

        const key = `${subject.id}_${dateStr}_${slot.startTime}`;
        if (processedKeys.has(key)) return;
        processedKeys.add(key);

        // Check if there's a stored session for this slot
        const stored = storedSessions.find(s =>
          s.subjectId === subject.id &&
          s.date === dateStr &&
          s.startTime === slot.startTime
        );

        allSessions.push({
          subjectId: subject.id,
          date: dateStr,
          startTime: slot.startTime,
          endTime: slot.endTime,
          status: stored?.status || 'pending',
          notes: stored?.notes || '',
          isFixed: true
        });
      });
    });
  });

  // Add stored flexible sessions (not already added as fixed)
  storedSessions.forEach(session => {
    if (session.date < startDate || session.date > endDate) return;

    const key = `${session.subjectId}_${session.date}_${session.startTime}`;
    if (processedKeys.has(key)) return;
    processedKeys.add(key);

    allSessions.push(session);
  });

  return allSessions;
}

export function calculateStats(sessions, subjects) {
  const now = new Date();
  const currentDate = formatDate(now);
  const currentTime = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

  // Helper to check if session is past due
  const isPastDue = (session) => {
    if (session.date < currentDate) return true;
    if (session.date === currentDate && session.endTime < currentTime) return true;
    return false;
  };

  const total = sessions.length;
  const completed = sessions.filter(s => s.status === 'completed').length;
  // Count skipped = explicitly skipped OR past due without completion
  const skipped = sessions.filter(s =>
    s.status === 'skipped' || (isPastDue(s) && s.status !== 'completed')
  ).length;

  const totalHours = sessions.reduce((sum, s) => {
    const subject = subjects.find(sub => sub.id === s.subjectId);
    return sum + (subject?.slotDuration || 1.5);
  }, 0);

  const completedHours = sessions
    .filter(s => s.status === 'completed')
    .reduce((sum, s) => {
      const subject = subjects.find(sub => sub.id === s.subjectId);
      return sum + (subject?.slotDuration || 1.5);
    }, 0);

  const subjectStats = {};
  sessions.forEach(session => {
    if (!subjectStats[session.subjectId]) {
      const subject = subjects.find(s => s.id === session.subjectId);
      subjectStats[session.subjectId] = {
        id: session.subjectId,
        name: subject?.name || 'Unknown',
        color: subject?.color || '#6b7280',
        total: 0,
        completed: 0,
        skipped: 0,
        hours: 0,
        completedHours: 0
      };
    }

    const subject = subjects.find(s => s.id === session.subjectId);
    const duration = subject?.slotDuration || 1.5;

    subjectStats[session.subjectId].total++;
    subjectStats[session.subjectId].hours += duration;

    if (session.status === 'completed') {
      subjectStats[session.subjectId].completed++;
      subjectStats[session.subjectId].completedHours += duration;
    } else if (session.status === 'skipped' || isPastDue(session)) {
      subjectStats[session.subjectId].skipped++;
    }
  });

  const completedSubjects = Object.values(subjectStats).filter(
    s => s.total > 0 && s.completed === s.total
  ).length;

  return {
    total,
    completed,
    skipped,
    pending: total - completed - skipped,
    progress: total > 0 ? Math.round((completed / total) * 100) : 0,
    totalHours,
    completedHours,
    completedSubjects,
    totalSubjects: Object.keys(subjectStats).length,
    bySubject: Object.values(subjectStats)
  };
}

export function getDayStats(date = new Date()) {
  const dateStr = formatDate(date);
  const subjects = getSubjects();
  const storedSessions = getSessions();
  const sessions = getAllSessionsForRange(dateStr, dateStr, subjects, storedSessions);

  return calculateStats(sessions, subjects);
}

export function getWeekStats(date = new Date()) {
  const weekStart = getWeekStart(date);
  const weekEnd = addDays(weekStart, 6);
  const startStr = formatDate(weekStart);
  const endStr = formatDate(weekEnd);

  const subjects = getSubjects();
  const storedSessions = getSessions();
  const sessions = getAllSessionsForRange(startStr, endStr, subjects, storedSessions);

  return calculateStats(sessions, subjects);
}

export function getMonthStats(date = new Date()) {
  const d = new Date(date);
  const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
  const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  const startStr = formatDate(monthStart);
  const endStr = formatDate(monthEnd);

  const subjects = getSubjects();
  const storedSessions = getSessions();
  const sessions = getAllSessionsForRange(startStr, endStr, subjects, storedSessions);

  return calculateStats(sessions, subjects);
}

export function renderReportSummary(stats) {
  document.getElementById('stat-progress').textContent = `${stats.progress}%`;
  document.getElementById('stat-hours').textContent = `${stats.completedHours}h`;
  document.getElementById('stat-subjects').textContent = stats.completedSubjects;
}

export function renderReportChart(stats, container) {
  container.innerHTML = '';

  if (stats.bySubject.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">📊</div>
        <div class="empty-state__text">Chưa có dữ liệu</div>
      </div>
    `;
    return;
  }

  // Find max value for scaling
  const maxValue = Math.max(...stats.bySubject.map(s =>
    Math.max(s.total, s.completed + s.skipped)
  ), 5);

  // Create vertical bar chart
  let html = `
    <div class="bar-chart">
      <div class="bar-chart__legend">
        <span class="legend-item"><span class="legend-dot" style="background:#94a3b8"></span> Mục tiêu</span>
        <span class="legend-item"><span class="legend-dot" style="background:#3b82f6"></span> Đã lên lịch</span>
        <span class="legend-item"><span class="legend-dot" style="background:#22c55e"></span> Đã học</span>
        <span class="legend-item"><span class="legend-dot" style="background:#ef4444"></span> Bỏ qua</span>
        <span class="legend-item"><span class="legend-dot" style="background:#f59e0b"></span> Chờ</span>
      </div>
      <div class="bar-chart__container">
  `;

  stats.bySubject.forEach(subject => {
    const targetPct = (subject.total / maxValue) * 100;
    const scheduledPct = (subject.total / maxValue) * 100;
    const completedPct = (subject.completed / maxValue) * 100;
    const skippedPct = (subject.skipped / maxValue) * 100;
    const pendingPct = ((subject.total - subject.completed - subject.skipped) / maxValue) * 100;

    html += `
      <div class="bar-chart__group">
        <div class="bar-chart__bars">
          <div class="bar-chart__bar bar-chart__bar--target" style="height:${targetPct}%" title="Mục tiêu: ${subject.total}">
            <span class="bar-chart__value">${subject.total}</span>
          </div>
          <div class="bar-chart__bar bar-chart__bar--scheduled" style="height:${scheduledPct}%" title="Đã lên lịch: ${subject.total}">
            <span class="bar-chart__value">${subject.total}</span>
          </div>
          <div class="bar-chart__bar bar-chart__bar--completed" style="height:${completedPct}%" title="Đã học: ${subject.completed}">
            ${subject.completed > 0 ? `<span class="bar-chart__value">${subject.completed}</span>` : ''}
          </div>
          <div class="bar-chart__bar bar-chart__bar--skipped" style="height:${skippedPct}%" title="Bỏ qua: ${subject.skipped}">
            ${subject.skipped > 0 ? `<span class="bar-chart__value">${subject.skipped}</span>` : ''}
          </div>
          <div class="bar-chart__bar bar-chart__bar--pending" style="height:${pendingPct}%" title="Chờ: ${subject.total - subject.completed - subject.skipped}">
            ${(subject.total - subject.completed - subject.skipped) > 0 ? `<span class="bar-chart__value">${subject.total - subject.completed - subject.skipped}</span>` : ''}
          </div>
        </div>
        <div class="bar-chart__label" style="color:${subject.color}">${subject.name}</div>
      </div>
    `;
  });

  html += `
      </div>
    </div>
  `;

  container.innerHTML = html;
}

export function getDetailedWeekStats(date = new Date()) {
  const weekStart = getWeekStart(date);
  const subjects = getSubjects();
  const storedSessions = getSessions();

  const weekDates = [];
  for (let i = 0; i < 7; i++) {
    weekDates.push(formatDate(addDays(weekStart, i)));
  }

  const startStr = weekDates[0];
  const endStr = weekDates[6];

  // Get all sessions including fixed ones
  const allSessions = getAllSessionsForRange(startStr, endStr, subjects, storedSessions);

  const DAY_NAMES = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

  const detailedStats = subjects.map(subject => {
    const config = subject.config || {};
    let targetSessions = 0;

    if (subject.type === 'self-study' || subject.type === 'flexible') {
      targetSessions = config.sessionsPerWeek || 0;
    } else if (subject.type === 'fixed') {
      targetSessions = (subject.schedule || []).filter(s => s.selected !== false).length;
      if (subject.extraSelfStudy?.enabled) {
        targetSessions += subject.extraSelfStudy.sessionsPerWeek || 0;
      }
    } else if (subject.type === 'fixed-plus') {
      targetSessions = config.targetSessions || (subject.schedule || []).filter(s => s.selected).length;
    } else if (subject.type === 'weekly-pick') {
      targetSessions = config.targetSessions || 1;
    }

    // Use allSessions instead of just stored sessions
    const subjectSessions = allSessions.filter(s =>
      s.subjectId === subject.id && weekDates.includes(s.date)
    );

    const scheduled = subjectSessions.length;
    const completed = subjectSessions.filter(s => s.status === 'completed').length;
    const skipped = subjectSessions.filter(s => s.status === 'skipped').length;
    const pending = subjectSessions.filter(s => s.status === 'pending' || !s.status).length;

    const sessionsByDate = {};
    subjectSessions.forEach(s => {
      const d = parseDate(s.date);
      const dayName = DAY_NAMES[d.getDay()];
      const dateLabel = `${dayName} ${d.getDate()}/${d.getMonth() + 1}`;

      if (!sessionsByDate[s.date]) {
        sessionsByDate[s.date] = { label: dateLabel, sessions: [] };
      }
      sessionsByDate[s.date].sessions.push({
        time: `${s.startTime}-${s.endTime}`,
        status: s.status || 'pending'
      });
    });

    return {
      id: subject.id,
      name: subject.name,
      color: subject.color,
      category: subject.category,
      type: subject.type,
      target: targetSessions,
      scheduled,
      completed,
      skipped,
      pending,
      remaining: Math.max(0, targetSessions - scheduled),
      dates: Object.values(sessionsByDate)
    };
  });

  return detailedStats.filter(s => s.target > 0 || s.scheduled > 0);
}

export function renderDetailedTable(stats, container) {
  if (!container) return;

  if (stats.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">📋</div>
        <div class="empty-state__text">Chưa có môn học nào</div>
      </div>
    `;
    return;
  }

  const categoryIcons = {
    academic: '📚',
    physical: '🏃',
    art: '🎨'
  };

  let html = `
    <table class="report-table">
      <thead>
        <tr>
          <th>Môn học</th>
          <th>Mục tiêu</th>
          <th>Đã lên</th>
          <th>Đã học</th>
          <th>Bỏ qua</th>
          <th>Chờ</th>
          <th>Còn thiếu</th>
          <th>Chi tiết ngày</th>
        </tr>
      </thead>
      <tbody>
  `;

  stats.forEach(s => {
    const icon = categoryIcons[s.category] || '📖';
    const datesHtml = s.dates.map(d => {
      const statusBadges = d.sessions.map(sess => {
        const statusClass = sess.status === 'completed' ? 'badge--success' :
                           sess.status === 'skipped' ? 'badge--danger' : 'badge--warning';
        return `<span class="badge ${statusClass}" title="${sess.time}">${sess.status === 'completed' ? '✓' : sess.status === 'skipped' ? '✗' : '○'}</span>`;
      }).join('');
      return `<div class="date-item">${d.label} ${statusBadges}</div>`;
    }).join('');

    const remainingClass = s.remaining > 0 ? 'text-danger' : 'text-success';

    html += `
      <tr>
        <td>
          <span class="subject-badge" style="background-color: ${s.color}20; color: ${s.color}">
            ${icon} ${s.name}
          </span>
        </td>
        <td class="text-center">${s.target}</td>
        <td class="text-center">${s.scheduled}</td>
        <td class="text-center text-success">${s.completed}</td>
        <td class="text-center text-danger">${s.skipped}</td>
        <td class="text-center text-warning">${s.pending}</td>
        <td class="text-center ${remainingClass}"><strong>${s.remaining}</strong></td>
        <td class="dates-cell">${datesHtml || '<span class="text-muted">-</span>'}</td>
      </tr>
    `;
  });

  html += `
      </tbody>
    </table>
  `;

  container.innerHTML = html;
}

export default {
  calculateStats,
  getDayStats,
  getWeekStats,
  getMonthStats,
  renderReportSummary,
  renderReportChart,
  getDetailedWeekStats,
  renderDetailedTable
};
