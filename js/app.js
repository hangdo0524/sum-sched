/**
 * Schedule App - Main Entry Point
 * With Authentication and Multi-Calendar Support
 */

import {
  initAuth,
  getCurrentUser as getAuthUser,
  getUserProfile,
  isAdmin,
  logOut
} from './auth.js';

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
  deleteSession,
  loadSampleData,
  clearAllData,
  generateId,
  exportData,
  importData,
  downloadDataAsFile,
  getCurrentUser,
  setCurrentUser,
  userHasData,
  onFirebaseDataUpdate,
  setParentUserId
} from './data.js';

import {
  initFamily,
  getFamily,
  getChildren,
  addChild,
  removeChild,
  saveParentProfile,
  CHILD_AVATARS
} from './family.js';

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
  renderReportChart,
  getDetailedWeekStats,
  renderDetailedTable
} from './reports.js';

import { initDashboard, updateDashboard } from './dashboard.js';
import { setApiKey, hasApiKey } from './ai-service.js';
import { setupFamilyData, verifySetup } from './setup-family-data.js';

import {
  getCalendars,
  createCalendar,
  updateCalendar,
  getCurrentCalendarId,
  setCurrentCalendar,
  getActiveCalendar,
  renderCalendarList,
  CALENDAR_TYPES
} from './calendar.js';

import {
  initAcademicCalendar,
  getAcademicYears,
  getCurrentWeek
} from './academic-calendar.js';

import {
  showAcademicCalendarWizard,
  renderCalendarOverview,
  renderTermDetail
} from './academic-calendar-ui.js';

import { initStrategicPlanning, getRoadmap } from './strategic-planning.js';
import { showStrategicPlanningWizard } from './strategic-planning-ui.js';

// State
let currentDate = new Date();
let currentWeekStart = getWeekStart(currentDate);
let currentViewMode = 'week'; // 'week' or 'day'
let currentReportPeriod = 'day';
let currentSchedule = {};
let currentCalendars = [];
let authUserId = null;
let currentSuggestions = [];
let currentFamily = null; // Family data from Firebase (parent + children)

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

// Manual setup function for console
window.runFamilySetup = async function() {
  if (!authUserId || authUserId === 'demo') {
    console.error('❌ Cần đăng nhập trước khi chạy setup');
    return;
  }
  console.log('🚀 Running setup for:', authUserId);
  const success = await setupFamilyData(authUserId);
  if (success) {
    console.log('✅ Setup hoàn tất! Refreshing...');
    setTimeout(() => location.reload(), 1000);
  }
};

window.verifyFamilySetup = async function() {
  if (!authUserId || authUserId === 'demo') {
    console.error('❌ Cần đăng nhập trước');
    return;
  }
  await verifySetup(authUserId);
};

// Academic Calendar global handlers
window.showAcademicWizard = async function() {
  const childId = getCurrentUser();
  const family = currentFamily;
  const child = family?.children?.[childId];
  const childName = child?.name || 'Con';
  const childGrade = child?.grade || 4;

  // Get roadmap from Strategic Planning to pre-fill data
  const roadmap = await getRoadmap(authUserId, childId);

  // Prepare context from roadmap
  const roadmapContext = roadmap ? {
    grade: roadmap.assessment?.currentGrade || childGrade,
    focusSubjects: getCurrentPhaseFocus(roadmap, childGrade)?.subjects || [],
    focusSkills: getCurrentPhaseFocus(roadmap, childGrade)?.skills || [],
    activities: getCurrentPhaseFocus(roadmap, childGrade)?.activities || [],
    selectedPath: roadmap.selectedPathName || '',
    ultimateGoal: roadmap.ultimateGoal || ''
  } : null;

  showAcademicCalendarWizard(authUserId, childId, childName, null, roadmapContext);
};

// Helper to get current phase focus from roadmap
function getCurrentPhaseFocus(roadmap, grade) {
  if (!roadmap?.phases) return null;
  if (grade <= 5) return roadmap.phases.elementary;
  if (grade <= 9) return roadmap.phases.middle;
  return roadmap.phases.high;
}

window.showCalendarOverview = function() {
  const childId = getCurrentUser();
  const container = document.getElementById('academic-calendar-view');
  if (container) {
    renderCalendarOverview(authUserId, childId, container);
  }
};

window.showTermDetail = function(termId) {
  const childId = getCurrentUser();
  const container = document.getElementById('academic-calendar-view');
  if (container) {
    renderTermDetail(authUserId, childId, termId, container);
  }
};

window.editAcademicYear = function(yearId) {
  // TODO: Implement edit year
  console.log('Edit year:', yearId);
};

