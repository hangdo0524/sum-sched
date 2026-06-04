/**
 * Dashboard Module
 * Shows today's schedule overview with countdown to next session
 */

import { getSubjects, getSessions } from './data.js';
import { formatDate, formatDateDisplay } from './scheduler.js';

let countdownInterval = null;
const categoryIcons = { academic: '📚', physical: '🏃', art: '🎨' };

export function initDashboard() {
  updateDashboard();
  setupDashboardTabs();
  // Update every minute
  setInterval(updateDashboard, 60000);
}

function setupDashboardTabs() {
  const tabs = document.querySelectorAll('.dashboard__tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabId = tab.dataset.tab;

      // Update active tab
      tabs.forEach(t => t.classList.remove('dashboard__tab--active'));
      tab.classList.add('dashboard__tab--active');

      // Update active panel
      document.querySelectorAll('.dashboard__panel').forEach(p => {
        p.classList.remove('dashboard__panel--active');
      });
      document.getElementById(`panel-${tabId}`)?.classList.add('dashboard__panel--active');
    });
  });
}

export function updateDashboard() {
  const today = formatDate(new Date());
  const subjects = getSubjects();
  const allSessions = getSessions();

  // Get today's sessions (both fixed and flexible)
  const todaySessions = getTodaySessions(today, subjects, allSessions);

  // Sort by start time
  todaySessions.sort((a, b) => a.startTime.localeCompare(b.startTime));

  // Render today's sessions list
  renderTodaySessions(todaySessions);

  // Find and highlight next session
  const nextSession = findNextSession(todaySessions);
  renderNextSession(nextSession);

  // Start countdown if there's a next session
  if (nextSession) {
    startCountdown(nextSession);
  } else {
    stopCountdown();
  }
}

function getTodaySessions(today, subjects, allSessions) {
  const dayOfWeek = new Date(today + 'T00:00:00').getDay();
  const sessions = [];
  const addedKeys = new Set();

  // Only get FIXED sessions (selected=true) from subjects
  subjects.forEach(subject => {
    if (!['fixed', 'fixed-plus'].includes(subject.type)) return;
    if (!subject.schedule) return;

    subject.schedule.forEach(slot => {
      if (slot.day !== dayOfWeek) return;
      // Only include if selected=true (fixed slots)
      if (slot.selected === false) return;

      const key = `${subject.id}_${slot.startTime}`;
      if (addedKeys.has(key)) return;
      addedKeys.add(key);

      // Check if this fixed slot is skipped
      const existingSession = allSessions.find(s =>
        s.subjectId === subject.id &&
        s.date === today &&
        s.startTime === slot.startTime
      );

      if (existingSession?.status === 'skipped') return;

      sessions.push({
        id: existingSession?.id || `fixed_${subject.id}_${slot.day}_${slot.startTime}`,
        subjectId: subject.id,
        subjectName: subject.name,
        category: subject.category,
        color: subject.color,
        startTime: slot.startTime,
        endTime: slot.endTime,
        status: existingSession?.status || 'pending',
        isFixed: true
      });
    });
  });

  // Get stored sessions for today (flexible + weekly-pick that were scheduled)
  allSessions.forEach(session => {
    if (session.date !== today) return;

    const key = `${session.subjectId}_${session.startTime}`;
    if (addedKeys.has(key)) return;
    addedKeys.add(key);

    const subject = subjects.find(s => s.id === session.subjectId);
    if (!subject) return;

    sessions.push({
      ...session,
      subjectName: subject.name,
      category: subject.category,
      color: subject.color,
      isFixed: false
    });
  });

  return sessions;
}

function findNextSession(sessions) {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // Find sessions that haven't started yet
  const upcoming = sessions.filter(s => {
    const [hours, mins] = s.startTime.split(':').map(Number);
    const sessionMinutes = hours * 60 + mins;
    return sessionMinutes > currentMinutes && s.status !== 'completed' && s.status !== 'skipped';
  });

  return upcoming[0] || null;
}

