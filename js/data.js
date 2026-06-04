/**
 * Data Management Module - LocalStorage + Firebase Real-time Sync
 */

import {
  saveToFirebase,
  loadFromFirebase,
  subscribeToUser,
  saveUsersListToFirebase,
  loadUsersListFromFirebase
} from './firebase.js';

// User management
const CURRENT_USER_KEY = 'sumSched_currentUser';

let currentUserId = null;
let parentUserId = null; // Firebase Auth UID of parent

// Set parent user ID (call after Firebase auth)
export function setParentUserId(uid) {
  parentUserId = uid;
}

// Get users key scoped to parent
function getUsersKey() {
  if (!parentUserId || parentUserId === 'demo') {
    return 'sumSched_users'; // Fallback for demo mode
  }
  return `sumSched_${parentUserId}_users`;
}

// Get current user key scoped to parent
function getCurrentUserKey() {
  if (!parentUserId || parentUserId === 'demo') {
    return CURRENT_USER_KEY;
  }
  return `sumSched_${parentUserId}_currentUser`;
}
let firebaseUnsubscribe = null;
let syncInProgress = false;
let onDataUpdateCallback = null;

// Debounce Firebase sync to avoid too many writes
let syncTimeout = null;
function debouncedFirebaseSync() {
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(() => {
    syncToFirebase();
  }, 1000); // Wait 1 second after last change
}

// Sync current user data to Firebase
async function syncToFirebase() {
  if (syncInProgress || !currentUserId) return;
  syncInProgress = true;

  const data = {
    subjects: getSubjects(),
    events: getEvents(),
    sessions: getSessions(),
    settings: getSettings()
  };

  const success = await saveToFirebase(currentUserId, data);
  syncInProgress = false;

  if (success) {
    showSyncIndicator('✓ Synced');
  }
}

// Show sync indicator (non-blocking)
function showSyncIndicator(message) {
  let indicator = document.getElementById('sync-indicator');
  if (!indicator) {
    indicator = document.createElement('div');
    indicator.id = 'sync-indicator';
    indicator.style.cssText = 'position:fixed;bottom:10px;right:10px;background:#10b981;color:white;padding:4px 12px;border-radius:20px;font-size:12px;z-index:9999;opacity:0;transition:opacity 0.3s';
    document.body.appendChild(indicator);
  }
  indicator.textContent = message;
  indicator.style.opacity = '1';
  setTimeout(() => { indicator.style.opacity = '0'; }, 2000);
}

function getStorageKey(baseKey) {
  if (!currentUserId) {
    currentUserId = getCurrentUserId();
  }
  return `sumSched_${currentUserId}_${baseKey}`;
}

const STORAGE_KEYS = {
  get SUBJECTS() { return getStorageKey('subjects'); },
  get EVENTS() { return getStorageKey('events'); },
  get SESSIONS() { return getStorageKey('sessions'); },
  get SETTINGS() { return getStorageKey('settings'); }
};