// Strategic Planning handler
window.showStrategicPlanning = function() {
  const childId = getCurrentUser();
  const family = currentFamily;
  const child = family?.children?.[childId];

  // Pass full child info from family data
  const childInfo = {
    name: child?.name || 'Con',
    grade: child?.grade || 4,
    birthDate: child?.birthDate || null,
    school: child?.school || '',
    avatar: child?.avatar || '🧒'
  };
  showStrategicPlanningWizard(authUserId, childId, childInfo);
};

// Listen for roadmap created event
window.addEventListener('roadmapCreated', (e) => {
  console.log('Roadmap created:', e.detail);
  // Refresh academic calendar view if visible
  window.showCalendarOverview();
});

// Expose authUserId for academic calendar UI
Object.defineProperty(window, 'authUserId', {
  get: () => authUserId
});

// Listen for academic year created event
window.addEventListener('academicYearCreated', (e) => {
  console.log('Academic year created:', e.detail);
  window.showCalendarOverview();
});

// Listen for navigate to week event (from academic calendar)
window.addEventListener('navigateToWeek', (e) => {
  const { startDate } = e.detail;
  if (startDate) {
    currentWeekStart = new Date(startDate);
    refreshSchedule();
  }
});

async function init() {
  // Check if we should skip auth (for testing/demo)
  const urlParams = new URLSearchParams(window.location.search);
  const skipAuth = urlParams.get('demo') === 'true';

  if (skipAuth) {
    console.log('⚠️ Demo mode - skipping authentication');
    initApp(null, null);
    return;
  }

  // Initialize authentication
  initAuth(onAuthStateChange);
}

function onAuthStateChange(authUser, profile) {
  if (!authUser) {
    // Not logged in - redirect to login page
    console.log('Not authenticated, redirecting to login...');
    window.location.href = 'login.html';
    return;
  }

  // User is logged in - initialize app
  console.log('✅ Authenticated:', authUser.email);
  initApp(authUser, profile);
}

async function initApp(authUser, profile) {
  // Store auth user ID
  authUserId = authUser?.uid || 'demo';

  // Set parent ID for data.js (scopes localStorage keys to this parent)
  setParentUserId(authUserId);

  // Update user profile display
  updateUserProfileDisplay(authUser, profile);

  // Always start with current week
  currentDate = new Date();
  currentWeekStart = getWeekStart(currentDate);

  // Load calendars
  await loadCalendars();

  // Initialize family system (Firebase-based children management)
  await initFamilyData(authUser, profile);

  // Set up Firebase real-time update callback
  onFirebaseDataUpdate(() => {
    console.log('🔄 Firebase update received, refreshing UI...');
    refreshSchedule();
    refreshSubjects();
    refreshReports();
    updateDashboard();
  });

  // Initialize user (now scoped to this parent)
  const user = getCurrentUser();
  if (user) {
    await setCurrentUser(user.id);
  }
  refreshUserSelector();

  // Render initial views
  refreshSchedule();
  refreshSubjects();
  refreshReports();

  // Initialize dashboard with countdown
  initDashboard();

  // Setup event listeners
  setupNavigation();
  setupScheduleControls();
  setupSubjectForm();
  setupEventForm();
  setupSessionModal();
  setupModals();
  setupUserSelector();
  setupUserProfile();
  setupCalendarSelector();
  setupAISettings();
  setupCalendarSettings();

  // Show admin section if user is admin
  if (isAdmin()) {
    const adminSection = document.getElementById('admin-section');
    if (adminSection) adminSection.style.display = 'block';
  }
}

function setupAISettings() {
  const keyInput = document.getElementById('setting-gemini-key');
  const saveBtn = document.getElementById('btn-save-gemini-key');
  const statusEl = document.getElementById('gemini-status');

  // Show current status
  if (statusEl) {
    if (hasApiKey()) {
      statusEl.innerHTML = '<span class="status-success">✅ Đã kết nối Gemini AI</span>';
      if (keyInput) keyInput.placeholder = '••••••••••••••••';
    } else {
      statusEl.innerHTML = '<span class="status-warning">⚠️ Chưa có API key - dùng mặc định</span>';
    }
  }

  if (saveBtn && keyInput) {
    saveBtn.addEventListener('click', async () => {
      const key = keyInput.value.trim();
      if (!key) {
        alert('Vui lòng nhập API key');
        return;
      }

      // Test the key
      saveBtn.disabled = true;
      saveBtn.textContent = 'Đang kiểm tra...';

      try {
        // Simple test call
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: 'Xin chào' }] }]
            })
          }
        );

        if (response.ok) {
          setApiKey(key);
          keyInput.value = '';
          keyInput.placeholder = '••••••••••••••••';
          statusEl.innerHTML = '<span class="status-success">✅ Đã kết nối Gemini AI</span>';
          alert('✅ Kết nối thành công!');
        } else {
          throw new Error('Invalid API key');
        }
      } catch (e) {
        statusEl.innerHTML = '<span class="status-error">❌ API key không hợp lệ</span>';
        alert('❌ API key không hợp lệ. Vui lòng kiểm tra lại.');
      }

      saveBtn.disabled = false;
      saveBtn.textContent = 'Lưu';
    });
  }
}

