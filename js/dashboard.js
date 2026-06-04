/**
 * Dashboard Module
 * Shows today's schedule overview with countdown to next session
 * Includes AI-powered motivation features
 */

import { getSubjects, getSessions, getCurrentUser } from './data.js';
import { formatDate, formatDateDisplay } from './scheduler.js';
import {
  generateGreeting,
  generateQuote,
  getTimeOfDay,
  calculateAge,
  hasApiKey
} from './ai-service.js';

let countdownInterval = null;
const categoryIcons = { academic: '📚', physical: '🏃', art: '🎨' };

export function initDashboard() {
  updateDashboard();
  setupDashboardTabs();
  updateMotivation();
  // Update every minute
  setInterval(updateDashboard, 60000);
  // Update motivation every 30 minutes
  setInterval(updateMotivation, 30 * 60 * 1000);
}

async function updateMotivation() {
  const greetingEl = document.getElementById('ai-greeting');
  const quoteEl = document.getElementById('ai-quote');

  if (!greetingEl && !quoteEl) return;

  const user = getCurrentUser();
  const sessions = getSessions();
  const today = formatDate(new Date());

  // Calculate streak (consecutive days with completed sessions)
  let streak = 0;
  let checkDate = new Date();
  checkDate.setDate(checkDate.getDate() - 1);
  while (true) {
    const dateStr = formatDate(checkDate);
    const daySessions = sessions.filter(s => s.date === dateStr);
    const hasCompleted = daySessions.some(s => s.status === 'completed');
    if (hasCompleted) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
    if (streak > 30) break; // Cap at 30
  }

  // Calculate recent progress
  const last7Days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    last7Days.push(formatDate(d));
  }
  const recentSessions = sessions.filter(s => last7Days.includes(s.date));
  const completedCount = recentSessions.filter(s => s.status === 'completed').length;
  const totalCount = recentSessions.length;
  const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  let recentProgress = 'bình thường';
  if (completionRate >= 80) recentProgress = 'xuất sắc';
  else if (completionRate >= 60) recentProgress = 'tốt';
  else if (completionRate < 40) recentProgress = 'cần cố gắng hơn';

  const context = {
    studentName: user?.name || 'bạn',
    age: calculateAge(user?.birthDate) || 10,
    timeOfDay: getTimeOfDay(),
    streak: streak,
    recentProgress: recentProgress,
    mood: 'neutral',
    recentPerformance: recentProgress,
    subjectFocus: 'tổng hợp'
  };

  // Update greeting
  if (greetingEl) {
    if (hasApiKey()) {
      const greeting = await generateGreeting(context);
      greetingEl.textContent = greeting;
    } else {
      // Default greeting without AI
      const greetings = {
        morning: `🌅 Chào buổi sáng ${context.studentName}!`,
        afternoon: `☀️ Chào buổi chiều ${context.studentName}!`,
        evening: `🌙 Chào buổi tối ${context.studentName}!`
      };
      let greeting = greetings[context.timeOfDay];
      if (streak >= 3) greeting += ` 🔥 ${streak} ngày liên tục!`;
      greetingEl.textContent = greeting;
    }
  }

  // Update quote
  if (quoteEl) {
    if (hasApiKey()) {
      const quote = await generateQuote(context);
      quoteEl.textContent = quote;
    } else {
      // Default quotes
      const quotes = [
        "🌟 Mỗi bước nhỏ hôm nay là nền tảng cho thành công ngày mai!",
        "💪 Kiên trì là siêu năng lực của người thành công!",
        "🚀 Con đang tiến bộ mỗi ngày, hãy tin vào bản thân!",
        "🌈 Khó khăn hôm nay là bài học quý giá cho tương lai!",
        "⭐ Không ai giỏi ngay từ đầu, quan trọng là không bỏ cuộc!"
      ];
      quoteEl.textContent = quotes[Math.floor(Math.random() * quotes.length)];
    }
  }
}

function setupDashboardTabs() {
  const tabs = document.querySelectorAll('.dashboard__tab');
  const scheduleView = document.getElementById('view-schedule');

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

      // Toggle week schedule view visibility
      if (scheduleView) {
        if (tabId === 'week') {
          scheduleView.style.display = 'block';
        } else {
          scheduleView.style.display = 'none';
        }
      }
    });
  });

  // Initially hide schedule view (show only "Hôm nay")
  if (scheduleView) {
    scheduleView.style.display = 'none';
  }
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
  console.log('renderTodaySessions:', sessions.length, 'sessions');

  if (!container) {
    console.warn('today-sessions container not found');
    return;
  }

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
    let statusBadge = '';

    switch (status) {
      case 'done':
        statusClass = 'today-session--done';
        statusBadge = '<span class="today-session__status today-session__status--done">✅ Đã học</span>';
        break;
      case 'skipped':
        statusClass = 'today-session--skipped';
        statusBadge = '<span class="today-session__status" style="background:#fecaca;color:#dc2626;">⏭️ Bỏ qua</span>';
        break;
      case 'current':
        statusClass = 'today-session--current';
        statusBadge = '<span class="today-session__status today-session__status--current">🔴 Đang học</span>';
        break;
      case 'past':
        statusClass = 'today-session--past';
        statusBadge = '<span class="today-session__status" style="background:#fef3c7;color:#b45309;">⚠️ Chưa ghi nhận</span>';
        break;
      default:
        if (isNext) {
          statusClass = 'today-session--next';
          statusBadge = '<span class="today-session__status" style="background:var(--color-primary);color:white;">▶️ Tiếp theo</span>';
        }
    }

    return `
      <div class="today-session ${statusClass}" style="--session-color: ${session.color}">
        <span class="today-session__icon">${icon}</span>
        <span class="today-session__time">${session.startTime} - ${session.endTime}</span>
        <span class="today-session__name">${session.subjectName}</span>
        ${statusBadge}
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
