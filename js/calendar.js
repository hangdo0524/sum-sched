/**
 * Calendar Management Module
 * Handles multiple calendars (summer, school year, etc.)
 */

import { db } from './firebase-config.js';
import { ref, set, get, push, remove, onValue } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js';

let currentCalendarId = null;
let calendarsCache = [];
let onCalendarChangeCallback = null;

export function setOnCalendarChange(callback) {
  onCalendarChangeCallback = callback;
}

export function getCurrentCalendarId() {
  return currentCalendarId || localStorage.getItem('sumSched_currentCalendar');
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
  if (!db || !userId) {
    // Fallback to localStorage
    return getCalendarsFromLocal();
  }

  const calendarsRef = ref(db, `calendars/${userId}`);
  try {
    const snapshot = await get(calendarsRef);
    if (snapshot.exists()) {
      const data = snapshot.val();
      const calendars = Object.entries(data).map(([id, cal]) => ({ id, ...cal }));
      calendarsCache = calendars;
      // Sync to localStorage
      localStorage.setItem('sumSched_calendars', JSON.stringify(calendars));
      return calendars;
    }
    return getCalendarsFromLocal();
  } catch (error) {
    console.error('Error fetching calendars:', error);
    return getCalendarsFromLocal();
  }
}

function getCalendarsFromLocal() {
  try {
    const data = localStorage.getItem('sumSched_calendars');
    return data ? JSON.parse(data) : getDefaultCalendars();
  } catch (e) {
    return getDefaultCalendars();
  }
}

function getDefaultCalendars() {
  const year = new Date().getFullYear();
  return [{
    id: 'default_summer',
    name: `Lịch học hè ${year}`,
    type: 'summer',
    startDate: `${year}-06-01`,
    endDate: `${year}-08-31`,
    color: '#f59e0b',
    isActive: true,
    createdAt: new Date().toISOString()
  }];
}

export async function getCalendar(calendarId) {
  const calendars = calendarsCache.length > 0 ? calendarsCache : await getCalendars();
  return calendars.find(c => c.id === calendarId) || null;
}

export async function createCalendar(userId, calendarData) {
  const calendar = {
    name: calendarData.name || 'Lịch mới',
    type: calendarData.type || 'summer',
    startDate: calendarData.startDate,
    endDate: calendarData.endDate,
    color: calendarData.color || '#6366f1',
    isActive: true,
    createdAt: new Date().toISOString()
  };

  if (!db || !userId) {
    // Fallback to localStorage
    const id = 'cal_' + Date.now().toString(36);
    const calendars = getCalendarsFromLocal();
    calendars.push({ id, ...calendar });
    localStorage.setItem('sumSched_calendars', JSON.stringify(calendars));
    calendarsCache = calendars;
    return { id, ...calendar };
  }

  const calendarsRef = ref(db, `calendars/${userId}`);
  const newCalendarRef = push(calendarsRef);

  try {
    await set(newCalendarRef, calendar);
    const newCal = { id: newCalendarRef.key, ...calendar };
    calendarsCache.push(newCal);
    return newCal;
  } catch (error) {
    console.error('Error creating calendar:', error);
    return null;
  }
}

export async function updateCalendar(userId, calendarId, updates) {
  if (!db || !userId) {
    // Fallback to localStorage
    const calendars = getCalendarsFromLocal();
    const index = calendars.findIndex(c => c.id === calendarId);
    if (index >= 0) {
      calendars[index] = { ...calendars[index], ...updates };
      localStorage.setItem('sumSched_calendars', JSON.stringify(calendars));
      calendarsCache = calendars;
      return true;
    }
    return false;
  }

  const calendarRef = ref(db, `calendars/${userId}/${calendarId}`);
  try {
    const snapshot = await get(calendarRef);
    if (snapshot.exists()) {
      const current = snapshot.val();
      await set(calendarRef, { ...current, ...updates, updatedAt: new Date().toISOString() });
      // Update cache
      const index = calendarsCache.findIndex(c => c.id === calendarId);
      if (index >= 0) {
        calendarsCache[index] = { ...calendarsCache[index], ...updates };
      }
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error updating calendar:', error);
    return false;
  }
}

export async function deleteCalendar(userId, calendarId) {
  if (!db || !userId) {
    // Fallback to localStorage
    const calendars = getCalendarsFromLocal().filter(c => c.id !== calendarId);
    localStorage.setItem('sumSched_calendars', JSON.stringify(calendars));
    calendarsCache = calendars;
    return true;
  }

  try {
    await remove(ref(db, `calendars/${userId}/${calendarId}`));
    calendarsCache = calendarsCache.filter(c => c.id !== calendarId);
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

// Render calendar list in dropdown
export function renderCalendarList(calendars, currentId, container) {
  if (!container) return;

  const typeIcons = {
    summer: '☀️',
    school: '📚',
    extra: '📝',
    camp: '🏕️'
  };

  container.innerHTML = calendars.map(cal => {
    const icon = typeIcons[cal.type] || '📅';
    const isActive = cal.id === currentId;
    const startDate = new Date(cal.startDate);
    const endDate = new Date(cal.endDate);
    const dateRange = `${startDate.getDate()}/${startDate.getMonth() + 1} - ${endDate.getDate()}/${endDate.getMonth() + 1}`;

    return `
      <div class="calendar-dropdown__item ${isActive ? 'calendar-dropdown__item--active' : ''}" data-calendar-id="${cal.id}">
        <span class="calendar-dropdown__item-icon">${icon}</span>
        <div class="calendar-dropdown__item-info">
          <div class="calendar-dropdown__item-name">${cal.name}</div>
          <div class="calendar-dropdown__item-dates">${dateRange}</div>
        </div>
      </div>
    `;
  }).join('');
}

export default {
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
  renderCalendarList,
  CALENDAR_TYPES
};