function setupCalendarSettings() {
  const saveBtn = document.getElementById('btn-save-calendar-settings');
  console.log('setupCalendarSettings: saveBtn =', saveBtn);

  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      console.log('Save calendar clicked!');
      const name = document.getElementById('setting-calendar-name')?.value?.trim();
      console.log('Calendar name:', name, 'authUserId:', authUserId, 'currentCalendars:', currentCalendars);
      const type = document.getElementById('setting-calendar-type')?.value;
      const color = document.getElementById('setting-calendar-color')?.value;
      const startDate = document.getElementById('setting-calendar-start')?.value;
      const endDate = document.getElementById('setting-calendar-end')?.value;

      if (!name) {
        alert('Vui lòng nhập tên lịch');
        return;
      }

      const currentId = getCurrentCalendarId();

      if (currentId && currentCalendars.length > 0) {
        // Update existing calendar
        const success = await updateCalendar(authUserId, currentId, {
          name,
          type,
          color,
          startDate,
          endDate
        });

        if (success) {
          // Update local cache
          const idx = currentCalendars.findIndex(c => c.id === currentId);
          if (idx >= 0) {
            currentCalendars[idx] = { ...currentCalendars[idx], name, type, color, startDate, endDate };
          }
          refreshCalendarSelector();
          alert('✅ Đã lưu thay đổi!');
        } else {
          alert('❌ Không thể lưu. Vui lòng thử lại.');
        }
      } else {
        // Create new calendar
        const calendar = await createCalendar(authUserId, { name, type, color, startDate, endDate });
        if (calendar) {
          currentCalendars.push(calendar);
          setCurrentCalendar(calendar.id);
          refreshCalendarSelector();
          alert('✅ Đã tạo lịch mới!');
        } else {
          alert('❌ Không thể tạo lịch. Vui lòng thử lại.');
        }
      }
    });
  }

  // Load current calendar data into settings form
  loadCalendarSettingsForm();
}

function loadCalendarSettingsForm() {
  const currentId = getCurrentCalendarId();
  const calendar = currentCalendars.find(c => c.id === currentId);

  if (calendar) {
    const nameEl = document.getElementById('setting-calendar-name');
    const typeEl = document.getElementById('setting-calendar-type');
    const colorEl = document.getElementById('setting-calendar-color');
    const startEl = document.getElementById('setting-calendar-start');
    const endEl = document.getElementById('setting-calendar-end');

    if (nameEl) nameEl.value = calendar.name || '';
    if (typeEl) typeEl.value = calendar.type || 'summer';
    if (colorEl) colorEl.value = calendar.color || '#6366f1';
    if (startEl) startEl.value = calendar.startDate || '';
    if (endEl) endEl.value = calendar.endDate || '';
  }
}

function updateUserProfileDisplay(authUser, profile) {
  const avatarEl = document.getElementById('user-avatar');
  const nameEl = document.getElementById('user-name');
  const emailEl = document.getElementById('user-email');

  if (!authUser) {
    // Demo mode
    if (nameEl) nameEl.textContent = 'Demo User';
    if (emailEl) emailEl.textContent = 'demo@example.com';
    if (avatarEl) {
      avatarEl.style.display = 'none';
    }
    return;
  }

  if (avatarEl) {
    if (authUser.photoURL) {
      avatarEl.src = authUser.photoURL;
      avatarEl.alt = authUser.displayName || 'Avatar';
      avatarEl.style.display = '';
    } else {
      avatarEl.style.display = 'none';
    }
  }

  if (nameEl) {
    nameEl.textContent = profile?.displayName || authUser.displayName || authUser.email.split('@')[0];
  }

  if (emailEl) {
    emailEl.textContent = authUser.email;
  }
}

function setupUserProfile() {
  const btn = document.getElementById('btn-user-profile');
  const dropdown = document.getElementById('user-dropdown');
  const logoutBtn = document.getElementById('btn-logout');

  if (btn && dropdown) {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('user-dropdown--open');
    });

    document.addEventListener('click', () => {
      dropdown.classList.remove('user-dropdown--open');
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      if (confirm('Đăng xuất khỏi tài khoản?')) {
        await logOut();
        window.location.href = 'login.html';
      }
    });
  }
}

/**
 * Initialize family data from Firebase
 * Syncs children list to localStorage for data.js compatibility
 */
