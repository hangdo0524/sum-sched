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
  generateId,
  exportData,
  importData,
  downloadDataAsFile,
  getUsers,
  addUser,
  getCurrentUser,
  setCurrentUser,
  autoLoadUserData,
  userHasData,
  saveToGitHub
} from './data.js';

import {
  formatDate,
  getWeekStart,
  getWeekDates,
  addDays,
  generateWeekSchedule,
  generateSmartSuggestions,
  formatDateDisplay,
  checkSessionConflict
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

async function init() {
  // Always start with current week
  currentDate = new Date();
  currentWeekStart = getWeekStart(currentDate);

  // Initialize user (creates default users if needed)
  const user = getCurrentUser();
  refreshUserSelector();

  // Auto-load from file if localStorage is empty for this user
  if (!userHasData(user.id)) {
    console.log(`No local data for ${user.name}, trying to load from file...`);
    const result = await autoLoadUserData(user.id);
    if (result.loaded) {
      console.log('Auto-loaded:', result.message);
    } else if (getSubjects().length === 0) {
      // Fallback to sample data only if no file and no data
      console.log('No file found, loading sample data');
      loadSampleData();
    }
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
  setupUserSelector();
}

function refreshSchedule() {
  // Debug: log the week being displayed
  const weekDates = getWeekDates(currentWeekStart);
  console.log('Displaying week:', weekDates[0], '-', weekDates[6]);

  currentSchedule = generateWeekSchedule(currentWeekStart);
  const startDate = new Date(weekDates[0] + 'T00:00:00');
  const endDate = new Date(weekDates[6] + 'T00:00:00');
  currentWeekEl.textContent = `${startDate.getDate()}/${startDate.getMonth() + 1} - ${endDate.getDate()}/${endDate.getMonth() + 1}`;

  if (currentViewMode === 'week') {
    renderScheduleWeek(currentSchedule, scheduleGrid);
  } else {
    const todayStr = formatDate(currentDate);
    if (currentSchedule[todayStr]) {
      renderScheduleDay(currentSchedule[todayStr], scheduleGrid);
    }
  }

  // Add click handlers for sessions (both list and calendar view)
  scheduleGrid.querySelectorAll('.session-item, .cal-item').forEach(item => {
    item.addEventListener('click', () => openSessionModal(item.dataset.sessionId, item.dataset.date));
  });
}

function refreshSubjects(filter = 'all') {
  const subjects = getSubjects();
  renderSubjectList(subjects, subjectList, filter);

  // Click anywhere on subject card to edit
  subjectList.querySelectorAll('.subject-card').forEach(item => {
    item.addEventListener('click', () => {
      openSubjectModal(item.dataset.subjectId);
    });
  });

  // Delete button
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
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() - 7);
    currentWeekStart = newDate;
    console.log('Prev week:', formatDate(currentWeekStart));
    refreshSchedule();
  });

  document.getElementById('btn-next-week').addEventListener('click', () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + 7);
    currentWeekStart = newDate;
    console.log('Next week:', formatDate(currentWeekStart));
    refreshSchedule();
  });

  // Go to today/current week
  document.getElementById('btn-today').addEventListener('click', () => {
    currentDate = new Date();
    currentWeekStart = getWeekStart(currentDate);
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

  // Clear week schedule button
  document.getElementById('btn-clear-week-schedule').addEventListener('click', () => {
    clearWeekFlexibleSessions();
  });

  // Confirm suggestions
  document.getElementById('btn-confirm-suggestions').addEventListener('click', () => {
    confirmSuggestions();
  });

  // Sync from server (force reload from file)
  document.getElementById('btn-sync-data').addEventListener('click', async () => {
    const user = getCurrentUser();
    if (confirm(`Tải lại data của ${user.name} từ server?\n(Dữ liệu local sẽ bị ghi đè)`)) {
      const result = await autoLoadUserData(user.id);
      if (result.loaded) {
        alert('Đồng bộ thành công!\n' + result.message);
        refreshSchedule();
        refreshSubjects();
        refreshReports();
      } else {
        alert('Không tìm thấy file trên server.\nĐường dẫn: data/users/' + user.id + '.json');
      }
    }
  });

  // Save to GitHub
  document.getElementById('btn-save-to-github').addEventListener('click', async () => {
    const user = getCurrentUser();
    const btn = document.getElementById('btn-save-to-github');
    const originalText = btn.innerHTML;

    btn.innerHTML = '⏳ Đang lưu...';
    btn.disabled = true;

    const result = await saveToGitHub(user.id);

    btn.innerHTML = originalText;
    btn.disabled = false;

    if (result.success) {
      alert('✅ ' + result.message);
    } else {
      alert('❌ Lỗi: ' + result.message);
    }
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

  // Sort: teacher slots first, then by time
  Object.values(byDate).forEach(data => {
    data.items.sort((a, b) => {
      if (a.isTeacherSlot !== b.isTeacherSlot) return a.isTeacherSlot ? -1 : 1;
      return a.startTime.localeCompare(b.startTime);
    });
  });

  container.innerHTML = Object.entries(byDate).map(([date, data]) => `
    <div class="suggest-day">${data.dayName}</div>
    ${data.items.map((s) => `
      <div class="suggest-item ${s.selected ? 'suggest-item--selected' : ''} ${s.isTeacherSlot ? 'suggest-item--teacher' : 'suggest-item--ai'}" data-id="${s.id}">
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

  // Check for conflicts among selected suggestions
  const conflicts = [];
  const savedIds = new Set();

  // Sort by date and time to process in order
  selected.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.startTime.localeCompare(b.startTime);
  });

  selected.forEach(suggestion => {
    const conflict = checkSessionConflict(suggestion.date, suggestion.startTime, suggestion.endTime);

    if (conflict.conflict) {
      conflicts.push({
        suggestion,
        conflictWith: conflict.session,
        type: conflict.type
      });
    } else {
      saveSession({
        id: suggestion.id,
        subjectId: suggestion.subjectId,
        date: suggestion.date,
        startTime: suggestion.startTime,
        endTime: suggestion.endTime,
        status: 'pending',
        notes: ''
      });
      savedIds.add(suggestion.id);
    }
  });

  hideModal('modal-suggestions');
  refreshSchedule();
  refreshReports();

  if (conflicts.length > 0) {
    const conflictMsg = conflicts.map(c => {
      const typeMsg = c.type === 'overlap' ? 'trùng giờ' : 'cách < 30 phút';
      return `• ${c.suggestion.subjectName} (${c.suggestion.startTime}) - ${typeMsg} với ${c.conflictWith.subjectName || 'ca khác'}`;
    }).join('\n');

    alert(`Đã tạo ${savedIds.size} buổi học.\n\n⚠️ ${conflicts.length} buổi bị xung đột không thể tạo:\n${conflictMsg}`);
  } else if (savedIds.size > 0) {
    alert(`Đã tạo ${savedIds.size} buổi học linh hoạt!`);
  }
}

function clearWeekFlexibleSessions() {
  const weekDates = getWeekDates(currentWeekStart);
  const subjects = getSubjects();

  // Get IDs of flexible-type subjects
  const flexibleTypes = ['flexible', 'semi-flexible', 'hybrid', 'weekly-pick', 'fixed-plus', 'self-study'];
  const flexibleSubjectIds = subjects
    .filter(s => flexibleTypes.includes(s.type))
    .map(s => s.id);

  // Get all sessions
  const allSessions = getSessions();

  // Filter out flexible sessions for this week
  // For fixed-plus: only remove sessions that are NOT in the fixed slots
  const sessionsToKeep = allSessions.filter(session => {
    // Keep if not in this week
    if (!weekDates.includes(session.date)) return true;

    // Keep if not a flexible subject
    if (!flexibleSubjectIds.includes(session.subjectId)) return true;

    // For fixed-plus: keep if it's a fixed slot
    const subject = subjects.find(s => s.id === session.subjectId);
    if (subject && subject.type === 'fixed-plus') {
      const isFixedSlot = (subject.schedule || []).some(slot =>
        slot.selected === true &&
        slot.day === new Date(session.date).getDay() &&
        slot.startTime === session.startTime
      );
      if (isFixedSlot) return true;
    }

    // Remove this session (it's a flexible/optional session in this week)
    return false;
  });

  // Count removed
  const removedCount = allSessions.length - sessionsToKeep.length;

  if (removedCount === 0) {
    alert('Không có lịch linh hoạt nào để xóa trong tuần này.');
    return;
  }

  if (confirm(`Xóa ${removedCount} buổi học linh hoạt tuần này?\n(Lịch cố định sẽ được giữ lại)`)) {
    // Save filtered sessions back
    localStorage.setItem('sumSched_sessions', JSON.stringify(sessionsToKeep));
    refreshSchedule();
    refreshReports();
    alert(`Đã xóa ${removedCount} buổi. Bạn có thể chọn lại lịch linh hoạt.`);
  }
}

// Subject Form
function setupSubjectForm() {
  const form = document.getElementById('form-subject');
  const scheduleGroup = document.getElementById('schedule-group');
  const fixedSchedules = document.getElementById('fixed-schedules');
  const sessionsConfigGroup = document.getElementById('sessions-config-group');
  const selfStudyGroup = document.getElementById('self-study-group');
  const extraSelfStudyGroup = document.getElementById('extra-self-study-group');
  const extraSelfStudyEnabled = document.getElementById('extra-self-study-enabled');
  const extraSelfStudyConfig = document.getElementById('extra-self-study-config');
  const scheduleHint = document.getElementById('schedule-hint');

  // Toggle extra self-study config
  extraSelfStudyEnabled.addEventListener('change', () => {
    extraSelfStudyConfig.style.display = extraSelfStudyEnabled.checked ? 'block' : 'none';
    if (extraSelfStudyEnabled.checked && document.getElementById('extra-study-slots').children.length === 0) {
      renderTimeSlots(['morning', 'afternoon'], 'extra-study-slots');
    }
  });

  // Toggle form sections based on type
  form.querySelectorAll('input[name="subject-type"]').forEach(radio => {
    radio.addEventListener('change', () => {
      const type = radio.value;

      // Hide all optional groups first
      scheduleGroup.style.display = 'none';
      sessionsConfigGroup.style.display = 'none';
      selfStudyGroup.style.display = 'none';
      extraSelfStudyGroup.style.display = 'none';

      // Show relevant groups based on type
      if (type === 'fixed') {
        scheduleGroup.style.display = 'block';
        extraSelfStudyGroup.style.display = 'block';
        scheduleHint.textContent = '✓ Tick = học cố định cả hè';
      } else if (type === 'weekly-pick') {
        scheduleGroup.style.display = 'block';
        sessionsConfigGroup.style.display = 'block';
        extraSelfStudyGroup.style.display = 'block';
        scheduleHint.textContent = 'Nhập lịch thầy/cô → mỗi tuần chọn buổi từ đây';
        document.getElementById('required-sessions').value = 0;
        document.getElementById('target-sessions').value = 1;
      } else if (type === 'fixed-plus') {
        scheduleGroup.style.display = 'block';
        sessionsConfigGroup.style.display = 'block';
        extraSelfStudyGroup.style.display = 'block';
        scheduleHint.textContent = '✓ Tick = cố định cả hè, không tick = tùy chọn theo tuần';
        document.getElementById('required-sessions').value = 2;
        document.getElementById('target-sessions').value = 3;
      } else if (type === 'self-study') {
        selfStudyGroup.style.display = 'block';
        // Only render if not already rendered (avoid resetting selections)
        if (document.getElementById('self-study-slots').children.length === 0) {
          renderTimeSlots(['morning', 'afternoon'], 'self-study-slots');
        }
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
    const category = document.getElementById('subject-category').value;
    const type = form.querySelector('input[name="subject-type"]:checked').value;
    const color = document.getElementById('subject-color').value;

    if (!name) {
      alert('Vui lòng nhập tên môn học');
      return;
    }

    const subject = {
      id: id || undefined,
      name,
      category,
      type,
      color
    };

    // Handle different schedule types
    if (type === 'fixed' || type === 'weekly-pick' || type === 'fixed-plus') {
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

    if (type === 'weekly-pick' || type === 'fixed-plus') {
      subject.config = {
        requiredSessions: parseInt(document.getElementById('required-sessions').value) || 0,
        targetSessions: parseInt(document.getElementById('target-sessions').value) || 1
      };
    }

    // Extra self-study for subjects with teacher schedule
    if (type === 'fixed' || type === 'weekly-pick' || type === 'fixed-plus') {
      const extraEnabled = document.getElementById('extra-self-study-enabled').checked;
      if (extraEnabled) {
        const extraSlots = [];
        document.querySelectorAll('#extra-study-slots .time-slot--selected').forEach(el => {
          extraSlots.push(el.dataset.slot);
        });

        subject.extraSelfStudy = {
          enabled: true,
          duration: parseFloat(document.getElementById('extra-study-duration').value) || 1.5,
          sessionsPerWeek: parseInt(document.getElementById('extra-study-sessions').value) || 3,
          preferredSlots: extraSlots.length > 0 ? extraSlots : ['morning', 'afternoon']
        };
      } else {
        subject.extraSelfStudy = { enabled: false };
      }
    }

    if (type === 'self-study') {
      const selectedSlots = [];
      document.querySelectorAll('#self-study-slots .time-slot--selected').forEach(el => {
        selectedSlots.push(el.dataset.slot);
      });

      subject.config = {
        duration: parseFloat(document.getElementById('self-study-duration').value) || 2,
        sessionsPerWeek: parseInt(document.getElementById('self-study-sessions').value) || 5,
        preferredSlots: selectedSlots.length > 0 ? selectedSlots : ['morning', 'afternoon']
      };
      subject.slotDuration = subject.config.duration;
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
  document.getElementById('subject-category').value = 'academic';
  document.getElementById('subject-color').value = '#4f46e5';

  // Reset all form sections
  const sessionsConfigGroup = document.getElementById('sessions-config-group');
  const selfStudyGroup = document.getElementById('self-study-group');
  const extraSelfStudyGroup = document.getElementById('extra-self-study-group');
  const extraSelfStudyEnabled = document.getElementById('extra-self-study-enabled');
  const extraSelfStudyConfig = document.getElementById('extra-self-study-config');
  const scheduleHint = document.getElementById('schedule-hint');

  scheduleGroup.style.display = 'none';
  sessionsConfigGroup.style.display = 'none';
  selfStudyGroup.style.display = 'none';
  extraSelfStudyGroup.style.display = 'none';
  extraSelfStudyEnabled.checked = false;
  extraSelfStudyConfig.style.display = 'none';

  if (subjectId) {
    const subject = getSubject(subjectId);
    if (subject) {
      title.textContent = 'Sửa môn học';
      document.getElementById('subject-id').value = subject.id;
      document.getElementById('subject-name').value = subject.name;
      document.getElementById('subject-category').value = subject.category || 'academic';
      document.getElementById('subject-color').value = subject.color;

      // Set type radio (handle old types for backwards compatibility)
      let typeValue = subject.type;
      if (typeValue === 'flexible' || typeValue === 'semi-flexible') typeValue = 'self-study';
      if (typeValue === 'hybrid') typeValue = 'fixed-plus';

      const typeRadio = form.querySelector(`input[name="subject-type"][value="${typeValue}"]`);
      if (typeRadio) typeRadio.checked = true;

      // Show/populate relevant sections based on type
      if (typeValue === 'fixed' || typeValue === 'weekly-pick' || typeValue === 'fixed-plus') {
        scheduleGroup.style.display = 'block';
        extraSelfStudyGroup.style.display = 'block';
        renderScheduleInputs(fixedSchedules, subject.schedule);

        if (typeValue === 'fixed') {
          scheduleHint.textContent = '✓ Tick = học cố định cả hè';
        } else if (typeValue === 'weekly-pick') {
          scheduleHint.textContent = 'Nhập lịch thầy/cô → mỗi tuần chọn buổi từ đây';
        } else {
          scheduleHint.textContent = '✓ Tick = cố định cả hè, không tick = tùy chọn theo tuần';
        }

        // Load extra self-study config
        if (subject.extraSelfStudy?.enabled) {
          extraSelfStudyEnabled.checked = true;
          extraSelfStudyConfig.style.display = 'block';
          document.getElementById('extra-study-duration').value = subject.extraSelfStudy.duration || 1.5;
          document.getElementById('extra-study-sessions').value = subject.extraSelfStudy.sessionsPerWeek || 3;
          renderTimeSlots(subject.extraSelfStudy.preferredSlots || ['morning', 'afternoon'], 'extra-study-slots');
        }
      }

      if ((typeValue === 'weekly-pick' || typeValue === 'fixed-plus') && subject.config) {
        sessionsConfigGroup.style.display = 'block';
        document.getElementById('required-sessions').value = subject.config.requiredSessions || 0;
        document.getElementById('target-sessions').value = subject.config.targetSessions || 1;
      } else if (typeValue === 'self-study') {
        selfStudyGroup.style.display = 'block';
        const config = subject.config || subject.flexibleConfig || {};
        document.getElementById('self-study-duration').value = config.duration || subject.slotDuration || 2;
        document.getElementById('self-study-sessions').value = config.sessionsPerWeek || 5;
        renderTimeSlots(config.preferredSlots || ['morning', 'afternoon'], 'self-study-slots');
      }
    }
  } else {
    title.textContent = 'Thêm môn học';
    form.querySelector('input[name="subject-type"][value="fixed"]').checked = true;
    scheduleGroup.style.display = 'block';
    scheduleHint.textContent = '✓ Tick = học cố định cả hè';
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
    const statusRadio = document.querySelector('input[name="session-status"]:checked');
    const status = statusRadio ? statusRadio.value : 'pending';
    const notes = document.getElementById('session-notes').value.trim();

    // Get session from storage or create new one from schedule data
    let session = getSession(id);

    if (!session) {
      // Session doesn't exist in storage yet (generated from fixed schedule)
      // Find it in current schedule and save it
      for (const daySchedule of Object.values(currentSchedule)) {
        const found = daySchedule.sessions.find(s => s.id === id);
        if (found) {
          session = {
            id: found.id,
            subjectId: found.subjectId,
            date: found.date,
            startTime: found.startTime,
            endTime: found.endTime,
            status: status,
            notes: notes
          };
          break;
        }
      }
    } else {
      session.status = status;
      session.notes = notes;
    }

    if (session) {
      saveSession(session);
    }

    hideModal('modal-session');
    refreshSchedule();
    refreshReports();
  });

  // Delete single session
  document.getElementById('btn-delete-session').addEventListener('click', () => {
    const id = document.getElementById('session-id').value;
    const isFixed = document.getElementById('session-is-fixed').value === 'true';

    if (isFixed) {
      alert('Không thể xóa buổi cố định. Vào Môn học để sửa lịch cố định.');
      return;
    }

    if (confirm('Xóa buổi học này?')) {
      deleteSessionById(id);
      hideModal('modal-session');
      refreshSchedule();
      refreshReports();
    }
  });

  // Delete all flexible sessions for the day
  document.getElementById('btn-delete-day').addEventListener('click', () => {
    const date = document.getElementById('session-date').value;

    if (confirm(`Xóa tất cả buổi học linh hoạt ngày ${formatDateDisplay(date)}?`)) {
      deleteFlexibleSessionsByDate(date);
      hideModal('modal-session');
      refreshSchedule();
      refreshReports();
    }
  });

  // Open subject settings from session modal
  document.getElementById('btn-open-subject').addEventListener('click', () => {
    const subjectId = document.getElementById('session-subject-id').value;
    console.log('Opening subject settings for:', subjectId);
    if (subjectId) {
      hideModal('modal-session');
      // Small delay to ensure modal is hidden before opening new one
      setTimeout(() => openSubjectModal(subjectId), 100);
    }
  });

  // Skip fixed session for this specific day
  document.getElementById('btn-skip-fixed').addEventListener('click', () => {
    const sessionId = document.getElementById('session-id').value;
    const date = document.getElementById('session-date').value;
    const subjectId = document.getElementById('session-subject-id').value;

    if (confirm('Bỏ qua buổi cố định này? (Chỉ ngày này, không ảnh hưởng lịch tuần sau)')) {
      // Find the session in current schedule to get startTime
      const daySchedule = currentSchedule[date];
      const session = daySchedule?.sessions.find(s => s.id === sessionId);

      if (session) {
        // Save as a skipped session
        saveSession({
          id: sessionId,
          subjectId: subjectId,
          date: date,
          startTime: session.startTime,
          endTime: session.endTime,
          status: 'skipped',
          notes: 'Bỏ qua buổi này',
          isSkippedFixed: true
        });
      }

      hideModal('modal-session');
      refreshSchedule();
      refreshReports();
    }
  });
}

function deleteSessionById(id) {
  let sessions = getSessions();
  const before = sessions.length;
  sessions = sessions.filter(s => s.id !== id);

  if (sessions.length === before) {
    // Session not in storage - might be a generated fixed session ID
    // Try to find and remove by matching the current schedule
    for (const daySchedule of Object.values(currentSchedule)) {
      const found = daySchedule.sessions.find(s => s.id === id);
      if (found) {
        sessions = sessions.filter(s =>
          !(s.subjectId === found.subjectId && s.date === found.date && s.startTime === found.startTime)
        );
        break;
      }
    }
  }

  localStorage.setItem('sumSched_sessions', JSON.stringify(sessions));
}

const TIME_SLOT_OPTIONS = [
  { id: 'early', label: 'Sáng sớm', time: '8:30-10:00' },
  { id: 'morning', label: 'Sáng', time: '10:00-11:30' },
  { id: 'noon', label: 'Trưa', time: '11:30-13:00' },
  { id: 'early-afternoon', label: 'Đầu chiều', time: '14:00-15:30' },
  { id: 'afternoon', label: 'Chiều', time: '15:30-17:00' },
  { id: 'evening', label: 'Tối', time: '19:00-21:00' }
];

function renderTimeSlots(selectedSlots = ['morning', 'afternoon'], containerId = 'self-study-slots') {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = TIME_SLOT_OPTIONS.map(slot => {
    const isSelected = selectedSlots.includes(slot.id);
    return `
      <div class="time-slot ${isSelected ? 'time-slot--selected' : ''}" data-slot="${slot.id}">
        <span class="time-slot__label">${slot.label}</span>
        <span class="time-slot__time">${slot.time}</span>
      </div>
    `;
  }).join('');

  // Add click handlers
  container.querySelectorAll('.time-slot').forEach(el => {
    el.addEventListener('click', () => {
      el.classList.toggle('time-slot--selected');
    });
  });
}

function deleteFlexibleSessionsByDate(date) {
  const subjects = getSubjects();
  const flexibleTypes = ['flexible', 'semi-flexible', 'hybrid', 'weekly-pick', 'fixed-plus', 'self-study'];

  const sessions = getSessions().filter(session => {
    if (session.date !== date) return true;

    const subject = subjects.find(s => s.id === session.subjectId);
    if (!subject || !flexibleTypes.includes(subject.type)) return true;

    // For fixed-plus: keep fixed slots
    if (subject.type === 'fixed-plus') {
      const dayOfWeek = new Date(date + 'T00:00:00').getDay();
      const isFixedSlot = (subject.schedule || []).some(slot =>
        slot.selected === true &&
        slot.day === dayOfWeek &&
        slot.startTime === session.startTime
      );
      if (isFixedSlot) return true;
    }

    return false;
  });

  localStorage.setItem('sumSched_sessions', JSON.stringify(sessions));
}

function openSessionModal(sessionId, date) {
  // Find session in current schedule
  const daySchedule = currentSchedule[date];
  if (!daySchedule) return;

  const session = daySchedule.sessions.find(s => s.id === sessionId);
  if (!session) return;

  document.getElementById('session-id').value = session.id;
  document.getElementById('session-date').value = date;
  document.getElementById('session-subject-id').value = session.subjectId;
  document.getElementById('session-title').textContent = session.subjectName;
  const statusValue = session.status || 'pending';
  const statusRadio = document.querySelector(`input[name="session-status"][value="${statusValue}"]`);
  if (statusRadio) statusRadio.checked = true;
  document.getElementById('session-notes').value = session.notes || '';

  // Check if this is a truly fixed session (from subject config, not optional)
  const subject = getSubject(session.subjectId);
  let isFixed = false;
  let sessionTypeLabel = '';

  if (subject) {
    if (subject.type === 'fixed') {
      // All selected slots in 'fixed' type are fixed
      const dayOfWeek = new Date(date + 'T00:00:00').getDay();
      isFixed = (subject.schedule || []).some(slot =>
        slot.selected !== false &&
        slot.day === dayOfWeek &&
        slot.startTime === session.startTime
      );
      sessionTypeLabel = isFixed ? '📅 Cố định' : '';
    } else if (subject.type === 'fixed-plus') {
      // Only selected=true slots are fixed
      const dayOfWeek = new Date(date + 'T00:00:00').getDay();
      isFixed = (subject.schedule || []).some(slot =>
        slot.selected === true &&
        slot.day === dayOfWeek &&
        slot.startTime === session.startTime
      );
      sessionTypeLabel = isFixed ? '📅 Cố định' : '📅+ Đi thêm (xóa được)';
    } else if (subject.type === 'weekly-pick') {
      sessionTypeLabel = '📆 Chọn tuần này (xóa được)';
    } else if (subject.type === 'self-study') {
      sessionTypeLabel = '📖 Tự học (xóa được)';
    }
  }

  document.getElementById('session-info').textContent =
    `${formatDateDisplay(date)} • ${session.startTime} - ${session.endTime}` +
    (sessionTypeLabel ? ` • ${sessionTypeLabel}` : '');

  document.getElementById('session-is-fixed').value = isFixed ? 'true' : 'false';

  // Show/hide options based on whether it's fixed
  const deleteOptions = document.getElementById('delete-options');
  const skipFixedOptions = document.getElementById('skip-fixed-options');

  if (isFixed) {
    deleteOptions.style.display = 'none';
    skipFixedOptions.style.display = 'block';
  } else {
    skipFixedOptions.style.display = 'none';
    deleteOptions.style.display = 'block';
  }

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
      document.getElementById('user-dropdown').classList.remove('user-dropdown--open');
    }
  });
}

// User Selector
function refreshUserSelector() {
  const user = getCurrentUser();
  const users = getUsers();

  // Update header display
  document.getElementById('user-name').textContent = user.name;
  document.getElementById('user-avatar').textContent = user.name.charAt(0).toUpperCase();
  document.getElementById('user-avatar').style.backgroundColor = user.color;

  // Update dropdown list
  const listEl = document.getElementById('user-list');
  listEl.innerHTML = users.map(u => `
    <div class="user-dropdown__item ${u.id === user.id ? 'user-dropdown__item--active' : ''}" data-user-id="${u.id}">
      <span class="user-dropdown__item-avatar" style="background-color: ${u.color}">${u.name.charAt(0).toUpperCase()}</span>
      <span class="user-dropdown__item-name">${u.name}</span>
    </div>
  `).join('');

  // Add click handlers for user items
  listEl.querySelectorAll('.user-dropdown__item').forEach(item => {
    item.addEventListener('click', async () => {
      const userId = item.dataset.userId;
      if (setCurrentUser(userId)) {
        document.getElementById('user-dropdown').classList.remove('user-dropdown--open');

        // Auto-load from file if no local data for this user
        if (!userHasData(userId)) {
          console.log(`Switching to ${userId}, trying to load from file...`);
          await autoLoadUserData(userId);
        }

        refreshUserSelector();
        refreshSchedule();
        refreshSubjects();
        refreshReports();
      }
    });
  });
}

function setupUserSelector() {
  const btn = document.getElementById('btn-user-selector');
  const dropdown = document.getElementById('user-dropdown');

  // Toggle dropdown
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('user-dropdown--open');
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', () => {
    dropdown.classList.remove('user-dropdown--open');
  });

  // Add user button
  document.getElementById('btn-add-user').addEventListener('click', () => {
    const name = prompt('Tên bé:');
    if (name && name.trim()) {
      const colors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4'];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      const user = addUser(name.trim(), randomColor);

      if (user) {
        setCurrentUser(user.id);
        dropdown.classList.remove('user-dropdown--open');
        refreshUserSelector();
        refreshSchedule();
        refreshSubjects();
        refreshReports();
      } else {
        alert('Tên này đã tồn tại!');
      }
    }
  });
}
