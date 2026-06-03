/**
 * UI Rendering Module
 */

import { getSubjects, getSubject } from './data.js';

export function renderScheduleWeek(schedule, container) {
  container.innerHTML = '';
  container.className = 'schedule schedule--calendar';

  // Find time range from all sessions
  let minHour = 24, maxHour = 0;
  Object.values(schedule).forEach(day => {
    day.sessions.forEach(s => {
      const startH = parseInt(s.startTime.split(':')[0]);
      const endH = Math.ceil(timeToMins(s.endTime) / 60);
      minHour = Math.min(minHour, startH);
      maxHour = Math.max(maxHour, endH);
    });
  });

  // Default range if no sessions
  if (minHour >= maxHour) {
    minHour = 8;
    maxHour = 20;
  }

  const HOUR_HEIGHT = 48; // pixels per hour
  const totalHours = maxHour - minHour;

  // Header row with days
  const days = Object.values(schedule);
  let html = `
    <div class="calendar-header">
      <div class="calendar-time-col"></div>
      ${days.map(day => {
        const headerClass = day.isToday ? 'calendar-day-header--today' :
          day.event ? 'calendar-day-header--event' : '';
        return `
          <div class="calendar-day-header ${headerClass}">
            <span class="calendar-day-name">${day.dayName.split(' ')[0]}</span>
            <span class="calendar-day-date">${day.dayName.split(' ')[1] || ''}</span>
            ${day.event ? `<span class="event-badge-sm">${day.event.description || '🎉'}</span>` : ''}
          </div>
        `;
      }).join('')}
    </div>
    <div class="calendar-body" style="height: ${totalHours * HOUR_HEIGHT}px;">
      <div class="calendar-grid">
        <div class="calendar-times">
  `;

  // Time labels
  for (let h = minHour; h < maxHour; h++) {
    html += `<div class="calendar-time-label" style="height: ${HOUR_HEIGHT}px;">${String(h).padStart(2, '0')}:00</div>`;
  }

  html += `</div><div class="calendar-days">`;

  // Day columns with positioned sessions
  days.forEach((day, dayIndex) => {
    const isEvent = day.event && ['holiday', 'trip'].includes(day.event.type);

    html += `<div class="calendar-day-col ${isEvent ? 'calendar-day-col--event' : ''}">`;

    // Hour grid lines
    for (let h = minHour; h < maxHour; h++) {
      html += `<div class="calendar-hour-line" style="top: ${(h - minHour) * HOUR_HEIGHT}px;"></div>`;
    }

    // Sessions positioned absolutely
    if (!isEvent) {
      day.sessions.forEach(session => {
        const startMins = timeToMins(session.startTime);
        const endMins = timeToMins(session.endTime);
        const durationMins = endMins - startMins;

        const topPx = ((startMins / 60) - minHour) * HOUR_HEIGHT;
        const heightPx = (durationMins / 60) * HOUR_HEIGHT;

        html += renderCalendarItem(session, topPx, heightPx);
      });
    }

    html += `</div>`;
  });

  html += `</div></div></div>`;
  container.innerHTML = html;
}

const CATEGORY_ICONS = {
  academic: '📚',
  art: '🎨',
  physical: '🏃'
};

function renderCalendarItem(session, topPx, heightPx) {
  const statusClass = session.status === 'completed' ? 'cal-item--completed' :
    session.status === 'skipped' ? 'cal-item--skipped' : '';

  const startTime = session.startTime.slice(0, 5);
  const endTime = session.endTime.slice(0, 5);
  const isShort = heightPx < 40;
  const categoryIcon = CATEGORY_ICONS[session.category] || '📋';

  return `
    <div class="cal-item ${statusClass} ${isShort ? 'cal-item--short' : ''}"
         data-session-id="${session.id}"
         data-date="${session.date}"
         style="top: ${topPx}px; height: ${heightPx - 2}px; background-color: ${session.color}30; border-left-color: ${session.color}">
      <span class="cal-item__name"><span class="cal-item__icon">${categoryIcon}</span> ${session.subjectName}</span>
      ${!isShort ? `<span class="cal-item__time">${startTime}-${endTime}</span>` : ''}
    </div>
  `;
}

function timeToMins(time) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export function renderScheduleWeekList(schedule, container) {
  // Old list-style view (keep as alternative)
  container.innerHTML = '';
  container.className = 'schedule schedule--week-list';

  Object.values(schedule).forEach(day => {
    const dayEl = document.createElement('div');
    dayEl.className = 'schedule-day';

    const headerClass = day.isToday ? 'schedule-day__header--today' :
      day.event ? 'schedule-day__header--event' : '';

    dayEl.innerHTML = `
      <div class="schedule-day__header ${headerClass}">
        <span>${day.dayName}</span>
        ${day.event ? `<span class="event-badge">${day.event.description || day.event.type}</span>` : ''}
      </div>
      <div class="schedule-day__sessions">
        ${day.sessions.length ? day.sessions.map(s => renderSessionItem(s)).join('') :
      day.event ? '<div class="schedule-day--empty">Nghỉ</div>' :
        '<div class="schedule-day--empty">Chưa có lịch</div>'}
      </div>
    `;

    container.appendChild(dayEl);
  });
}