async function initFamilyData(authUser, profile) {
  if (!authUser || authUserId === 'demo') {
    console.log('Demo mode - using local storage only');
    return;
  }

  try {
    // Initialize family module with database
    const { getDb } = await import('./auth.js');
    const db = getDb();
    initFamily(db);
    initAcademicCalendar(db);
    initStrategicPlanning(db);

    // Load family from Firebase
    currentFamily = await getFamily(authUserId);

    if (!currentFamily) {
      // First time - create family with parent profile
      console.log('Creating new family for:', authUser.email);

      // Special setup for ledobsn@gmail.com with Anna & Ivy data
      if (authUser.email === 'ledobsn@gmail.com') {
        console.log('🚀 Setting up family data for ledobsn@gmail.com...');
        await setupFamilyData(authUserId);
        currentFamily = await getFamily(authUserId);
      } else {
        await saveParentProfile(authUserId, {
          email: authUser.email,
          name: profile?.displayName || authUser.displayName || authUser.email.split('@')[0]
        });
        currentFamily = await getFamily(authUserId);
      }
    } else {
      // Family exists - check if children exist for ledobsn@gmail.com
      const children = getChildren(currentFamily);
      if (authUser.email === 'ledobsn@gmail.com' && children.length === 0) {
        console.log('🚀 Adding Anna & Ivy data for ledobsn@gmail.com...');
        await setupFamilyData(authUserId);
        currentFamily = await getFamily(authUserId);
      }
    }

    // Sync children to localStorage for data.js compatibility
    syncChildrenToLocalStorage();

    console.log('✅ Family loaded:', currentFamily);
  } catch (error) {
    console.error('Error initializing family:', error);
  }
}

/**
 * Sync children from Firebase family to localStorage
 * This allows data.js to work with the children list
 */
function syncChildrenToLocalStorage() {
  if (!currentFamily) return;

  const children = getChildren(currentFamily);
  const users = children.map(child => ({
    id: child.id,
    name: child.name,
    color: getColorForAvatar(child.avatar),
    avatar: child.avatar,
    createdAt: child.createdAt
  }));

  // Directly set localStorage with parent-scoped key
  const usersKey = authUserId === 'demo' ? 'sumSched_users' : `sumSched_${authUserId}_users`;
  localStorage.setItem(usersKey, JSON.stringify(users));
  console.log('✅ Synced', users.length, 'children to localStorage');
}

function getColorForAvatar(avatar) {
  const colorMap = {
    '🧒': '#ec4899', '👦': '#3b82f6', '👧': '#ec4899',
    '🦊': '#f97316', '🐰': '#a855f7', '🐻': '#78716c',
    '🐼': '#1f2937', '🐨': '#6b7280', '🦁': '#f59e0b',
    '🐸': '#22c55e', '🐵': '#92400e', '🦄': '#d946ef'
  };
  return colorMap[avatar] || '#6366f1';
}

async function loadCalendars() {
  currentCalendars = await getCalendars(authUserId);

  // Set current calendar if not set
  let currentId = getCurrentCalendarId();
  if (!currentId || !currentCalendars.find(c => c.id === currentId)) {
    const active = getActiveCalendar(currentCalendars);
    if (active) {
      setCurrentCalendar(active.id);
      currentId = active.id;
    }
  }

  // Update UI
  refreshCalendarSelector();
}

function refreshCalendarSelector() {
  const nameEl = document.getElementById('current-calendar-name');
  const listEl = document.getElementById('calendar-list');
  const currentId = getCurrentCalendarId();

  // Update current calendar name
  const currentCal = currentCalendars.find(c => c.id === currentId);
  if (nameEl && currentCal) {
    nameEl.textContent = currentCal.name;
  }

  // Render calendar list
  if (listEl) {
    renderCalendarList(currentCalendars, currentId, listEl);

    // Add click handlers with event propagation stop
    listEl.querySelectorAll('.calendar-dropdown__item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const calId = item.dataset.calendarId;
        console.log('Calendar item clicked:', calId);
        if (calId) {
          switchCalendar(calId);
        }
      });
    });
  }
}

function switchCalendar(calendarId) {
  setCurrentCalendar(calendarId);
  refreshCalendarSelector();

  // Close dropdown
  document.getElementById('calendar-dropdown')?.classList.remove('calendar-dropdown--open');

  // Refresh views for new calendar
  // TODO: When we have calendar-scoped data, refresh here
  refreshSchedule();
  refreshSubjects();
  refreshReports();
  updateDashboard();
}

function setupCalendarSelector() {
  const btn = document.getElementById('btn-calendar-selector');
  const dropdown = document.getElementById('calendar-dropdown');
  const addBtn = document.getElementById('btn-add-calendar');
  const saveBtn = document.getElementById('btn-save-calendar');

  if (btn && dropdown) {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown.classList.toggle('calendar-dropdown--open');
    });

    document.addEventListener('click', (e) => {
      if (!dropdown.contains(e.target) && !btn.contains(e.target)) {
        dropdown.classList.remove('calendar-dropdown--open');
      }
    });
  }

  if (addBtn) {
    addBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      console.log('Add calendar button clicked');
      document.getElementById('calendar-dropdown')?.classList.remove('calendar-dropdown--open');
      openCalendarModal();
    });
  }

  if (saveBtn) {
    console.log('btn-save-calendar found, adding listener');
    saveBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('Save calendar button clicked!');
      await saveCalendarFromModal();
    });
  } else {
    console.warn('btn-save-calendar not found');
  }
}

