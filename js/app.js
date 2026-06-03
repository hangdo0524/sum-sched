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
  clearAllData,
  generateId
} from './data.js';

import {
  formatDate,
  getWeekStart,
  getWeekDates,
  addDays,
  generateWeekSchedule,
  generateSmartSuggestions,
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
let currentSuggestions = [];

// DOM Elements
const scheduleGrid = document.getElementById('schedule-grid');
const subjectList = document.getElementById('subject-list');
const reportChart = document.getElementById('report-chart');
const currentWeekEl = document.getElementById('current-week');

// Initialize
document.addEventListener('DOMContentLoaded', init);

// Expose reset function globally for debugging
window.resetApp = function() {
  if (confirm('Xóa toàn bộ dữ liệu và tải lại?')) {
    clearAllData();
    loadSampleData();
    location.reload();
  }
};

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

  // Suggest schedule button
  document.getElementById('btn-suggest-schedule').addEventListener('click', () => {
    showSuggestions();
  });

  // Confirm suggestions
  document.getElementById('btn-confirm-suggestions').addEventListener('click', () => {
    confirmSuggestions();
  });
}

function showSuggestions() {
  currentSuggestions = generateSmartSuggestions(currentWeekStart);
  const container = document.getElementById('suggest-list');

  if (currentSuggestions.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">✨</div>
        <div class="empty-state__text">Không có gợi ý nào.<br>Có thể tất cả môn linh hoạt đã được xếp lịch.</div>
      </div>
    `;
    showModal('modal-suggestions');
    return;
  }

  // Group by date
  const byDate = {};
  currentSuggestions.forEach(s => {
    if (!byDate[s.date]) byDate[s.date] = { dayName: s.dayName, items: [] };
    byDate[s.date].items.push(s);
  });

  container.innerHTML = Object.entries(byDate).map(([date, data]) => `
    <div class="suggest-day">${data.dayName}</div>
    ${data.items.map((s, idx) => `
      <div class="suggest-item ${s.selected ? 'suggest-item--selected' : ''}" data-id="${s.id}">
        <div class="suggest-item__check">
          <input type="checkbox" ${s.selected ? 'checked' : ''} data-suggestion-id="${s.id}">
        </div>
        <div class="suggest-item__content">
          <div class="suggest-item__header">
            <span class="suggest-item__color" style="background-color: ${s.color}"></span>
            <span class="suggest-item__name">${s.subjectName}</span>
            <span class="suggest-item__time">${s.startTime} - ${s.endTime}</span>
          </div>
          <div class="suggest-item__reason">${s.reason}</div>
        </div>
      </div>
    `).join('')}
  `).join('');

  // Add checkbox listeners
  container.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const id = e.target.dataset.suggestionId;
      const suggestion = currentSuggestions.find(s => s.id === id);
      if (suggestion) {
        suggestion.selected = e.target.checked;
        e.target.closest('.suggest-item').classList.toggle('suggest-item--selected', e.target.checked);
      }
    });
  });

  showModal('modal-suggestions');
}

function confirmSuggestions() {
  const selected = currentSuggestions.filter(s => s.selected);

  selected.forEach(suggestion => {
    saveSession({
      id: suggestion.id,
      subjectId: suggestion.subjectId,
      date: suggestion.date,
      startTime: suggestion.startTime,
      endTime: suggestion.endTime,
      status: 'pending',
      notes: ''
    });
  });

  hideModal('modal-suggestions');
  refreshSchedule();
  refreshReports();

  if (selected.length > 0) {
    alert(`Đã tạo ${selected.length} buổi học linh hoạt!`);
  }
}

// Subject Form
function setupSubjectForm() {
  const form = document.getElementById('form-subject');
  const scheduleGroup = document.getElementById('schedule-group');
  const fixedSchedules = document.getElementById('fixed-schedules');

  // Toggle form sections based on type
  form.querySelectorAll('input[name="subject-type"]').forEach(radio => {
    radio.addEventListener('change', () => {
      const type = radio.value;
      // Hide all optional groups first
      scheduleGroup.style.display = 'none';
      document.getElementById('semi-flexible-group').style.display = 'none';
      document.getElementById('flexible-group').style.display = 'none';
      document.getElementById('hybrid-flexible-group').style.display = 'none';

      // Show relevant groups
      if (type === 'fixed') {
        scheduleGroup.style.display = 'block';
      } else if (type === 'semi-flexible') {
        document.getElementById('semi-flexible-group').style.display = 'block';
      } else if (type === 'flexible') {
        document.getElementById('flexible-group').style.display = 'block';
      } else if (type === 'hybrid') {
        scheduleGroup.style.display = 'block';
        document.getElementById('hybrid-flexible-group').style.display = 'block';
      }
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
    const color = document.getElementById('subject-color').value;

    if (!name) {
      alert('Vui lòng nhập tên môn học');
      return;
    }

    const subject = {
      id: id || undefined,
      name,
      type,
      color
    };

    // Handle different schedule types
    if (type === 'fixed' || type === 'hybrid') {
      subject.schedule = getScheduleFromInputs(fixedSchedules);
      if (subject.schedule.length > 0) {
        const totalDuration = subject.schedule.reduce((sum, slot) => {
          const [sh, sm] = slot.startTime.split(':').map(Number);
          const [eh, em] = slot.endTime.split(':').map(Number);
          return sum + (eh * 60 + em - sh * 60 - sm) / 60;
        }, 0);
        subject.slotDuration = totalDuration / subject.schedule.length;
      }
    }

    if (type === 'hybrid') {
      subject.flexibleConfig = {
        duration: parseFloat(document.getElementById('hybrid-duration').value) || 2,
        sessionsPerWeek: parseInt(document.getElementById('hybrid-sessions-per-week').value) || 2
      };
    } else if (type === 'semi-flexible') {
      const checkedSlots = Array.from(form.querySelectorAll('input[name="time-slots"]:checked'))
        .map(cb => cb.value);
      subject.flexibleConfig = {
        timeSlots: checkedSlots.length ? checkedSlots : ['morning'],
        duration: parseFloat(document.getElementById('semi-duration').value) || 1.5,
        sessionsPerWeek: parseInt(document.getElementById('semi-sessions-per-week').value) || 3
      };
      subject.slotDuration = subject.flexibleConfig.duration;
    } else if (type === 'flexible') {
      subject.flexibleConfig = {
        duration: parseFloat(document.getElementById('flexible-duration').value) || 2,
        sessionsPerWeek: parseInt(document.getElementById('flexible-sessions-per-week').value) || 5
      };
      subject.slotDuration = subject.flexibleConfig.duration;
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

  // Reset all form sections
  const semiFlexGroup = document.getElementById('semi-flexible-group');
  const flexGroup = document.getElementById('flexible-group');
  const hybridFlexGroup = document.getElementById('hybrid-flexible-group');

  scheduleGroup.style.display = 'none';
  semiFlexGroup.style.display = 'none';
  flexGroup.style.display = 'none';
  hybridFlexGroup.style.display = 'none';

  if (subjectId) {
    const subject = getSubject(subjectId);
    if (subject) {
      title.textContent = 'Sửa môn học';
      document.getElementById('subject-id').value = subject.id;
      document.getElementById('subject-name').value = subject.name;
      document.getElementById('subject-color').value = subject.color;

      // Set type radio
      const typeRadio = form.querySelector(`input[name="subject-type"][value="${subject.type}"]`);
      if (typeRadio) typeRadio.checked = true;

      // Show/populate relevant sections based on type
      if (subject.type === 'fixed' || subject.type === 'hybrid') {
        scheduleGroup.style.display = 'block';
        renderScheduleInputs(fixedSchedules, subject.schedule);
      }

      if (subject.type === 'hybrid' && subject.flexibleConfig) {
        hybridFlexGroup.style.display = 'block';
        document.getElementById('hybrid-duration').value = subject.flexibleConfig.duration || 2;
        document.getElementById('hybrid-sessions-per-week').value = subject.flexibleConfig.sessionsPerWeek || 2;
      } else if (subject.type === 'semi-flexible' && subject.flexibleConfig) {
        semiFlexGroup.style.display = 'block';
        // Set time slots checkboxes
        form.querySelectorAll('input[name="time-slots"]').forEach(cb => {
          cb.checked = subject.flexibleConfig.timeSlots?.includes(cb.value);
        });
        document.getElementById('semi-duration').value = subject.flexibleConfig.duration || 1.5;
        document.getElementById('semi-sessions-per-week').value = subject.flexibleConfig.sessionsPerWeek || 3;
      } else if (subject.type === 'flexible' && subject.flexibleConfig) {
        flexGroup.style.display = 'block';
        document.getElementById('flexible-duration').value = subject.flexibleConfig.duration || 2;
        document.getElementById('flexible-sessions-per-week').value = subject.flexibleConfig.sessionsPerWeek || 5;
      }
    }
  } else {
    title.textContent = 'Thêm môn học';
    form.querySelector('input[name="subject-type"][value="fixed"]').checked = true;
    scheduleGroup.style.display = 'block';
    renderScheduleInputs(fixedSchedules);
    // Reset checkboxes
    form.querySelectorAll('input[name="time-slots"]').forEach(cb => {
      cb.checked = cb.value === 'morning';
    });
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