function getSessionStatus(session) {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [startH, startM] = session.startTime.split(':').map(Number);
  const [endH, endM] = session.endTime.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  if (session.status === 'completed') return 'done';
  if (session.status === 'skipped') return 'skipped';
  if (currentMinutes >= startMinutes && currentMinutes < endMinutes) return 'current';
  if (currentMinutes >= endMinutes) return 'past';
  return 'upcoming';
}

function renderTodaySessions(sessions) {
  const container = document.getElementById('today-sessions');
  const dateEl = document.getElementById('today-date');

  if (!container) return;

  // Update date display
  const today = new Date();
  const dayNames = ['Chủ nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
  if (dateEl) {
    dateEl.textContent = `${dayNames[today.getDay()]}, ${today.getDate()}/${today.getMonth() + 1}`;
  }

  if (sessions.length === 0) {
    container.innerHTML = `
      <div class="today__empty">
        🎉 Hôm nay không có lịch học!
      </div>
    `;
    return;
  }

  const nextSession = findNextSession(sessions);

  container.innerHTML = sessions.map(session => {
    const status = getSessionStatus(session);
    const icon = categoryIcons[session.category] || '📖';
    const isNext = nextSession && session.id === nextSession.id;

    let statusClass = '';
    let statusText = '';

    switch (status) {
      case 'done':
        statusClass = 'today-session--done';
        statusText = '<span class="today-session__status today-session__status--done">✓ Xong</span>';
        break;
      case 'current':
        statusClass = 'today-session--current';
        statusText = '<span class="today-session__status today-session__status--current">🔴 Đang học</span>';
        break;
      case 'skipped':
        statusClass = 'today-session--done';
        statusText = '<span class="today-session__status">Bỏ qua</span>';
        break;
      case 'past':
        statusClass = 'today-session--done';
        statusText = '<span class="today-session__status">Đã qua</span>';
        break;
      default:
        if (isNext) {
          statusClass = 'today-session--next';
          statusText = '<span class="today-session__status" style="background: var(--color-primary); color: white;">Tiếp theo</span>';
        }
    }

    return `
      <div class="today-session ${statusClass}" style="--session-color: ${session.color}">
        <span class="today-session__icon">${icon}</span>
        <span class="today-session__time">${session.startTime} - ${session.endTime}</span>
        <span class="today-session__name">${session.subjectName}</span>
        ${statusText}
      </div>
    `;
  }).join('');
}

function renderNextSession(session) {
  const card = document.getElementById('next-session-card');
  const nameEl = document.getElementById('next-session-name');
  const timeEl = document.getElementById('next-session-time');
  const countdownEl = document.getElementById('countdown-value');

  if (!card || !nameEl || !timeEl) return;

  if (!session) {
    card.classList.add('dashboard__next-session--inactive');
    nameEl.textContent = 'Không có lịch sắp tới';
    timeEl.textContent = 'Hôm nay đã xong!';
    if (countdownEl) countdownEl.textContent = '🎉';
    return;
  }

  card.classList.remove('dashboard__next-session--inactive');
  const icon = categoryIcons[session.category] || '📖';
  nameEl.textContent = `${icon} ${session.subjectName}`;
  timeEl.textContent = `${session.startTime} - ${session.endTime}`;
}

function startCountdown(session) {
  stopCountdown();

  const countdownEl = document.getElementById('countdown-value');
  if (!countdownEl) return;

  const [hours, mins] = session.startTime.split(':').map(Number);
  const targetTime = new Date();
  targetTime.setHours(hours, mins, 0, 0);

  function updateCountdown() {
    const now = new Date();
    const diff = targetTime - now;

    if (diff <= 0) {
      countdownEl.textContent = '🔔 GIỜ!';
      stopCountdown();
      // Refresh to show current session
      setTimeout(updateDashboard, 1000);
      return;
    }

    const totalSeconds = Math.floor(diff / 1000);
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;

    if (h > 0) {
      countdownEl.textContent = `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    } else {
      countdownEl.textContent = `${m}:${String(s).padStart(2, '0')}`;
    }
  }

  updateCountdown();
  countdownInterval = setInterval(updateCountdown, 1000);
}

function stopCountdown() {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
}

export default {
  initDashboard,
  updateDashboard
};