async function saveCalendarFromModal() {
  const name = document.getElementById('calendar-name')?.value?.trim();
  const type = document.getElementById('calendar-type')?.value;
  const color = document.getElementById('calendar-color')?.value;
  const startDate = document.getElementById('calendar-start')?.value;
  const endDate = document.getElementById('calendar-end')?.value;

  if (!name || !startDate || !endDate) {
    alert('Vui lòng điền đầy đủ thông tin');
    return;
  }

  if (startDate > endDate) {
    alert('Ngày kết thúc phải sau ngày bắt đầu');
    return;
  }

  const calendar = await createCalendar(authUserId, {
    name,
    type,
    color,
    startDate,
    endDate
  });

  if (calendar) {
    currentCalendars.push(calendar);
    setCurrentCalendar(calendar.id);
    refreshCalendarSelector();
    hideModal('modal-calendar');
    alert('✅ Đã tạo lịch mới: ' + name);
  } else {
    alert('❌ Không thể tạo lịch. Vui lòng thử lại.');
  }
}

function openCalendarModal(calendarId = null) {
  const modal = document.getElementById('modal-calendar');
  const titleEl = document.getElementById('modal-calendar-title');
  const saveBtn = document.getElementById('btn-save-calendar');

  if (!modal) return;

  // Reset form
  document.getElementById('calendar-name').value = '';
  document.getElementById('calendar-type').value = 'summer';
  document.getElementById('calendar-color').value = '#6366f1';
  document.getElementById('calendar-start').value = '';
  document.getElementById('calendar-end').value = '';

  if (calendarId) {
    // Edit mode
    const cal = currentCalendars.find(c => c.id === calendarId);
    if (cal) {
      titleEl.textContent = 'Sửa lịch';
      saveBtn.textContent = 'Lưu thay đổi';
      document.getElementById('calendar-name').value = cal.name;
      document.getElementById('calendar-type').value = cal.type;
      document.getElementById('calendar-color').value = cal.color;
      document.getElementById('calendar-start').value = cal.startDate;
      document.getElementById('calendar-end').value = cal.endDate;
    }
  } else {
    // Create mode - set default dates
    titleEl.textContent = 'Tạo lịch mới';
    saveBtn.textContent = 'Tạo lịch';

    const today = new Date();
    const year = today.getFullYear();

    // Default to summer schedule
    document.getElementById('calendar-start').value = `${year}-06-01`;
    document.getElementById('calendar-end').value = `${year}-08-31`;
  }

  showModal('modal-calendar');
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

  // Use detailed stats for chart (has target vs scheduled breakdown)
  const detailedStats = getDetailedWeekStats(currentDate);
  renderReportChart(detailedStats, reportChart);

  // Render detailed weekly table
  const tableContainer = document.getElementById('report-table');
  renderDetailedTable(detailedStats, tableContainer);
}

// Navigation
function setupNavigation() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      switchView(btn.dataset.view);

      if (btn.dataset.view === 'reports') {
        refreshReports();
      }

      if (btn.dataset.view === 'academic') {
        refreshAcademicCalendar();
      }

      if (btn.dataset.view === 'strategy') {
        refreshStrategyView();
      }
    });
  });
}

// Refresh Academic Calendar View
async function refreshAcademicCalendar() {
  const childId = getCurrentUser();
  const container = document.getElementById('academic-calendar-view');
  if (container && authUserId) {
    await renderCalendarOverview(authUserId, childId, container);
  }
}

// Refresh Strategy View
async function refreshStrategyView() {
  const childId = getCurrentUser();
  const container = document.getElementById('strategy-view');
  if (container && authUserId) {
    // Check if roadmap exists
    const roadmap = await getRoadmap(authUserId, childId);
    if (roadmap) {
      renderRoadmapSummary(roadmap, container);
    }
    // Otherwise show empty state (already in HTML)
  }
}