// User CRUD (now scoped to parent)
export function getUsers() {
  try {
    const data = localStorage.getItem(getUsersKey());
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
}

export function saveUsers(users) {
  localStorage.setItem(getUsersKey(), JSON.stringify(users));
}

export function addUser(name, color = '#6366f1') {
  const users = getUsers();
  const id = name.toLowerCase().replace(/\s+/g, '_');

  if (users.some(u => u.id === id)) {
    return null; // User already exists
  }

  const user = { id, name, color, createdAt: new Date().toISOString() };
  users.push(user);
  saveUsers(users);
  return user;
}

export function deleteUser(userId) {
  const users = getUsers().filter(u => u.id !== userId);
  saveUsers(users);

  // Also delete user's data (child's learning data)
  const keysToDelete = [
    `sumSched_${userId}_subjects`,
    `sumSched_${userId}_events`,
    `sumSched_${userId}_sessions`,
    `sumSched_${userId}_settings`
  ];
  keysToDelete.forEach(key => localStorage.removeItem(key));

  // Clear current user if deleted
  if (currentUserId === userId) {
    currentUserId = null;
    localStorage.removeItem(getCurrentUserKey());
  }
}

export function getCurrentUserId() {
  let userId = localStorage.getItem(getCurrentUserKey());
  const users = getUsers();

  // Validate current user exists (no auto-create - let family.js handle that)
  if (users.length > 0 && (!userId || !users.some(u => u.id === userId))) {
    userId = users[0]?.id;
    localStorage.setItem(getCurrentUserKey(), userId);
  }

  currentUserId = userId;
  return userId;
}

export async function setCurrentUser(userId, skipFirebaseLoad = false) {
  const users = getUsers();
  // Allow setting user even if not in local list (will be synced from Firebase)
  if (users.length > 0 && !users.some(u => u.id === userId)) {
    return false;
  }

  // Unsubscribe from previous user
  if (firebaseUnsubscribe) {
    firebaseUnsubscribe();
    firebaseUnsubscribe = null;
  }

  currentUserId = userId;
  localStorage.setItem(getCurrentUserKey(), userId);

  // Load data from Firebase (if not skipping)
  if (!skipFirebaseLoad) {
    await loadUserFromFirebase(userId);
  }

  // Subscribe to real-time updates
  firebaseUnsubscribe = subscribeToUser(userId, (data) => {
    if (syncInProgress) return; // Don't update if we're the ones syncing

    // Update localStorage with Firebase data
    if (data.subjects) setItem(STORAGE_KEYS.SUBJECTS, data.subjects);
    if (data.events) setItem(STORAGE_KEYS.EVENTS, data.events);
    if (data.sessions) setItem(STORAGE_KEYS.SESSIONS, data.sessions);
    if (data.settings) setItem(STORAGE_KEYS.SETTINGS, data.settings);

    showSyncIndicator('🔄 Updated');

    // Notify app to refresh UI
    if (onDataUpdateCallback) {
      onDataUpdateCallback();
    }
  });

  return true;
}

// Load user data from Firebase into localStorage
async function loadUserFromFirebase(userId) {
  const data = await loadFromFirebase(userId);
  if (data) {
    if (data.subjects) setItem(`sumSched_${userId}_subjects`, data.subjects);
    if (data.events) setItem(`sumSched_${userId}_events`, data.events);
    if (data.sessions) setItem(`sumSched_${userId}_sessions`, data.sessions);
    if (data.settings) setItem(`sumSched_${userId}_settings`, data.settings);
    console.log('✅ Loaded user data from Firebase:', userId);
    return true;
  }
  return false;
}

// Set callback for when data updates from Firebase
export function onFirebaseDataUpdate(callback) {
  onDataUpdateCallback = callback;
}

export function getCurrentUser() {
  const userId = getCurrentUserId();
  const users = getUsers();
  return users.find(u => u.id === userId) || users[0];
}

export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function getItem(key) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.error('Error reading from localStorage:', e);
    return null;
  }
}

function setItem(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (e) {
    console.error('Error writing to localStorage:', e);
    if (e.name === 'QuotaExceededError') {
      alert('Bộ nhớ đầy! Vui lòng xóa bớt dữ liệu cũ.');
    }
    return false;
  }
}

// Subjects CRUD
export function getSubjects() {
  return getItem(STORAGE_KEYS.SUBJECTS) || [];
}

export function getSubject(id) {
  const subjects = getSubjects();
  return subjects.find(s => s.id === id);
}

export function saveSubject(subject) {
  const subjects = getSubjects();
  const index = subjects.findIndex(s => s.id === subject.id);

  if (index >= 0) {
    subjects[index] = subject;
  } else {
    subject.id = subject.id || generateId();
    subjects.push(subject);
  }

  const result = setItem(STORAGE_KEYS.SUBJECTS, subjects) ? subject : null;
  if (result) debouncedFirebaseSync();
  return result;
}

export function deleteSubject(id) {
  const subjects = getSubjects().filter(s => s.id !== id);
  setItem(STORAGE_KEYS.SUBJECTS, subjects);

  // Also delete related sessions
  const sessions = getSessions().filter(s => s.subjectId !== id);
  setItem(STORAGE_KEYS.SESSIONS, sessions);

  debouncedFirebaseSync();
}

// Events CRUD
export function getEvents() {
  return getItem(STORAGE_KEYS.EVENTS) || [];
}

export function getEvent(id) {
  const events = getEvents();
  return events.find(e => e.id === id);
}

export function getEventByDate(date) {
  const events = getEvents();
  return events.find(e => e.date === date);
}

