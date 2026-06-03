/**
 * UI Rendering Module
 */

import { getSubjects, getSubject } from './data.js';

export function renderScheduleWeek(schedule, container) {
  container.innerHTML = '';
  container.className = 'schedule schedule--week';

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
  const statusClass = session.status === 'completed' ? 'session-item__status--completed' :
    session.status === 'skipped' ? 'session-item__status--skipped' : '';

  const checkIcon = session.status === 'completed' ?
    '<svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/></svg>' :
    session.status === 'skipped' ?
      '<svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"/></svg>' : '';

  return `
    <div class="session-item" data-session-id="${session.id}" data-date="${session.date}">
      <div class="session-item__color" style="background-color: ${session.color}"></div>
      <div class="session-item__info">
        <div class="session-item__name">${session.subjectName}</div>
        <div class="session-item__time">${session.startTime} - ${session.endTime}</div>
      </div>
      <div class="session-item__status ${statusClass}">
        ${checkIcon}
      </div>
    </div>
  `;
}

export function renderSubjectList(subjects, container, filter = 'all') {
  container.innerHTML = '';

  let filtered;
  if (filter === 'all') {
    filtered = subjects;
  } else if (filter === 'fixed') {
    filtered = subjects.filter(s => s.type === 'fixed' || s.type === 'hybrid');
  } else if (filter === 'flexible') {
    filtered = subjects.filter(s => s.type === 'flexible' || s.type === 'semi-flexible' || s.type === 'hybrid');
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

  filtered.forEach(subject => {
    const li = document.createElement('li');
    li.className = 'subject-item';
    li.dataset.subjectId = subject.id;

    let scheduleText = '';
    let typeLabel = '';

    switch (subject.type) {
      case 'fixed':
        typeLabel = '📅 Cố định';
        scheduleText = subject.schedule?.map(s => `${getDayName(s.day)} ${s.startTime}-${s.endTime || ''}`).join(', ') || '';
        break;
      case 'semi-flexible':
        typeLabel = '🕐 Bán linh hoạt';
        {
          const slots = subject.flexibleConfig?.timeSlots?.map(s =>
            s === 'morning' ? 'Sáng' : s === 'afternoon' ? 'Chiều' : 'Tối'
          ).join('/') || 'Sáng';
          scheduleText = `${subject.flexibleConfig?.sessionsPerWeek || 3}x/tuần • ${slots} • ${subject.slotDuration || 1.5}h`;
        }
        break;
      case 'flexible':
        typeLabel = '🔄 Linh hoạt';
        scheduleText = `${subject.flexibleConfig?.sessionsPerWeek || 5}x/tuần • ${subject.slotDuration || 2}h/buổi`;
        break;
      case 'hybrid':
        typeLabel = '🔀 Kết hợp';
        {
          const fixedPart = subject.schedule?.map(s => `${getDayName(s.day)} ${s.startTime}`).join(', ') || '';
          const flexPart = subject.flexibleConfig ? `+ ${subject.flexibleConfig.sessionsPerWeek}x linh hoạt` : '';
          scheduleText = `${fixedPart} ${flexPart}`;
        }
        break;
      default:
        typeLabel = '📋 Khác';
        scheduleText = `${subject.slotDuration || 1.5}h/buổi`;
    }

    li.innerHTML = `
      <div class="subject-item__color" style="background-color: ${subject.color}"></div>
      <div class="subject-item__info">
        <div class="subject-item__name">${subject.name}</div>
        <div class="subject-item__meta">
          ${typeLabel} • ${scheduleText}
        </div>
      </div>
      <div class="subject-item__actions">
        <button class="btn btn--icon btn-edit-subject" data-id="${subject.id}" aria-label="Sửa">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
          </svg>
        </button>
        <button class="btn btn--icon btn-delete-subject" data-id="${subject.id}" aria-label="Xóa">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"/>
          </svg>
        </button>
      </div>
    `;

    container.appendChild(li);
  });
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
  row.className = 'schedule-row';

  row.innerHTML = `
    <select class="schedule-day-select">
      <option value="1" ${slot?.day === 1 ? 'selected' : ''}>T2</option>
      <option value="2" ${slot?.day === 2 ? 'selected' : ''}>T3</option>
      <option value="3" ${slot?.day === 3 ? 'selected' : ''}>T4</option>
      <option value="4" ${slot?.day === 4 ? 'selected' : ''}>T5</option>
      <option value="5" ${slot?.day === 5 ? 'selected' : ''}>T6</option>
      <option value="6" ${slot?.day === 6 ? 'selected' : ''}>T7</option>
      <option value="0" ${slot?.day === 0 ? 'selected' : ''}>CN</option>
    </select>
    <input type="time" class="schedule-start-input" value="${slot?.startTime || '09:00'}" title="Giờ bắt đầu">
    <span class="schedule-separator">→</span>
    <input type="time" class="schedule-end-input" value="${slot?.endTime || '10:30'}" title="Giờ kết thúc">
    <span class="schedule-duration">${slot ? calculateDuration(slot.startTime, slot.endTime) : '1.5h'}</span>
    <button type="button" class="btn btn--icon btn-remove-schedule" aria-label="Xóa">
      <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"/>
      </svg>
    </button>
  `;

  // Auto-calculate duration when time changes
  const startInput = row.querySelector('.schedule-start-input');
  const endInput = row.querySelector('.schedule-end-input');
  const durationSpan = row.querySelector('.schedule-duration');

  const updateDuration = () => {
    durationSpan.textContent = calculateDuration(startInput.value, endInput.value);
  };

  startInput.addEventListener('change', updateDuration);
  endInput.addEventListener('change', updateDuration);

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

    if (startTime && endTime) {
      schedule.push({ day, startTime, endTime });
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