// Render roadmap summary in strategy view
function renderRoadmapSummary(roadmap, container) {
  const { phases, selectedPathName, ultimateGoal, immediateActions } = roadmap;

  container.innerHTML = `
    <div class="roadmap-summary">
      <div class="roadmap-header">
        <h2>🎯 Lộ Trình: ${selectedPathName}</h2>
        <p>${ultimateGoal}</p>
        <button class="btn btn-outline btn-sm" onclick="window.showStrategicPlanning()">
          ✏️ Chỉnh sửa
        </button>
      </div>

      <div class="phases-overview">
        ${phases?.elementary?.grades?.length > 0 ? `
          <div class="phase-card elementary">
            <h4>🏫 Tiểu học (Lớp ${phases.elementary.grades.join(', ')})</h4>
            <p><strong>Trọng tâm:</strong> ${phases.elementary.focus || 'Chưa xác định'}</p>
            <p><strong>Môn:</strong> ${phases.elementary.subjects?.join(', ') || '-'}</p>
          </div>
        ` : ''}

        ${phases?.middle ? `
          <div class="phase-card middle">
            <h4>🎓 THCS (Lớp ${phases.middle.grades?.join(', ') || '6-9'})</h4>
            <p><strong>Trọng tâm:</strong> ${phases.middle.focus || 'Chưa xác định'}</p>
            <p><strong>Môn:</strong> ${phases.middle.subjects?.join(', ') || '-'}</p>
          </div>
        ` : ''}

        ${phases?.high ? `
          <div class="phase-card high">
            <h4>🎯 THPT (Lớp ${phases.high.grades?.join(', ') || '10-12'})</h4>
            <p><strong>Trọng tâm:</strong> ${phases.high.focus || 'Chưa xác định'}</p>
            <p><strong>Môn:</strong> ${phases.high.subjects?.join(', ') || '-'}</p>
          </div>
        ` : ''}
      </div>

      ${immediateActions?.length > 0 ? `
        <div class="immediate-actions-box">
          <h4>📌 Hành động 3 tháng tới</h4>
          <ul>
            ${immediateActions.map(a => `<li>${a}</li>`).join('')}
          </ul>
        </div>
      ` : ''}

      <div class="next-step">
        <p>👉 Tiếp theo: Vào tab <strong>📅 Năm học</strong> để thiết lập kế hoạch chi tiết</p>
      </div>
    </div>
  `;
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

  // Refresh suggestions
  document.getElementById('btn-refresh-suggestions').addEventListener('click', () => {
    currentSuggestions = generateSmartSuggestions(currentWeekStart);
    renderSuggestionsList();
  });

  // Export data to file
  document.getElementById('btn-export-data').addEventListener('click', () => {
    downloadDataAsFile();
    alert('Đã tải xuống file dữ liệu!');
  });

  // Import data from file
  document.getElementById('btn-import-data').addEventListener('click', () => {
    document.getElementById('import-file-input').click();
  });

  document.getElementById('import-file-input').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = importData(event.target.result);
      if (result.success) {
        alert('Nhập dữ liệu thành công!\n' + result.message);
        refreshSchedule();
        refreshSubjects();
        refreshReports();
      } else {
        alert('Lỗi nhập dữ liệu: ' + result.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  });

}

function showSuggestions() {
  currentSuggestions = generateSmartSuggestions(currentWeekStart);
  renderSuggestionsList();
  showModal('modal-suggestions');
}

function renderSuggestionsList() {
  const container = document.getElementById('suggest-list');
  const weekDates = getWeekDates(currentWeekStart);

  if (currentSuggestions.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state__icon">✨</div>
        <div class="empty-state__text">Không có gợi ý nào.<br>Có thể tất cả môn linh hoạt đã được xếp lịch.</div>
      </div>
    `;
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

  const categoryIcons = { academic: '📚', physical: '🏃', art: '🎨' };

  container.innerHTML = Object.entries(byDate).map(([date, data]) => `
    <div class="suggest-day">${data.dayName}</div>
    ${data.items.map((s) => {
      const subject = getSubject(s.subjectId);
      const icon = categoryIcons[subject?.category] || '📖';
      return `
      <div class="suggest-item ${s.selected ? 'suggest-item--selected' : ''} ${s.isTeacherSlot ? 'suggest-item--teacher' : 'suggest-item--ai'}" data-id="${s.id}">
        <div class="suggest-item__check">
          <input type="checkbox" ${s.selected ? 'checked' : ''} data-suggestion-id="${s.id}">
        </div>
        <div class="suggest-item__content">
          <div class="suggest-item__header">
            <span class="suggest-item__color" style="background-color: ${s.color}">${icon}</span>
            <span class="suggest-item__name">${s.subjectName}</span>
            <span class="suggest-item__time">${s.startTime} - ${s.endTime}</span>
            ${!s.isTeacherSlot ? `<button class="btn btn--xs btn--outline suggest-edit-btn" data-id="${s.id}" title="Sửa ngày giờ">✏️</button>` : ''}
          </div>
          <div class="suggest-item__reason">${s.reason}</div>
        </div>
      </div>
    `}).join('')}
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

  // Add edit button listeners
  container.querySelectorAll('.suggest-edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = btn.dataset.id;
      openSuggestionEditor(id);
    });
  });
}

