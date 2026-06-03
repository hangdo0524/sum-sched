/**
 * Summer Schedule App - Main Entry Point
 */

import {
  getSubjects,
  getSubject,
  saveSubject,
  deleteSubject,
  getEvents,
  saveEvent,
  getSessions,
  getSession,
  saveSession,
  loadSampleData,
  generateId
} from './data.js';

import {
  formatDate,
  getWeekStart,
  getWeekDates,
  addDays,
  generateWeekSchedule,
  formatDateDisplay
} from './scheduler.js';

import {
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
} from './ui.js';

import {
  getDayStats,
  getWeekStats,
  getMonthStats,
  renderReportSummary,
  renderReportChart
} from './reports.js';

// State
let currentDate = new Date();
let currentWeekStart = getWeekStart(currentDate);
let currentViewMode = 'week'; // 'week' or 'day'
let currentReportPeriod = 'day';
let currentSchedule = {};

// DOM Elements
const scheduleGrid = document.getElementById('schedule-grid');
const subjectList = document.getElementById('subject-list');
const reportChart = document.getElementById('report-chart');
const currentWeekEl = document.getElementById('current-week');

// Initialize
document.addEventListener('DOMContentLoaded', init);

function init() {
  // Load sample data if empty
  if (getSubjects().length === 0) {
    loadSampleData();
  }

  // Render initial views
  refreshSchedule();
  refreshSubjects();
  refreshReports();

  // Setup event listeners
  setupNavigation();
  setupScheduleControls();
  setupSubjectForm();
  setupEventForm();
  setupSessionModal();
  setupModals();
}

function refreshSchedule() {
  currentSchedule = generateWeekSchedule(currentWeekStart);

  // Update week display
  const weekDates = getWeekDates(currentWeekStart);
  const startStr = formatDateDisplay(weekDates[0]);
  const endStr = formatDateDisplay(weekDates[6]);
  currentWeekEl.textContent = `${startStr} - ${endStr}`;

  if (currentViewMode === 'week') {
    renderScheduleWeek(currentSchedule, scheduleGrid);
  } else {
    const todayStr = formatDate(currentDate);
    if (currentSchedule[todayStr]) {
      renderScheduleDay(currentSchedule[todayStr], scheduleGrid);
    }
  }

  // Add click handlers for sessions
  scheduleGrid.querySelectorAll('.session-item').forEach(item => {
    item.addEventListener('click', () => openSessionModal(item.dataset.sessionId, item.dataset.date));
  });
}

function refreshSubjects(filter = 'all') {
  const subjects = getSubjects();
  renderSubjectList(subjects, subjectList, filter);

  // Add click handlers
  subjectList.querySelectorAll('.btn-edit-subject').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openSubjectModal(btn.dataset.id);
    });
  });

  subjectList.querySelectorAll('.btn-delete-subject').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm('Xóa môn học này?')) {
        deleteSubject(btn.dataset.id);
        refreshSubjects();
        refreshSchedule();
      }
    });
  });
}

function refreshReports() {
  let stats;

  switch (currentReportPeriod) {
    case 'day':
      stats = getDayStats(currentDate);
      break;
    case 'week':
      stats = getWeekStats(currentDate);
      break;
    case 'month':
      stats = getMonthStats(currentDate);
      break;
  }

  renderReportSummary(stats);
  renderReportChart(stats, reportChart);
}

// Navigation
function setupNavigation() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      switchView(btn.dataset.view);

      if (btn.dataset.view === 'reports') {
        refreshReports();
      }
    });
  });
}

// Schedule Controls
function setupScheduleControls() {
  // Week navigation
  document.getElementById('btn-prev-week').addEventListener('click', () => {
    currentWeekStart = addDays(currentWeekStart, -7);
    refreshSchedule();
  });

  document.getElementById('btn-next-week').addEventListener('click', () => {
    currentWeekStart = addDays(currentWeekStart, 7);
    refreshSchedule();
  });

  // View toggle (week/day)
  document.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('toggle-btn--active'));
      btn.classList.add('toggle-btn--active');
      currentViewMode = btn.dataset.mode;
      refreshSchedule();
    });
  });

  // Report tabs
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('tab-btn--active'));
      btn.classList.add('tab-btn--active');
      currentReportPeriod = btn.dataset.period;
      refreshReports();
    });
  });

  // Subject filters
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('filter-btn--active'));
      btn.classList.add('filter-btn--active');
      refreshSubjects(btn.dataset.filter);
    });
  });

  // FAB - Add event
  document.getElementById('btn-add-event').addEventListener('click', () => {
    document.getElementById('event-date').value = formatDate(currentDate);
    showModal('modal-event');
  });

  // Add subject button
  document.getElementById('btn-add-subject').addEventListener('click', () => {
    openSubjectModal();
  });
}

