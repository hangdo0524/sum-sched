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

export default {
  calculateStats,
  getDayStats,
  getWeekStats,
  getMonthStats,
  renderReportSummary,
  renderReportChart
};