function openSuggestionEditor(suggestionId) {
  const suggestion = currentSuggestions.find(s => s.id === suggestionId);
  if (!suggestion) return;

  const weekDates = getWeekDates(currentWeekStart);
  const DAY_NAMES = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

  const dateOptions = weekDates.map(d => {
    const date = new Date(d + 'T00:00:00');
    const dayName = DAY_NAMES[date.getDay()];
    const label = `${dayName} ${date.getDate()}/${date.getMonth() + 1}`;
    return `<option value="${d}" ${d === suggestion.date ? 'selected' : ''}>${label}</option>`;
  }).join('');

  const item = document.querySelector(`.suggest-item[data-id="${suggestionId}"]`);
  const contentEl = item.querySelector('.suggest-item__content');

  // Replace content with edit form
  const originalContent = contentEl.innerHTML;
  contentEl.innerHTML = `
    <div class="suggest-edit-form">
      <div class="suggest-edit-row">
        <select class="suggest-edit-date" data-id="${suggestionId}">
          ${dateOptions}
        </select>
        <input type="time" class="suggest-edit-start" value="${suggestion.startTime}" data-id="${suggestionId}">
        <span>-</span>
        <input type="time" class="suggest-edit-end" value="${suggestion.endTime}" data-id="${suggestionId}">
      </div>
      <div class="suggest-edit-actions">
        <button class="btn btn--xs btn--primary suggest-save-btn" data-id="${suggestionId}">✓ Lưu</button>
        <button class="btn btn--xs btn--outline suggest-cancel-btn" data-id="${suggestionId}">✗ Hủy</button>
        <button class="btn btn--xs btn--danger-outline suggest-delete-btn" data-id="${suggestionId}">🗑️</button>
      </div>
    </div>
  `;

  // Save button
  contentEl.querySelector('.suggest-save-btn').addEventListener('click', () => {
    const newDate = contentEl.querySelector('.suggest-edit-date').value;
    const newStart = contentEl.querySelector('.suggest-edit-start').value;
    const newEnd = contentEl.querySelector('.suggest-edit-end').value;

    // Validate
    if (newStart >= newEnd) {
      alert('Giờ kết thúc phải sau giờ bắt đầu');
      return;
    }

    // Check conflict
    const conflict = checkSessionConflict(newDate, newStart, newEnd, suggestionId);
    if (conflict.conflict) {
      alert(`Xung đột với ca khác: ${conflict.type === 'overlap' ? 'trùng giờ' : 'cách < 30 phút'}`);
      return;
    }

    // Update suggestion
    suggestion.date = newDate;
    suggestion.startTime = newStart;
    suggestion.endTime = newEnd;
    suggestion.dayName = formatDateDisplay(newDate);

    renderSuggestionsList();
  });

  // Cancel button
  contentEl.querySelector('.suggest-cancel-btn').addEventListener('click', () => {
    renderSuggestionsList();
  });

  // Delete button
  contentEl.querySelector('.suggest-delete-btn').addEventListener('click', () => {
    currentSuggestions = currentSuggestions.filter(s => s.id !== suggestionId);
    renderSuggestionsList();
  });
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
  // Toggle actual time fields based on status
  document.querySelectorAll('input[name="session-status"]').forEach(radio => {
    radio.addEventListener('change', () => {
      const actualTimeGroup = document.getElementById('actual-time-group');
      if (radio.value === 'completed') {
        actualTimeGroup.style.display = 'block';
        // Pre-fill with scheduled time
        const startTime = document.getElementById('session-start-time').value;
        const endTime = document.getElementById('session-end-time').value;
        const actualStart = document.getElementById('session-actual-start');
        const actualEnd = document.getElementById('session-actual-end');
        if (!actualStart.value) actualStart.value = startTime;
        if (!actualEnd.value) actualEnd.value = endTime;
      } else {
        actualTimeGroup.style.display = 'none';
      }
    });
  });

  document.getElementById('btn-save-session').addEventListener('click', () => {
    const id = document.getElementById('session-id').value;
    const statusRadio = document.querySelector('input[name="session-status"]:checked');
    const status = statusRadio ? statusRadio.value : 'pending';
    const notes = document.getElementById('session-notes').value.trim();

    // Get actual time if completed
    let actualStartTime = null;
    let actualEndTime = null;
    if (status === 'completed') {
      actualStartTime = document.getElementById('session-actual-start').value || null;
      actualEndTime = document.getElementById('session-actual-end').value || null;
    }

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
            notes: notes,
            actualStartTime: actualStartTime,
            actualEndTime: actualEndTime
          };
          break;
        }
      }
    } else {
      session.status = status;
      session.notes = notes;
      if (actualStartTime) session.actualStartTime = actualStartTime;
      if (actualEndTime) session.actualEndTime = actualEndTime;
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
  // Try direct delete first
  const sessions = getSessions();
  const session = sessions.find(s => s.id === id);

  if (session) {
    deleteSession(id);
    return;
  }

  // Session not in storage - might be a generated fixed session ID
  // Try to find and remove by matching the current schedule
  for (const daySchedule of Object.values(currentSchedule)) {
    const found = daySchedule.sessions.find(s => s.id === id);
    if (found) {
      // Find the stored session by subjectId + date + startTime
      const storedSession = sessions.find(s =>
        s.subjectId === found.subjectId && s.date === found.date && s.startTime === found.startTime
      );
      if (storedSession) {
        deleteSession(storedSession.id);
      }
      break;
    }
  }
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

  const allSessions = getSessions();
  const sessionsToKeep = allSessions.filter(session => {
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

  // Delete sessions that should be removed
  const sessionsToDelete = allSessions.filter(s => !sessionsToKeep.includes(s));
  sessionsToDelete.forEach(s => deleteSession(s.id));
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

  // Set hidden time fields for actual time editing
  document.getElementById('session-start-time').value = session.startTime;
  document.getElementById('session-end-time').value = session.endTime;

  // Handle actual time fields
  const actualTimeGroup = document.getElementById('actual-time-group');
  const actualStartInput = document.getElementById('session-actual-start');
  const actualEndInput = document.getElementById('session-actual-end');

  if (statusValue === 'completed') {
    actualTimeGroup.style.display = 'block';
    actualStartInput.value = session.actualStartTime || session.startTime;
    actualEndInput.value = session.actualEndTime || session.endTime;
  } else {
    actualTimeGroup.style.display = 'none';
    actualStartInput.value = '';
    actualEndInput.value = '';
  }

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
  // Get children from Firebase family data (or fall back to localStorage)
  let children = [];
  if (currentFamily) {
    children = getChildren(currentFamily);
  }

  const user = getCurrentUser();
  console.log('refreshUserSelector: current user =', user, 'children from family =', children);

  // Update header display with current child name
  const nameEl = document.getElementById('user-name');
  if (nameEl && user) {
    nameEl.textContent = user.name;
  }

  // Update dropdown list
  const listEl = document.getElementById('user-list');
  if (!listEl) {
    console.warn('user-list element not found');
    return;
  }

  if (children.length === 0) {
    listEl.innerHTML = `
      <div class="user-dropdown__empty">
        Chưa có hồ sơ bé nào.<br>Nhấn "Thêm bé" để tạo.
      </div>
    `;
    return;
  }

  listEl.innerHTML = children.map(child => `
    <div class="user-dropdown__item ${user && child.id === user.id ? 'user-dropdown__item--active' : ''}" data-user-id="${child.id}">
      <span class="user-dropdown__item-avatar" style="background-color: ${getColorForAvatar(child.avatar)}">${child.avatar || child.name.charAt(0).toUpperCase()}</span>
      <span class="user-dropdown__item-name">${child.name}</span>
    </div>
  `).join('');

  // Add click handlers for user items
  listEl.querySelectorAll('.user-dropdown__item').forEach(item => {
    item.addEventListener('click', async () => {
      const userId = item.dataset.userId;
      document.getElementById('user-dropdown').classList.remove('user-dropdown--open');

      // setCurrentUser loads from Firebase and subscribes to updates
      if (await setCurrentUser(userId)) {
        refreshUserSelector();
        refreshSchedule();
        refreshSubjects();
        refreshReports();
        updateDashboard();
      }
    });
  });
}

function setupUserSelector() {
  // Note: dropdown toggle is handled by setupUserProfile()
  // This function sets up the add-user button

  const addBtn = document.getElementById('btn-add-user');
  if (!addBtn) return;

  addBtn.addEventListener('click', async () => {
    const name = prompt('Tên bé:');
    if (name && name.trim()) {
      // Pick random avatar
      const randomAvatar = CHILD_AVATARS[Math.floor(Math.random() * CHILD_AVATARS.length)];
      // Default PIN for new child
      const defaultPin = '1234';

      try {
        // Add child to Firebase via family.js
        const child = await addChild(authUserId, {
          name: name.trim(),
          avatar: randomAvatar,
          pin: defaultPin
        });

        if (child) {
          // Reload family data and sync to localStorage
          currentFamily = await getFamily(authUserId);
          syncChildrenToLocalStorage();

          // Switch to new child
          await setCurrentUser(child.id);
          document.getElementById('user-dropdown')?.classList.remove('user-dropdown--open');
          refreshUserSelector();
          refreshSchedule();
          refreshSubjects();
          refreshReports();
          updateDashboard();

          alert(`Đã thêm bé "${child.name}"!\nPIN mặc định: ${defaultPin}\n(Có thể đổi trong Cài đặt)`);
        } else {
          alert('Không thể thêm bé. Vui lòng thử lại.');
        }
      } catch (error) {
        console.error('Error adding child:', error);
        alert('Lỗi: ' + error.message);
      }
    }
  });
}