export function renderScheduleDay(daySchedule, container) {
  container.innerHTML = '';

  const dayEl = document.createElement('div');
  dayEl.className = 'schedule-day schedule-day--single';

  const headerClass = daySchedule.isToday ? 'schedule-day__header--today' :
    daySchedule.event ? 'schedule-day__header--event' : '';

  dayEl.innerHTML = `
    <div class="schedule-day__header ${headerClass}">
      <span>${daySchedule.dayName}</span>
      ${daySchedule.event ? `<span class="event-badge">${daySchedule.event.description || daySchedule.event.type}</span>` : ''}
    </div>
    <div class="schedule-day__sessions">
      ${daySchedule.sessions.length ? daySchedule.sessions.map(s => renderSessionItem(s)).join('') :
      daySchedule.event ? '<div class="schedule-day--empty">Nghỉ</div>' :
        '<div class="schedule-day--empty">Chưa có lịch</div>'}
    </div>
  `;

  container.appendChild(dayEl);
}

function renderSessionItem(session) {
  const statusClass = session.status === 'completed' ? 'session-item--completed' :
    session.status === 'skipped' ? 'session-item--skipped' : '';

  const statusIcon = session.status === 'completed' ?
    '<span class="session-item__check">✓</span>' :
    session.status === 'skipped' ? '<span class="session-item__skip">—</span>' : '';

  return `
    <div class="session-item ${statusClass}" data-session-id="${session.id}" data-date="${session.date}">
      <div class="session-item__color" style="background-color: ${session.color}"></div>
      <div class="session-item__info">
        <div class="session-item__name">${session.subjectName} ${statusIcon}</div>
        <div class="session-item__time">${session.startTime} - ${session.endTime}</div>
      </div>
    </div>
  `;
}

const CATEGORIES = {
  academic: { label: '📚 Học thuật', order: 1 },
  art: { label: '🎨 Nghệ thuật', order: 2 },
  physical: { label: '🏃 Thể chất', order: 3 }
};