export function saveEvent(event) {
  const events = getEvents();
  const index = events.findIndex(e => e.id === event.id);

  if (index >= 0) {
    events[index] = event;
  } else {
    event.id = event.id || generateId();
    events.push(event);
  }

  const result = setItem(STORAGE_KEYS.EVENTS, events) ? event : null;
  if (result) debouncedFirebaseSync();
  return result;
}

export function deleteEvent(id) {
  const events = getEvents().filter(e => e.id !== id);
  setItem(STORAGE_KEYS.EVENTS, events);
  debouncedFirebaseSync();
}

// Sessions CRUD
export function getSessions() {
  return getItem(STORAGE_KEYS.SESSIONS) || [];
}

export function getSession(id) {
  const sessions = getSessions();
  return sessions.find(s => s.id === id);
}

export function getSessionsByDate(date) {
  const sessions = getSessions();
  return sessions.filter(s => s.date === date);
}

export function getSessionsByDateRange(startDate, endDate) {
  const sessions = getSessions();
  return sessions.filter(s => s.date >= startDate && s.date <= endDate);
}

export function saveSession(session) {
  const sessions = getSessions();
  const index = sessions.findIndex(s => s.id === session.id);

  if (index >= 0) {
    sessions[index] = session;
  } else {
    session.id = session.id || generateId();
    sessions.push(session);
  }

  const result = setItem(STORAGE_KEYS.SESSIONS, sessions) ? session : null;
  if (result) debouncedFirebaseSync();
  return result;
}

export function deleteSession(id) {
  const sessions = getSessions().filter(s => s.id !== id);
  setItem(STORAGE_KEYS.SESSIONS, sessions);
  debouncedFirebaseSync();
}

export function deleteSessionsByDate(date) {
  const sessions = getSessions().filter(s => s.date !== date);
  setItem(STORAGE_KEYS.SESSIONS, sessions);
  debouncedFirebaseSync();
}

// Settings
export function getSettings() {
  return getItem(STORAGE_KEYS.SETTINGS) || {
    dailyStartTime: '08:30',
    dailyEndTime: '20:00',
    breakDuration: 30, // minutes
    preferredSlots: ['morning', 'afternoon']
  };
}

export function saveSettings(settings) {
  const result = setItem(STORAGE_KEYS.SETTINGS, settings);
  if (result) debouncedFirebaseSync();
  return result;
}

// Clear all data
export function clearAllData() {
  localStorage.removeItem(STORAGE_KEYS.SUBJECTS);
  localStorage.removeItem(STORAGE_KEYS.EVENTS);
  localStorage.removeItem(STORAGE_KEYS.SESSIONS);
  console.log('All data cleared');
}

// Export all data to JSON
export function exportData() {
  const user = getCurrentUser();
  const data = {
    version: '1.1',
    exportedAt: new Date().toISOString(),
    userId: user.id,
    userName: user.name,
    subjects: getSubjects(),
    events: getEvents(),
    sessions: getSessions(),
    settings: getSettings()
  };
  return JSON.stringify(data, null, 2);
}

// Import data from JSON
export function importData(jsonString) {
  try {
    const data = JSON.parse(jsonString);

    if (!data.subjects || !Array.isArray(data.subjects)) {
      throw new Error('Invalid data format: missing subjects');
    }

    // Clear existing data
    clearAllData();

    // Import each type
    if (data.subjects) setItem(STORAGE_KEYS.SUBJECTS, data.subjects);
    if (data.events) setItem(STORAGE_KEYS.EVENTS, data.events);
    if (data.sessions) setItem(STORAGE_KEYS.SESSIONS, data.sessions);
    if (data.settings) setItem(STORAGE_KEYS.SETTINGS, data.settings);

    console.log('Data imported successfully');
    return { success: true, message: `Imported ${data.subjects.length} subjects, ${(data.sessions || []).length} sessions` };
  } catch (e) {
    console.error('Import error:', e);
    return { success: false, message: e.message };
  }
}

