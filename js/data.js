/**
 * Data Management Module - LocalStorage CRUD
 */

const STORAGE_KEYS = {
  SUBJECTS: 'sumSched_subjects',
  EVENTS: 'sumSched_events',
  SESSIONS: 'sumSched_sessions',
  SETTINGS: 'sumSched_settings'
};

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

  return setItem(STORAGE_KEYS.SUBJECTS, subjects) ? subject : null;
}

export function deleteSubject(id) {
  const subjects = getSubjects().filter(s => s.id !== id);
  setItem(STORAGE_KEYS.SUBJECTS, subjects);

  // Also delete related sessions
  const sessions = getSessions().filter(s => s.subjectId !== id);
  setItem(STORAGE_KEYS.SESSIONS, sessions);
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

  return setItem(STORAGE_KEYS.EVENTS, events) ? event : null;
}

export function deleteEvent(id) {
  const events = getEvents().filter(e => e.id !== id);
  setItem(STORAGE_KEYS.EVENTS, events);
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

  return setItem(STORAGE_KEYS.SESSIONS, sessions) ? session : null;
}

export function deleteSession(id) {
  const sessions = getSessions().filter(s => s.id !== id);
  setItem(STORAGE_KEYS.SESSIONS, sessions);
}

export function deleteSessionsByDate(date) {
  const sessions = getSessions().filter(s => s.date !== date);
  setItem(STORAGE_KEYS.SESSIONS, sessions);
}

// Settings
export function getSettings() {
  return getItem(STORAGE_KEYS.SETTINGS) || {
    dailyStartTime: '08:00',
    dailyEndTime: '20:00',
    breakDuration: 30, // minutes
    preferredSlots: ['morning', 'afternoon']
  };
}

export function saveSettings(settings) {
  return setItem(STORAGE_KEYS.SETTINGS, settings);
}

// Clear all data
export function clearAllData() {
  localStorage.removeItem(STORAGE_KEYS.SUBJECTS);
  localStorage.removeItem(STORAGE_KEYS.EVENTS);
  localStorage.removeItem(STORAGE_KEYS.SESSIONS);
  console.log('All data cleared');
}

// Sample Data (for demo)
export function loadSampleData() {
  const subjects = [
    {
      id: 'subj_1',
      name: 'Bài hè Toán',
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
      type: 'fixed',
      slotDuration: 1,
      color: '#3b82f6',
      schedule: [
        { day: 2, startTime: '19:00', endTime: '20:00', selected: true },
        { day: 4, startTime: '19:00', endTime: '20:00', selected: true },
        { day: 6, startTime: '10:00', endTime: '11:00', selected: false } // Available but not chosen
      ]
    },
    {
      id: 'subj_5',
      name: 'Toán MathX',
      type: 'fixed',
      slotDuration: 1.5,
      color: '#8b5cf6',
      schedule: [
        { day: 1, startTime: '09:00', endTime: '10:30', selected: true },
        { day: 3, startTime: '09:00', endTime: '10:30', selected: true },
        { day: 5, startTime: '09:00', endTime: '10:30', selected: true },
        { day: 6, startTime: '09:00', endTime: '10:30', selected: false } // Available on Saturday too
      ]
    },
    {
      id: 'subj_6',
      name: 'Học Bơi',
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
      type: 'fixed-plus',
      slotDuration: 1.5,
      color: '#f97316',
      config: {
        requiredSessions: 2,
        targetSessions: 3
      },
      schedule: [
        { day: 1, startTime: '18:00', endTime: '19:30', selected: true },
        { day: 3, startTime: '18:00', endTime: '19:30', selected: true },
        { day: 5, startTime: '18:00', endTime: '19:30', selected: false },
        { day: 6, startTime: '09:30', endTime: '11:00', selected: false },
        { day: 6, startTime: '18:00', endTime: '19:30', selected: false },
        { day: 0, startTime: '16:15', endTime: '17:45', selected: false }
      ]
    }
  ];

  setItem(STORAGE_KEYS.SUBJECTS, subjects);
  console.log('Sample data loaded');
}

// Export all
export default {
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
  generateId
};