// Subject Form
function setupSubjectForm() {
  const form = document.getElementById('form-subject');
  const scheduleGroup = document.getElementById('schedule-group');
  const fixedSchedules = document.getElementById('fixed-schedules');

  // Toggle schedule inputs based on type
  form.querySelectorAll('input[name="subject-type"]').forEach(radio => {
    radio.addEventListener('change', () => {
      scheduleGroup.style.display = radio.value === 'fixed' ? 'block' : 'none';
    });
  });

  // Add schedule row
  document.getElementById('btn-add-schedule').addEventListener('click', () => {
    addScheduleRow(fixedSchedules);
  });

  // Remove schedule row (delegated)
  fixedSchedules.addEventListener('click', (e) => {
    if (e.target.closest('.btn-remove-schedule')) {
      const row = e.target.closest('.schedule-row');
      if (fixedSchedules.children.length > 1) {
        row.remove();
      }
    }
  });

  // Save subject
  document.getElementById('btn-save-subject').addEventListener('click', () => {
    const id = document.getElementById('subject-id').value;
    const name = document.getElementById('subject-name').value.trim();
    const type = form.querySelector('input[name="subject-type"]:checked').value;
    const hasTeacher = form.querySelector('input[name="has-teacher"]:checked').value === 'true';
    const color = document.getElementById('subject-color').value;

    if (!name) {
      alert('Vui lòng nhập tên môn học');
      return;
    }

    const subject = {
      id: id || undefined,
      name,
      type,
      slotDuration: hasTeacher ? 1.5 : 2,
      hasTeacher,
      color
    };

    if (type === 'fixed') {
      subject.schedule = getScheduleFromInputs(fixedSchedules);
    }

    saveSubject(subject);
    hideModal('modal-subject');
    refreshSubjects();
    refreshSchedule();
  });
}

function openSubjectModal(subjectId = null) {
  const form = document.getElementById('form-subject');
  const title = document.getElementById('modal-subject-title');
  const scheduleGroup = document.getElementById('schedule-group');
  const fixedSchedules = document.getElementById('fixed-schedules');

  form.reset();
  document.getElementById('subject-id').value = '';
  document.getElementById('subject-color').value = '#4f46e5';

  if (subjectId) {
    const subject = getSubject(subjectId);
    if (subject) {
      title.textContent = 'Sửa môn học';
      document.getElementById('subject-id').value = subject.id;
      document.getElementById('subject-name').value = subject.name;
      document.getElementById('subject-color').value = subject.color;

      form.querySelector(`input[name="subject-type"][value="${subject.type}"]`).checked = true;
      form.querySelector(`input[name="has-teacher"][value="${subject.hasTeacher}"]`).checked = true;

      scheduleGroup.style.display = subject.type === 'fixed' ? 'block' : 'none';

      if (subject.type === 'fixed' && subject.schedule) {
        renderScheduleInputs(fixedSchedules, subject.schedule);
      } else {
        renderScheduleInputs(fixedSchedules);
      }
    }
  } else {
    title.textContent = 'Thêm môn học';
    scheduleGroup.style.display = 'block';
    renderScheduleInputs(fixedSchedules);
  }

  showModal('modal-subject');
}

// Event Form
function setupEventForm() {
  document.getElementById('btn-save-event').addEventListener('click', () => {
    const date = document.getElementById('event-date').value;
    const type = document.getElementById('event-type').value;
    const description = document.getElementById('event-desc').value.trim();

    if (!date) {
      alert('Vui lòng chọn ngày');
      return;
    }

    saveEvent({
      date,
      type,
      description: description || type
    });

    hideModal('modal-event');
    refreshSchedule();
  });
}

// Session Modal
function setupSessionModal() {
  document.getElementById('btn-save-session').addEventListener('click', () => {
    const id = document.getElementById('session-id').value;
    const status = document.getElementById('session-status').value;
    const notes = document.getElementById('session-notes').value.trim();

    const session = getSession(id);
    if (session) {
      session.status = status;
      session.notes = notes;
      saveSession(session);
    }

    hideModal('modal-session');
    refreshSchedule();
    refreshReports();
  });
}

function openSessionModal(sessionId, date) {
  // Find session in current schedule
  const daySchedule = currentSchedule[date];
  if (!daySchedule) return;

  const session = daySchedule.sessions.find(s => s.id === sessionId);
  if (!session) return;

  document.getElementById('session-id').value = session.id;
  document.getElementById('session-title').textContent = session.subjectName;
  document.getElementById('session-info').textContent =
    `${formatDateDisplay(date)} • ${session.startTime} - ${session.endTime}`;
  document.getElementById('session-status').value = session.status || 'pending';
  document.getElementById('session-notes').value = session.notes || '';

  showModal('modal-session');
}

// Modal Controls
function setupModals() {
  // Close buttons
  document.querySelectorAll('.modal__close, .modal__cancel').forEach(btn => {
    btn.addEventListener('click', () => {
      hideAllModals();
    });
  });

  // Backdrop click
  document.querySelectorAll('.modal__backdrop').forEach(backdrop => {
    backdrop.addEventListener('click', () => {
      hideAllModals();
    });
  });

  // Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      hideAllModals();
    }
  });
}