// Download data as JSON file
export function downloadDataAsFile() {
  const user = getCurrentUser();
  const data = exportData();
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  // Filename format for easy commit to repo: data/users/anna.json
  a.download = `${user.id}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Auto-load data from server file (for deployment)
export async function autoLoadUserData(userId) {
  const filePath = `data/users/${userId}.json`;

  try {
    const response = await fetch(filePath);
    if (!response.ok) {
      console.log(`No saved data found for ${userId} at ${filePath}`);
      return { loaded: false, reason: 'file_not_found' };
    }

    const jsonText = await response.text();
    const result = importData(jsonText);

    if (result.success) {
      console.log(`Auto-loaded data for ${userId} from ${filePath}`);
      return { loaded: true, message: result.message };
    } else {
      return { loaded: false, reason: result.message };
    }
  } catch (e) {
    console.log(`Could not auto-load data for ${userId}:`, e.message);
    return { loaded: false, reason: e.message };
  }
}

// Check if user has any data in localStorage
export function userHasData(userId) {
  const key = `sumSched_${userId}_subjects`;
  const data = localStorage.getItem(key);
  return data && JSON.parse(data).length > 0;
}

// GitHub API configuration
const GITHUB_CONFIG = {
  owner: 'hangdo0524',
  repo: 'sum-sched',
  branch: 'main'
};

// Get/Set GitHub token
export function getGitHubToken() {
  return localStorage.getItem('sumSched_github_token');
}

export function setGitHubToken(token) {
  localStorage.setItem('sumSched_github_token', token);
}

// Save data to GitHub
export async function saveToGitHub(userId) {
  const token = getGitHubToken();
  if (!token) {
    const newToken = prompt(
      'Nhập GitHub Personal Access Token:\n\n' +
      '1. Vào https://github.com/settings/tokens\n' +
      '2. Generate new token (classic)\n' +
      '3. Chọn scope: repo\n' +
      '4. Copy token và paste vào đây:'
    );
    if (!newToken) return { success: false, message: 'Cần token để lưu' };
    setGitHubToken(newToken);
    return saveToGitHub(userId); // Retry with new token
  }

  const filePath = `data/users/${userId}.json`;
  const content = exportData();
  const apiUrl = `https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}/contents/${filePath}`;

  try {
    // Get current file SHA (needed for update)
    let sha = null;
    const getResponse = await fetch(apiUrl, {
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (getResponse.ok) {
      const fileData = await getResponse.json();
      sha = fileData.sha;
    }

    // Update/Create file
    const putResponse = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `Update ${userId} schedule data`,
        content: btoa(unescape(encodeURIComponent(content))),
        sha: sha,
        branch: GITHUB_CONFIG.branch
      })
    });

    if (putResponse.ok) {
      return { success: true, message: 'Đã lưu lên GitHub!' };
    } else {
      const error = await putResponse.json();
      if (putResponse.status === 401) {
        setGitHubToken(null); // Clear invalid token
        return { success: false, message: 'Token không hợp lệ. Vui lòng nhập lại.' };
      }
      return { success: false, message: error.message || 'Lỗi khi lưu' };
    }
  } catch (e) {
    return { success: false, message: e.message };
  }
}

// Sample Data (for demo)
// Subject categories
export const SUBJECT_CATEGORIES = {
  academic: { label: '📚 Học thuật', color: '#3b82f6' },
  art: { label: '🎨 Nghệ thuật', color: '#ec4899' },
  physical: { label: '🏃 Thể chất', color: '#10b981' }
};

export function loadSampleData() {
  const subjects = [
    {
      id: 'subj_1',
      name: 'Bài hè Toán',
      category: 'academic',
      type: 'self-study',
      slotDuration: 2,
      color: '#ef4444',
      config: {
        duration: 2,
        sessionsPerWeek: 5
      }
    },
    {
      id: 'subj_2',
      name: 'Bài hè Tiếng Việt',
      category: 'academic',
      type: 'self-study',
      slotDuration: 2,
      color: '#f59e0b',
      config: {
        duration: 2,
        sessionsPerWeek: 5
      }
    },
    {
      id: 'subj_3',
      name: 'Bài hè Tiếng Anh',
      category: 'academic',
      type: 'self-study',
      slotDuration: 2,
      color: '#10b981',
      config: {
        duration: 2,
        sessionsPerWeek: 5
      }
    },
    {
      id: 'subj_4',
      name: 'Tiếng Anh Online 1:1',
      category: 'academic',
      type: 'fixed',
      slotDuration: 1,
      color: '#3b82f6',
      schedule: [
        { day: 2, startTime: '19:00', endTime: '20:00', selected: true },
        { day: 4, startTime: '19:00', endTime: '20:00', selected: true },
        { day: 6, startTime: '10:00', endTime: '11:00', selected: false }
      ]
    },
    {
      id: 'subj_5',
      name: 'Toán MathX',
      category: 'academic',
      type: 'fixed',
      slotDuration: 1.5,
      color: '#8b5cf6',
      schedule: [
        { day: 3, startTime: '09:00', endTime: '10:30', selected: true }
      ],
      extraSelfStudy: {
        enabled: true,
        duration: 1.5,
        sessionsPerWeek: 3,
        preferredSlots: ['early', 'morning', 'afternoon']
      }
    },
    {
      id: 'subj_6',
      name: 'Học Bơi',
      category: 'physical',
      type: 'fixed',
      slotDuration: 1,
      color: '#06b6d4',
      schedule: [
        { day: 2, startTime: '17:00', endTime: '18:00', selected: true },
        { day: 4, startTime: '17:00', endTime: '18:00', selected: true },
        { day: 6, startTime: '08:00', endTime: '09:00', selected: true }
      ]
    },
    {
      id: 'subj_7',
      name: 'Học Vẽ',
      category: 'art',
      type: 'weekly-pick',
      slotDuration: 1.5,
      color: '#ec4899',
      config: {
        requiredSessions: 0,
        targetSessions: 2
      },
      schedule: [
        { day: 4, startTime: '17:30', endTime: '19:00', selected: false },
        { day: 5, startTime: '17:30', endTime: '19:00', selected: false },
        { day: 6, startTime: '09:00', endTime: '10:30', selected: false },
        { day: 6, startTime: '17:00', endTime: '18:30', selected: false },
        { day: 0, startTime: '17:00', endTime: '18:30', selected: false }
      ]
    },
    {
      id: 'subj_8',
      name: 'Học Võ Taekwondo',
      category: 'physical',
      type: 'fixed-plus',
      slotDuration: 1.25,
      color: '#f97316',
      config: {
        requiredSessions: 2,
        targetSessions: 3,
        location: 'Gold Silk Vạn Phúc - Hà Đông',
        phone: '058.440.6711'
      },
      schedule: [
        { day: 2, startTime: '17:45', endTime: '19:00', selected: true },
        { day: 4, startTime: '17:45', endTime: '19:00', selected: true },
        { day: 5, startTime: '17:45', endTime: '19:00', selected: false },
        { day: 6, startTime: '09:30', endTime: '11:00', selected: false },
        { day: 6, startTime: '18:00', endTime: '19:30', selected: false },
        { day: 0, startTime: '15:30', endTime: '17:00', selected: false }
      ]
    }
  ];

  setItem(STORAGE_KEYS.SUBJECTS, subjects);
  console.log('Sample data loaded');
}

// Force sync to Firebase (for manual trigger)
export async function forceSyncToFirebase() {
  if (!currentUserId) return { success: false, message: 'No user' };
  syncInProgress = true;

  const data = {
    subjects: getSubjects(),
    events: getEvents(),
    sessions: getSessions(),
    settings: getSettings()
  };

  const success = await saveToFirebase(currentUserId, data);
  syncInProgress = false;

  return { success, message: success ? 'Đã đồng bộ lên Firebase!' : 'Lỗi khi đồng bộ' };
}

// Export all
export default {
  // User management
  setParentUserId,
  getUsers,
  addUser,
  deleteUser,
  getCurrentUserId,
  setCurrentUser,
  getCurrentUser,
  // Data CRUD
  getSubjects,
  getSubject,
  saveSubject,
  deleteSubject,
  getEvents,
  getEvent,
  getEventByDate,
  saveEvent,
  deleteEvent,
  getSessions,
  getSession,
  getSessionsByDate,
  getSessionsByDateRange,
  saveSession,
  deleteSession,
  deleteSessionsByDate,
  getSettings,
  saveSettings,
  clearAllData,
  loadSampleData,
  generateId,
  exportData,
  importData,
  downloadDataAsFile,
  autoLoadUserData,
  userHasData,
  saveToGitHub,
  getGitHubToken,
  setGitHubToken,
  onFirebaseDataUpdate,
  forceSyncToFirebase
};
