/**
 * Auto-Schedule Algorithm
 * Tự động phân bổ môn học linh hoạt vào các slot trống
 */

import { getSubjects, getEvents, getSessions, saveSession, getSettings, generateId } from './data.js';

const DAY_NAMES = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

export function formatDate(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseDate(dateStr) {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday as first day
  return new Date(d.setDate(diff));
}

export function getWeekDates(date) {
  const start = getWeekStart(date);
  const dates = [];
  for (let i = 0; i < 7; i++) {
    dates.push(formatDate(addDays(start, i)));
  }
  return dates;
}

export function getDayOfWeek(dateStr) {
  return parseDate(dateStr).getDay();
}

export function formatDateDisplay(dateStr) {
  const date = parseDate(dateStr);
  const day = DAY_NAMES[date.getDay()];
  return `${day} ${date.getDate()}/${date.getMonth() + 1}`;
}

export function isToday(dateStr) {
  return formatDate(new Date()) === dateStr;
}

function timeToMinutes(time) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function addHoursToTime(time, hours) {
  const minutes = timeToMinutes(time) + hours * 60;
  return minutesToTime(minutes);
}

function getFixedSessionsForDate(dateStr, subjects) {
  const dayOfWeek = getDayOfWeek(dateStr);
  const sessions = [];

  // Get fixed sessions from 'fixed' and 'hybrid' type subjects
  subjects.filter(s => (s.type === 'fixed' || s.type === 'hybrid') && s.schedule).forEach(subject => {
    subject.schedule.forEach(slot => {
      if (slot.day === dayOfWeek) {
        const endTime = slot.endTime || addHoursToTime(slot.startTime, subject.slotDuration || 1.5);
        const duration = (timeToMinutes(endTime) - timeToMinutes(slot.startTime)) / 60;
        sessions.push({
          subjectId: subject.id,
          subjectName: subject.name,
          startTime: slot.startTime,
          endTime: endTime,
          duration: duration,
          color: subject.color,
          isFixed: true
        });
      }
    });
  });

  return sessions.sort((a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
}

function findFreeSlots(fixedSessions, settings) {
  const slots = [];
  const dayStart = timeToMinutes(settings.dailyStartTime || '08:00');
  const dayEnd = timeToMinutes(settings.dailyEndTime || '20:00');
  const breakDuration = settings.breakDuration || 30;

  let currentTime = dayStart;

  fixedSessions.forEach(session => {
    const sessionStart = timeToMinutes(session.startTime);
    const sessionEnd = timeToMinutes(session.endTime);

    if (currentTime + 60 < sessionStart) { // At least 1 hour gap
      slots.push({
        startTime: minutesToTime(currentTime),
        endTime: minutesToTime(sessionStart - breakDuration),
        duration: (sessionStart - breakDuration - currentTime) / 60
      });
    }

    currentTime = sessionEnd + breakDuration;
  });

  // After last fixed session
  if (currentTime + 60 < dayEnd) {
    slots.push({
      startTime: minutesToTime(currentTime),
      endTime: minutesToTime(dayEnd),
      duration: (dayEnd - currentTime) / 60
    });
  }

  return slots;
}

const TIME_SLOTS = {
  morning: { start: '08:00', end: '11:30' },
  afternoon: { start: '14:00', end: '17:00' },
  evening: { start: '19:00', end: '21:00' }
};

export function generateWeekSchedule(weekStartDate) {
  const subjects = getSubjects();
  const events = getEvents();
  const existingSessions = getSessions();
  const settings = getSettings();

  const weekDates = getWeekDates(weekStartDate);
  const schedule = {};

  // Track sessions per subject per week for flexible scheduling
  const flexibleSessionCounts = {};
  subjects.forEach(s => {
    if (s.type === 'flexible' || s.type === 'semi-flexible' || s.type === 'hybrid') {
      flexibleSessionCounts[s.id] = 0;
    }
  });

  weekDates.forEach(dateStr => {
    schedule[dateStr] = {
      date: dateStr,
      dayName: formatDateDisplay(dateStr),
      isToday: isToday(dateStr),
      event: events.find(e => e.date === dateStr),
      sessions: []
    };

    // Skip if there's a holiday/trip event
    if (schedule[dateStr].event && ['holiday', 'trip'].includes(schedule[dateStr].event.type)) {
      return;
    }

    // Get fixed sessions for this day (from fixed and hybrid subjects)
    const fixedSessions = getFixedSessionsForDate(dateStr, subjects);

    // Add fixed sessions
    fixedSessions.forEach(session => {
      const existing = existingSessions.find(
        s => s.subjectId === session.subjectId && s.date === dateStr && s.startTime === session.startTime
      );

      schedule[dateStr].sessions.push({
        id: existing?.id || generateId(),
        subjectId: session.subjectId,
        subjectName: session.subjectName,
        date: dateStr,
        startTime: session.startTime,
        endTime: session.endTime,
        duration: session.duration,
        color: session.color,
        status: existing?.status || 'pending',
        notes: existing?.notes || '',
        isFixed: true
      });
    });

    // Find free slots
    const freeSlots = findFreeSlots(fixedSessions, settings);

    // Get flexible subjects that still need sessions this week
    const flexibleSubjects = subjects.filter(s => {
      if (s.type === 'flexible' || s.type === 'semi-flexible') {
        const target = s.flexibleConfig?.sessionsPerWeek || 3;
        return flexibleSessionCounts[s.id] < target;
      }
      if (s.type === 'hybrid') {
        const target = s.flexibleConfig?.sessionsPerWeek || 0;
        return flexibleSessionCounts[s.id] < target;
      }
      return false;
    });

    // Fill free slots with flexible subjects
    freeSlots.forEach(slot => {
      for (const subject of flexibleSubjects) {
        const config = subject.flexibleConfig || {};
        const duration = config.duration || subject.slotDuration || 2;
        const targetSessions = config.sessionsPerWeek || 3;

        if (flexibleSessionCounts[subject.id] >= targetSessions) continue;
        if (slot.duration < duration) continue;

        // For semi-flexible: check if slot falls within preferred time slots
        if (subject.type === 'semi-flexible' && config.timeSlots) {
          const slotStartMin = timeToMinutes(slot.startTime);
          const isInPreferredSlot = config.timeSlots.some(ts => {
            const tsConfig = TIME_SLOTS[ts];
            return slotStartMin >= timeToMinutes(tsConfig.start) &&
                   slotStartMin < timeToMinutes(tsConfig.end);
          });
          if (!isInPreferredSlot) continue;
        }

        const existing = existingSessions.find(
          s => s.subjectId === subject.id && s.date === dateStr && s.startTime === slot.startTime
        );

        schedule[dateStr].sessions.push({
          id: existing?.id || generateId(),
          subjectId: subject.id,
          subjectName: subject.name,
          date: dateStr,
          startTime: slot.startTime,
          endTime: addHoursToTime(slot.startTime, duration),
          duration: duration,
          color: subject.color,
          status: existing?.status || 'pending',
          notes: existing?.notes || '',
          isFixed: false
        });

        slot.startTime = addHoursToTime(slot.startTime, duration + 0.5);
        slot.duration -= duration + 0.5;
        flexibleSessionCounts[subject.id]++;
        break;
      }
    });

    // Sort sessions by start time
    schedule[dateStr].sessions.sort((a, b) =>
      timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
    );
  });

  return schedule;
}

export function saveGeneratedSessions(schedule) {
  Object.values(schedule).forEach(day => {
    day.sessions.forEach(session => {
      saveSession({
        id: session.id,
        subjectId: session.subjectId,
        date: session.date,
        startTime: session.startTime,
        endTime: session.endTime,
        status: session.status,
        notes: session.notes
      });
    });
  });
}

export default {
  formatDate,
  parseDate,
  addDays,
  getWeekStart,
  getWeekDates,
  getDayOfWeek,
  formatDateDisplay,
  isToday,
  generateWeekSchedule,
  saveGeneratedSessions
};