export function renderSubjectList(subjects, container, filter = 'all') {
  container.innerHTML = '';

  let filtered;
  if (filter === 'all') {
    filtered = subjects;
  } else if (filter === 'fixed') {
    filtered = subjects.filter(s =>
      s.type === 'fixed' || s.type === 'fixed-plus' || s.type === 'weekly-pick' || s.type === 'hybrid'
    );
  } else if (filter === 'flexible') {
    filtered = subjects.filter(s =>
      s.type === 'self-study' || s.type === 'flexible' || s.type === 'semi-flexible' ||
      s.type === 'fixed-plus' || s.type === 'weekly-pick' || s.type === 'hybrid'
    );
  } else {
    filtered = subjects.filter(s => s.type === filter);
  }

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">📚</div>
        <div class="empty-state__text">Chưa có môn học nào</div>
      </div>
    `;
    return;
  }

  // Group by category
  const grouped = { academic: [], art: [], physical: [] };
  filtered.forEach(s => {
    const cat = s.category || 'academic';
    if (grouped[cat]) grouped[cat].push(s);
    else grouped.academic.push(s);
  });

  // Render each category
  Object.entries(CATEGORIES).forEach(([key, cat]) => {
    const items = grouped[key];
    if (items.length === 0) return;

    const section = document.createElement('div');
    section.className = 'subject-category';
    section.innerHTML = `<div class="subject-category__title">${cat.label}</div>`;

    const grid = document.createElement('ul');
    grid.className = 'subject-grid';

    items.forEach(subject => {
      const li = createSubjectCard(subject);
      grid.appendChild(li);
    });

    section.appendChild(grid);
    container.appendChild(section);
  });
}

function createSubjectCard(subject) {
  const li = document.createElement('li');
  li.className = 'subject-card';
  li.dataset.subjectId = subject.id;
  li.style.setProperty('--card-color', subject.color);

  let typeIcon = '';
  let scheduleText = '';

  const selectedSlots = subject.schedule?.filter(s => s.selected !== false) || [];

  switch (subject.type) {
    case 'fixed':
      typeIcon = '📅';
      scheduleText = selectedSlots.map(s => getDayName(s.day)).join(' ') || 'Chưa chọn';
      break;
    case 'weekly-pick':
      typeIcon = '📆';
      {
        const target = subject.config?.targetSessions || 1;
        const totalSlots = subject.schedule?.length || 0;
        scheduleText = `${target}/${totalSlots} buổi/tuần`;
      }
      break;
    case 'fixed-plus':
      typeIcon = '📅+';
      {
        const fixedCount = selectedSlots.length;
        const optionalCount = (subject.schedule?.length || 0) - fixedCount;
        scheduleText = `${fixedCount}+${optionalCount} buổi`;
      }
      break;
    case 'self-study':
      typeIcon = '📖';
      {
        const config = subject.config || {};
        scheduleText = `${config.sessionsPerWeek || 5}x/${subject.slotDuration || 2}h`;
      }
      break;
    default:
      typeIcon = '📋';
      scheduleText = `${subject.slotDuration || 1.5}h`;
  }

  li.innerHTML = `
    <div class="subject-card__header">
      <span class="subject-card__type">${typeIcon}</span>
      <span class="subject-card__name">${subject.name}</span>
    </div>
    <span class="subject-card__schedule">${scheduleText}</span>
    <button class="btn btn--icon btn-delete-subject" data-id="${subject.id}" aria-label="Xóa">
      <svg width="12" height="12" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"/>
      </svg>
    </button>
  `;

  return li;
}


function getDayName(day) {
  const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  return days[day];
}

export function renderScheduleInputs(container, schedule = []) {
  container.innerHTML = '';

  if (!schedule || schedule.length === 0) {
    addScheduleRow(container);
  } else {
    schedule.forEach(slot => {
      addScheduleRow(container, slot);
    });
  }
}

export function addScheduleRow(container, slot = null) {
  const row = document.createElement('div');
  const isSelected = slot?.selected !== false;
  row.className = `schedule-row ${isSelected ? 'schedule-row--selected' : ''}`;
  row.dataset.selected = isSelected ? 'true' : 'false';

  const duration = slot ? calculateDuration(slot.startTime, slot.endTime) : '1.5h';

  row.innerHTML = `
    <label class="schedule-row__check" title="Tick = cố định cả hè">
      <input type="checkbox" class="schedule-fixed-check" ${isSelected ? 'checked' : ''}>
    </label>
    <select class="schedule-day-select">
      <option value="1" ${slot?.day === 1 ? 'selected' : ''}>T2</option>
      <option value="2" ${slot?.day === 2 ? 'selected' : ''}>T3</option>
      <option value="3" ${slot?.day === 3 ? 'selected' : ''}>T4</option>
      <option value="4" ${slot?.day === 4 ? 'selected' : ''}>T5</option>
      <option value="5" ${slot?.day === 5 ? 'selected' : ''}>T6</option>
      <option value="6" ${slot?.day === 6 ? 'selected' : ''}>T7</option>
      <option value="0" ${slot?.day === 0 ? 'selected' : ''}>CN</option>
    </select>
    <input type="time" class="schedule-start-input" value="${slot?.startTime || '08:30'}">
    <span class="schedule-sep">-</span>
    <input type="time" class="schedule-end-input" value="${slot?.endTime || '10:00'}">
    <span class="schedule-duration">${duration}</span>
    <button type="button" class="btn-remove-schedule" aria-label="Xóa">×</button>
  `;

  const startInput = row.querySelector('.schedule-start-input');
  const endInput = row.querySelector('.schedule-end-input');
  const durationSpan = row.querySelector('.schedule-duration');
  const checkbox = row.querySelector('.schedule-fixed-check');

  const updateDuration = () => {
    durationSpan.textContent = calculateDuration(startInput.value, endInput.value);
  };

  startInput.addEventListener('change', updateDuration);
  endInput.addEventListener('change', updateDuration);

  // Checkbox toggle
  checkbox.addEventListener('change', () => {
    row.dataset.selected = checkbox.checked ? 'true' : 'false';
    row.classList.toggle('schedule-row--selected', checkbox.checked);
  });

  container.appendChild(row);
}

function calculateDuration(startTime, endTime) {
  if (!startTime || !endTime) return '0h';
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  const duration = (eh * 60 + em - sh * 60 - sm) / 60;
  return duration > 0 ? `${duration}h` : '0h';
}

export function getScheduleFromInputs(container) {
  const rows = container.querySelectorAll('.schedule-row');
  const schedule = [];

  rows.forEach(row => {
    const day = parseInt(row.querySelector('.schedule-day-select').value);
    const startTime = row.querySelector('.schedule-start-input').value;
    const endTime = row.querySelector('.schedule-end-input').value;
    const selected = row.dataset.selected === 'true';

    if (startTime && endTime) {
      schedule.push({ day, startTime, endTime, selected });
    }
  });

  return schedule;
}

export function showModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('modal--open');
    document.body.style.overflow = 'hidden';
  }
}

export function hideModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('modal--open');
    document.body.style.overflow = '';
  }
}

export function hideAllModals() {
  document.querySelectorAll('.modal--open').forEach(modal => {
    modal.classList.remove('modal--open');
  });
  document.body.style.overflow = '';
}

export function switchView(viewId) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('view--active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('nav-btn--active'));

  const view = document.getElementById(`view-${viewId}`);
  const btn = document.querySelector(`[data-view="${viewId}"]`);

  if (view) view.classList.add('view--active');
  if (btn) btn.classList.add('nav-btn--active');
}

export default {
  renderScheduleWeek,
  renderScheduleDay,
  renderSubjectList,
  renderScheduleInputs,
  addScheduleRow,
  getScheduleFromInputs,
  showModal,
  hideModal,
  hideAllModals,
  switchView
};
