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

  subjects.filter(s => s.type === 'fixed' && s.schedule).forEach(subject => {
    subject.schedule.forEach(slot => {
      if (slot.day === dayOfWeek) {
        sessions.push({
          subjectId: subject.id,
          subjectName: subject.name,
          startTime: slot.startTime,
          endTime: addHoursToTime(slot.startTime, subject.slotDuration),
          duration: subject.slotDuration,
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

export function generateWeekSchedule(weekStartDate) {
  const subjects = getSubjects();
  const events = getEvents();
  const existingSessions = getSessions();
  const settings = getSettings();

  const weekDates = getWeekDates(weekStartDate);
  const flexibleSubjects = subjects.filter(s => s.type === 'flexible');
  const schedule = {};

  let flexIndex = 0;

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

    // Get fixed sessions for this day
    const fixedSessions = getFixedSessionsForDate(dateStr, subjects);

    // Add fixed sessions
    fixedSessions.forEach(session => {
      const existing = existingSessions.find(
        s => s.subjectId === session.subjectId && s.date === dateStr
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

    // Find free slots and fill with flexible subjects
    const freeSlots = findFreeSlots(fixedSessions, settings);

    freeSlots.forEach(slot => {
      // Try to fit flexible subjects
      for (let i = 0; i < flexibleSubjects.length && slot.duration >= 1.5; i++) {
        const subjectIdx = (flexIndex + i) % flexibleSubjects.length;
        const subject = flexibleSubjects[subjectIdx];

        if (slot.duration >= subject.slotDuration) {
          const existing = existingSessions.find(
            s => s.subjectId === subject.id && s.date === dateStr && s.startTime === slot.startTime
          );

          schedule[dateStr].sessions.push({
            id: existing?.id || generateId(),
            subjectId: subject.id,
            subjectName: subject.name,
            date: dateStr,
            startTime: slot.startTime,
            endTime: addHoursToTime(slot.startTime, subject.slotDuration),
            duration: subject.slotDuration,
            color: subject.color,
            status: existing?.status || 'pending',
            notes: existing?.notes || '',
            isFixed: false
          });

          slot.startTime = addHoursToTime(slot.startTime, subject.slotDuration + 0.5);
          slot.duration -= subject.slotDuration + 0.5;
          flexIndex = (subjectIdx + 1) % flexibleSubjects.length;
          break;
        }
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
