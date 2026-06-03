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
  morning: { start: '08:00', end: '11:30', label: 'Sáng' },
  afternoon: { start: '14:00', end: '17:00', label: 'Chiều' },
  evening: { start: '19:00', end: '21:00', label: 'Tối' }
};

// Subject categories for smart scheduling
const SUBJECT_CATEGORIES = {
  brain: ['toán', 'math', 'tiếng việt', 'tiếng anh', 'english', 'khoa học', 'science'],
  physical: ['bơi', 'swim', 'võ', 'martial', 'thể dục', 'sport'],
  art: ['vẽ', 'draw', 'paint', 'nhạc', 'music', 'đàn', 'piano'],
  academic: ['bài hè', 'homework', 'ôn tập', 'review', 'sách']
};

function categorizeSubject(name) {
  const lower = name.toLowerCase();
  for (const [category, keywords] of Object.entries(SUBJECT_CATEGORIES)) {
    if (keywords.some(kw => lower.includes(kw))) {
      return category;
    }
  }
  return 'other';
}

export function generateWeekSchedule(weekStartDate) {
  const subjects = getSubjects();
  const events = getEvents();
  const existingSessions = getSessions();

  const weekDates = getWeekDates(weekStartDate);
  const schedule = {};

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

    // Get ONLY fixed sessions (no auto-scheduling flexible)
    const fixedSessions = getFixedSessionsForDate(dateStr, subjects);

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

    // Also add confirmed flexible sessions from storage
    const confirmedFlexible = existingSessions.filter(
      s => s.date === dateStr && !fixedSessions.some(f => f.subjectId === s.subjectId && f.startTime === s.startTime)
    );

    confirmedFlexible.forEach(session => {
      const subject = subjects.find(sub => sub.id === session.subjectId);
      if (subject && (subject.type === 'flexible' || subject.type === 'semi-flexible' || subject.type === 'hybrid')) {
        schedule[dateStr].sessions.push({
          ...session,
          subjectName: subject.name,
          color: subject.color,
          isFixed: false
        });
      }
    });

    // Sort sessions by start time
    schedule[dateStr].sessions.sort((a, b) =>
      timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
    );
  });

  return schedule;
}

export function generateSmartSuggestions(weekStartDate) {
  const subjects = getSubjects();
  const events = getEvents();
  const existingSessions = getSessions();
  const settings = getSettings();

  const weekDates = getWeekDates(weekStartDate);
  const suggestions = [];

  // Get flexible subjects
  const flexibleSubjects = subjects.filter(s =>
    s.type === 'flexible' || s.type === 'semi-flexible' || s.type === 'hybrid'
  );

  if (flexibleSubjects.length === 0) return suggestions;

  // Track sessions per subject
  const sessionCounts = {};
  flexibleSubjects.forEach(s => sessionCounts[s.id] = 0);

  // Count existing confirmed sessions
  existingSessions.forEach(s => {
    if (sessionCounts[s.subjectId] !== undefined) {
      const sessionDate = s.date;
      if (weekDates.includes(sessionDate)) {
        sessionCounts[s.subjectId]++;
      }
    }
  });

  weekDates.forEach(dateStr => {
    const event = events.find(e => e.date === dateStr);
    if (event && ['holiday', 'trip'].includes(event.type)) return;

    // Get fixed sessions for this day
    const fixedSessions = getFixedSessionsForDate(dateStr, subjects);
    const freeSlots = findFreeSlots(fixedSessions, settings);

    // Analyze what categories are already scheduled today
    const todayCategories = fixedSessions.map(s => {
      const subject = subjects.find(sub => sub.id === s.subjectId);
      return categorizeSubject(subject?.name || '');
    });

    // Smart selection based on balance
    const needsBrain = !todayCategories.includes('brain') && !todayCategories.includes('academic');
    const needsPhysical = !todayCategories.includes('physical');
    const needsArt = !todayCategories.includes('art');

    for (const slot of freeSlots) {
      if (slot.duration < 1) continue;

      // Determine optimal time period
      const slotMinutes = timeToMinutes(slot.startTime);
      const isMorning = slotMinutes < timeToMinutes('12:00');
      const isAfternoon = slotMinutes >= timeToMinutes('14:00') && slotMinutes < timeToMinutes('17:00');
      const isEvening = slotMinutes >= timeToMinutes('19:00');

      // Find best subject for this slot
      for (const subject of flexibleSubjects) {
        const config = subject.flexibleConfig || {};
        const targetSessions = config.sessionsPerWeek || (subject.type === 'hybrid' ? 2 : 5);
        const duration = config.duration || subject.slotDuration || 2;

        if (sessionCounts[subject.id] >= targetSessions) continue;
        if (slot.duration < duration) continue;

        // Check if already has a session today
        const hasSessionToday = existingSessions.some(
          s => s.subjectId === subject.id && s.date === dateStr
        ) || suggestions.some(
          s => s.subjectId === subject.id && s.date === dateStr
        );
        if (hasSessionToday) continue;

        const category = categorizeSubject(subject.name);
        let reason = '';
        let priority = 0;

        // Smart reasoning
        if (isMorning) {
          if (category === 'brain' || category === 'academic') {
            reason = '🌅 Buổi sáng tập trung cao → phù hợp môn học thuật';
            priority = 10;
          } else if (category === 'physical') {
            reason = '🌅 Buổi sáng mát mẻ → tốt cho vận động';
            priority = 8;
          } else {
            reason = '🌅 Buổi sáng → học tập hiệu quả';
            priority = 5;
          }
        } else if (isAfternoon) {
          if (category === 'physical' && needsPhysical) {
            reason = '☀️ Xen kẽ sau học buổi sáng → thể chất giúp thư giãn';
            priority = 10;
          } else if (category === 'art' && needsArt) {
            reason = '🎨 Buổi chiều → sáng tạo, nghệ thuật';
            priority = 9;
          } else {
            reason = '☀️ Buổi chiều → học nhẹ nhàng';
            priority = 5;
          }
        } else if (isEvening) {
          if (category === 'art') {
            reason = '🌙 Buổi tối thư giãn → phù hợp nghệ thuật';
            priority = 8;
          } else if (category === 'brain' || category === 'academic') {
            reason = '🌙 Ôn lại bài buổi tối → củng cố kiến thức';
            priority = 6;
          } else {
            reason = '🌙 Buổi tối → hoạt động nhẹ';
            priority = 4;
          }
        }

        // Bonus for balance
        if ((category === 'brain' || category === 'academic') && needsBrain) {
          reason += ' • Cân bằng: chưa có môn học thuật hôm nay';
          priority += 3;
        }
        if (category === 'physical' && needsPhysical) {
          reason += ' • Cân bằng: chưa có vận động hôm nay';
          priority += 3;
        }
        if (category === 'art' && needsArt) {
          reason += ' • Cân bằng: chưa có nghệ thuật hôm nay';
          priority += 2;
        }

        suggestions.push({
          id: generateId(),
          subjectId: subject.id,
          subjectName: subject.name,
          color: subject.color,
          date: dateStr,
          dayName: formatDateDisplay(dateStr),
          startTime: slot.startTime,
          endTime: addHoursToTime(slot.startTime, duration),
          duration: duration,
          reason: reason,
          priority: priority,
          selected: true
        });

        sessionCounts[subject.id]++;
        slot.startTime = addHoursToTime(slot.startTime, duration + 0.5);
        slot.duration -= duration + 0.5;
        break;
      }
    }
  });

  // Sort by date then priority
  suggestions.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return b.priority - a.priority;
  });

  return suggestions;
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
  generateSmartSuggestions,
  saveGeneratedSessions
};
