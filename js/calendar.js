/**
 * Calendar Management Module
 * Handles multiple calendars (summer, school year, etc.)
 */

import { getDatabase, ref, set, get, push, remove, onValue } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js';

let db = null;
let currentCalendarId = null;
let calendarsCache = [];
let onCalendarChangeCallback = null;

export function initCalendarModule(database) {
  db = database;
}

export function setOnCalendarChange(callback) {
  onCalendarChangeCallback = callback;
}

export function getCurrentCalendarId() {
  return currentCalendarId;
}

export function setCurrentCalendar(calendarId) {
  currentCalendarId = calendarId;
  localStorage.setItem('sumSched_currentCalendar', calendarId);
  if (onCalendarChangeCallback) {
    onCalendarChangeCallback(calendarId);
  }
}

// Calendar CRUD
export async function getCalendars(userId) {
  if (!db || !userId) return [];

  const calendarsRef = ref(db, 'calendars');
  try {
    const snapshot = await get(calendarsRef);
    if (snapshot.exists()) {
      const allCalendars = snapshot.val();
      // Filter by owner
      const userCalendars = Object.entries(allCalendars)
        .filter(([id, cal]) => cal.ownerId === userId)
        .map(([id, cal]) => ({ id, ...cal }));
      calendarsCache = userCalendars;
      return userCalendars;
    }
    return [];
  } catch (error) {
    console.error('Error fetching calendars:', error);
    return [];
  }
}

export async function getCalendar(calendarId) {
  if (!db || !calendarId) return null;

  const calendarRef = ref(db, `calendars/${calendarId}`);
  try {
    const snapshot = await get(calendarRef);
    if (snapshot.exists()) {
      return { id: calendarId, ...snapshot.val() };
    }
    return null;
  } catch (error) {
    console.error('Error fetching calendar:', error);
    return null;
  }
}

export async function createCalendar(userId, calendarData) {
  if (!db || !userId) return null;

  const calendarsRef = ref(db, 'calendars');
  const newCalendarRef = push(calendarsRef);

  const calendar = {
    name: calendarData.name || 'Lịch mới',
    type: calendarData.type || 'summer',
    startDate: calendarData.startDate,
    endDate: calendarData.endDate,
    color: calendarData.color || '#6366f1',
    ownerId: userId,
    isActive: true,
    createdAt: new Date().toISOString()
  };

  try {
    await set(newCalendarRef, calendar);
    return { id: newCalendarRef.key, ...calendar };
  } catch (error) {
    console.error('Error creating calendar:', error);
    return null;
  }
}

export async function updateCalendar(calendarId, updates) {
  if (!db || !calendarId) return false;

  const calendarRef = ref(db, `calendars/${calendarId}`);
  try {
    const snapshot = await get(calendarRef);
    if (snapshot.exists()) {
      const current = snapshot.val();
      await set(calendarRef, { ...current, ...updates, updatedAt: new Date().toISOString() });
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error updating calendar:', error);
    return false;
  }
}

export async function deleteCalendar(calendarId) {
  if (!db || !calendarId) return false;

  try {
    // Delete calendar
    await remove(ref(db, `calendars/${calendarId}`));
    // Delete associated subjects
    await remove(ref(db, `subjects/${calendarId}`));
    // Delete associated sessions
    await remove(ref(db, `sessions/${calendarId}`));
    return true;
  } catch (error) {
    console.error('Error deleting calendar:', error);
    return false;
  }
}

// Calendar types
export const CALENDAR_TYPES = {
  summer: { label: '☀️ Lịch hè', color: '#f59e0b' },
  school: { label: '📚 Năm học', color: '#3b82f6' },
  extra: { label: '📝 Bổ sung', color: '#8b5cf6' },
  camp: { label: '🏕️ Trại hè', color: '#10b981' }
};

// Get active calendar based on current date
export function getActiveCalendar(calendars) {
  const today = new Date().toISOString().split('T')[0];

  // Find calendar that contains today
  const active = calendars.find(cal =>
    cal.isActive && cal.startDate <= today && cal.endDate >= today
  );

  if (active) return active;

  // Fallback to most recent calendar
  return calendars.sort((a, b) =>
    new Date(b.createdAt) - new Date(a.createdAt)
  )[0] || null;
}

// Check if date is within calendar range
export function isDateInCalendar(dateStr, calendar) {
  if (!calendar) return true;
  return dateStr >= calendar.startDate && dateStr <= calendar.endDate;
}

export default {
  initCalendarModule,
  setOnCalendarChange,
  getCurrentCalendarId,
  setCurrentCalendar,
  getCalendars,
  getCalendar,
  createCalendar,
  updateCalendar,
  deleteCalendar,
  getActiveCalendar,
  isDateInCalendar,
  CALENDAR_TYPES
};
