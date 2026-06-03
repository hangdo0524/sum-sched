/**
 * Reports & Statistics Module
 */

import { getSubjects, getSessions, getSessionsByDateRange } from './data.js';
import { formatDate, addDays, getWeekStart, parseDate } from './scheduler.js';

export function calculateStats(sessions, subjects) {
  const total = sessions.length;
  const completed = sessions.filter(s => s.status === 'completed').length;
  const skipped = sessions.filter(s => s.status === 'skipped').length;

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
    } else if (session.status === 'skipped') {
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
  const sessions = getSessions().filter(s => s.date === dateStr);

  return calculateStats(sessions, subjects);
}

export function getWeekStats(date = new Date()) {
  const weekStart = getWeekStart(date);
  const weekEnd = addDays(weekStart, 6);

  const subjects = getSubjects();
  const sessions = getSessionsByDateRange(formatDate(weekStart), formatDate(weekEnd));

  return calculateStats(sessions, subjects);
}

export function getMonthStats(date = new Date()) {
  const d = new Date(date);
  const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
  const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);

  const subjects = getSubjects();
  const sessions = getSessionsByDateRange(formatDate(monthStart), formatDate(monthEnd));

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

  stats.bySubject.forEach(subject => {
    const progress = subject.total > 0 ?
      Math.round((subject.completed / subject.total) * 100) : 0;

    const item = document.createElement('div');
    item.className = 'chart-item';
    item.style.setProperty('--chart-color', subject.color);

    item.innerHTML = `
      <div class="chart-item__header">
        <span class="chart-item__name">${subject.name}</span>
        <span class="chart-item__value">${subject.completed}/${subject.total} (${subject.completedHours}h)</span>
      </div>
      <div class="chart-item__bar">
        <div class="chart-item__progress" style="width: ${progress}%"></div>
      </div>
    `;

    container.appendChild(item);
  });
}

export function getDetailedWeekStats(date = new Date()) {
  const weekStart = getWeekStart(date);
  const subjects = getSubjects();
  const sessions = getSessions();

  const weekDates = [];
  for (let i = 0; i < 7; i++) {
    weekDates.push(formatDate(addDays(weekStart, i)));
  }

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

    const subjectSessions = sessions.filter(s =>
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
