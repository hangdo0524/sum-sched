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

// Check if a date/time slot is in the past
export function isSlotInPast(dateStr, startTime) {
  const now = new Date();
  const today = formatDate(now);

  // Past date = definitely in past
  if (dateStr < today) return true;

  // Future date = not in past
  if (dateStr > today) return false;

  // Same day - check time
  const [hours, mins] = startTime.split(':').map(Number);
  const slotMinutes = hours * 60 + mins;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  return slotMinutes <= currentMinutes;
}

export function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function getWeekStart(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0); // Normalize to midnight
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday as first day
  d.setDate(diff);
  return d;
}

export function getWeekDates(weekStart) {
  // weekStart should already be a Monday
  const start = new Date(weekStart);
  start.setHours(0, 0, 0, 0); // Normalize to midnight

  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates.push(formatDate(d));
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

function hasTimeConflict(newStart, newEnd, existingSessions, minGapMinutes = 0) {
  const newStartMins = timeToMinutes(newStart);
  const newEndMins = timeToMinutes(newEnd);

  for (const session of existingSessions) {
    // Skip completed or skipped sessions
    if (session.status === 'completed' || session.status === 'skipped') continue;

    const existStart = timeToMinutes(session.startTime);
    const existEnd = timeToMinutes(session.endTime);

    // Check overlap only (allow consecutive sessions)
    if (newStartMins < existEnd && newEndMins > existStart) {
      return { conflict: true, type: 'overlap', session };
    }

    // Check gap only if minGapMinutes > 0
    if (minGapMinutes > 0) {
      const gapBefore = newStartMins - existEnd;
      const gapAfter = existStart - newEndMins;

      if ((gapBefore > 0 && gapBefore < minGapMinutes) ||
          (gapAfter > 0 && gapAfter < minGapMinutes)) {
        return { conflict: true, type: 'too_close', session, gap: Math.min(gapBefore, gapAfter) };
      }
    }
  }
  return { conflict: false };
}

// Export for use in app.js
export function checkSessionConflict(date, startTime, endTime, excludeSessionId = null) {
  const subjects = getSubjects();
  const existingSessions = getSessions();

  // Get all sessions for this date
  const fixedSessions = getFixedSessionsForDate(date, subjects);
  const confirmedSessions = existingSessions.filter(s => s.date === date && s.id !== excludeSessionId);

  const allDaySessions = [...fixedSessions, ...confirmedSessions];

  return hasTimeConflict(startTime, endTime, allDaySessions, 30);
}

function getFixedSessionsForDate(dateStr, subjects) {
  const dayOfWeek = getDayOfWeek(dateStr);
  const sessions = [];

  // Get fixed sessions from subjects that have fixed slots
  // 'fixed': all selected slots are fixed
  // 'fixed-plus': selected slots are fixed, unselected are optional
  // 'hybrid': (legacy) same as fixed-plus
  const fixedTypes = ['fixed', 'hybrid', 'fixed-plus'];
  subjects.filter(s => fixedTypes.includes(s.type) && s.schedule).forEach(subject => {
    subject.schedule.forEach(slot => {
      // Skip if slot is not selected
      if (slot.selected === false) return;

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
  const dayStart = timeToMinutes(SCHEDULE_CONFIG.dayStart);
  const dayEnd = timeToMinutes(SCHEDULE_CONFIG.dayEnd);
  const lunchStart = timeToMinutes(SCHEDULE_CONFIG.lunchStart);
  const lunchEnd = timeToMinutes(SCHEDULE_CONFIG.lunchEnd);
  const sessionDuration = SCHEDULE_CONFIG.defaultSessionDuration * 60; // in minutes

  // Filter out completed/skipped sessions
  const activeSessions = fixedSessions.filter(s =>
    s.status !== 'completed' && s.status !== 'skipped'
  );

  let currentTime = dayStart;

  // Sort sessions by start time
  const sortedSessions = [...activeSessions].sort((a, b) =>
    timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
  );

  sortedSessions.forEach(session => {
    const sessionStart = timeToMinutes(session.startTime);
    const sessionEnd = timeToMinutes(session.endTime);

    // Add free slot before this session (if enough time for 1 session)
    if (currentTime + sessionDuration <= sessionStart) {
      // Check if slot crosses lunch break
      if (currentTime < lunchStart && sessionStart > lunchEnd) {
        // Morning slot before lunch
        if (currentTime + sessionDuration <= lunchStart) {
          slots.push({
            startTime: minutesToTime(currentTime),
            endTime: minutesToTime(lunchStart),
            duration: (lunchStart - currentTime) / 60
          });
        }
        // Afternoon slot after lunch
        if (lunchEnd + sessionDuration <= sessionStart) {
          slots.push({
            startTime: minutesToTime(lunchEnd),
            endTime: minutesToTime(sessionStart),
            duration: (sessionStart - lunchEnd) / 60
          });
        }
      } else if (currentTime >= lunchEnd || sessionStart <= lunchStart) {
        // Slot doesn't cross lunch
        slots.push({
          startTime: minutesToTime(currentTime),
          endTime: minutesToTime(sessionStart),
          duration: (sessionStart - currentTime) / 60
        });
      }
    }

    currentTime = sessionEnd;
  });

  // Add free slot after last session until day end
  if (currentTime + sessionDuration <= dayEnd) {
    // Check if crosses lunch
    if (currentTime < lunchStart) {
      // Morning slot before lunch
      if (currentTime + sessionDuration <= lunchStart) {
        slots.push({
          startTime: minutesToTime(currentTime),
          endTime: minutesToTime(lunchStart),
          duration: (lunchStart - currentTime) / 60
        });
      }
      // Afternoon slot after lunch
      if (lunchEnd + sessionDuration <= dayEnd) {
        slots.push({
          startTime: minutesToTime(lunchEnd),
          endTime: minutesToTime(dayEnd),
          duration: (dayEnd - lunchEnd) / 60
        });
      }
    } else if (currentTime >= lunchEnd) {
      // Only afternoon slot
      slots.push({
        startTime: minutesToTime(currentTime),
        endTime: minutesToTime(dayEnd),
        duration: (dayEnd - currentTime) / 60
      });
    }
  }

  return slots;
}

// Schedule config: 8:00-17:00, lunch break 12:00-13:30
const SCHEDULE_CONFIG = {
  dayStart: '08:00',
  dayEnd: '17:00',
  lunchStart: '12:00',
  lunchEnd: '13:30',
  defaultSessionDuration: 1.5 // 1h30
};

const TIME_SLOTS = {
  early: { start: '08:00', end: '09:30', label: 'Sáng sớm' },
  morning: { start: '09:30', end: '12:00', label: 'Sáng' },
  afternoon: { start: '13:30', end: '17:00', label: 'Chiều' }
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
      const subject = subjects.find(sub => sub.id === session.subjectId);

      schedule[dateStr].sessions.push({
        id: existing?.id || generateId(),
        subjectId: session.subjectId,
        subjectName: session.subjectName,
        category: subject?.category || 'academic',
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
    // (sessions that were selected from suggestions or created manually)
    const confirmedFlexible = existingSessions.filter(
      s => s.date === dateStr && !fixedSessions.some(f => f.subjectId === s.subjectId && f.startTime === s.startTime)
    );

    confirmedFlexible.forEach(session => {
      const subject = subjects.find(sub => sub.id === session.subjectId);
      // Include all flexible-type subjects (old and new naming)
      const flexibleTypes = ['flexible', 'semi-flexible', 'hybrid', 'weekly-pick', 'fixed-plus', 'self-study'];
      if (subject && flexibleTypes.includes(subject.type)) {
        // Skip if this is a fixed slot that's already added
        const isAlreadyAdded = schedule[dateStr].sessions.some(
          s => s.subjectId === session.subjectId && s.startTime === session.startTime
        );
        if (isAlreadyAdded) return;

        schedule[dateStr].sessions.push({
          ...session,
          subjectName: subject.name,
          category: subject.category || 'academic',
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

  // PART 1: Teacher's available slots (weekly-pick and fixed-plus)
  const teacherSubjects = subjects.filter(s =>
    s.type === 'weekly-pick' || s.type === 'fixed-plus'
  );

  teacherSubjects.forEach(subject => {
    const config = subject.config || {};
    const unselectedSlots = (subject.schedule || []).filter(slot => slot.selected === false);

    unselectedSlots.forEach(slot => {
      weekDates.forEach(dateStr => {
        const dayOfWeek = getDayOfWeek(dateStr);
        if (slot.day !== dayOfWeek) return;

        // Skip past time slots
        if (isSlotInPast(dateStr, slot.startTime)) return;

        const event = events.find(e => e.date === dateStr);
        if (event && ['holiday', 'trip'].includes(event.type)) return;

        // Check if already has a session at this time
        const hasSession = existingSessions.some(
          s => s.subjectId === subject.id && s.date === dateStr && s.startTime === slot.startTime
        );
        if (hasSession) return;

        const endTime = slot.endTime || addHoursToTime(slot.startTime, subject.slotDuration || 1.5);
        const duration = (timeToMinutes(endTime) - timeToMinutes(slot.startTime)) / 60;

        // Get all sessions for this day (fixed + confirmed)
        const fixedForDay = getFixedSessionsForDate(dateStr, subjects);
        const confirmedForDay = existingSessions.filter(s => s.date === dateStr);
        const allDaySessions = [...fixedForDay, ...confirmedForDay];

        // Check for conflict (overlap or < 1h gap)
        if (hasTimeConflict(slot.startTime, endTime, allDaySessions).conflict) return;

        let reason = '';
        if (subject.type === 'weekly-pick') {
          reason = `📆 Buổi thầy/cô có sẵn • Chọn ${config.targetSessions || 1} buổi/tuần`;
        } else {
          reason = `📅+ Buổi đi thêm tùy chọn (ngoài ${config.requiredSessions || 2} buổi cố định)`;
        }

        suggestions.push({
          id: generateId(),
          subjectId: subject.id,
          subjectName: subject.name,
          color: subject.color,
          date: dateStr,
          dayName: formatDateDisplay(dateStr),
          startTime: slot.startTime,
          endTime: endTime,
          duration: duration,
          reason: reason,
          priority: 20, // Teacher slots have high priority
          selected: false, // User must explicitly select
          isTeacherSlot: true
        });
      });
    });
  });

  // PART 2: Self-study subjects (AI suggestions) - BALANCED DISTRIBUTION
  // Include pure self-study AND subjects with extraSelfStudy enabled
  const selfStudySubjects = subjects.filter(s =>
    s.type === 'self-study' || s.type === 'flexible' || s.type === 'semi-flexible'
  );

  // Also include subjects with extraSelfStudy config
  const extraSelfStudySubjects = subjects.filter(s =>
    s.extraSelfStudy?.enabled && ['fixed', 'weekly-pick', 'fixed-plus'].includes(s.type)
  ).map(s => ({
    ...s,
    id: s.id + '_extra',
    name: s.name + ' (tự học)',
    type: 'self-study',
    category: s.category,
    config: {
      duration: s.extraSelfStudy.duration,
      sessionsPerWeek: s.extraSelfStudy.sessionsPerWeek,
      preferredSlots: s.extraSelfStudy.preferredSlots
    },
    slotDuration: s.extraSelfStudy.duration,
    isExtraSelfStudy: true,
    originalSubjectId: s.id
  }));

  const allSelfStudySubjects = [...selfStudySubjects, ...extraSelfStudySubjects];

  console.log('AI Suggestions Debug:', {
    selfStudySubjects: selfStudySubjects.map(s => ({ name: s.name, cat: s.category })),
    extraSelfStudySubjects: extraSelfStudySubjects.map(s => ({ name: s.name, cat: s.category })),
    totalFlexible: allSelfStudySubjects.length
  });

  if (allSelfStudySubjects.length === 0 && suggestions.length === 0) return suggestions;

  // Group subjects by category for balanced distribution
  const subjectsByCategory = {
    academic: allSelfStudySubjects.filter(s => s.category === 'academic'),
    physical: allSelfStudySubjects.filter(s => s.category === 'physical'),
    art: allSelfStudySubjects.filter(s => s.category === 'art')
  };

  // Calculate remaining sessions needed for each subject
  const subjectNeeds = {};
  allSelfStudySubjects.forEach(s => {
    const config = s.config || s.flexibleConfig || {};
    const target = config.sessionsPerWeek || 2;
    subjectNeeds[s.id] = {
      subject: s,
      target: target,
      scheduled: 0,
      remaining: target
    };
  });

  // Count existing confirmed sessions in this week
  existingSessions.forEach(session => {
    if (!weekDates.includes(session.date)) return;

    // Direct match
    if (subjectNeeds[session.subjectId]) {
      subjectNeeds[session.subjectId].scheduled++;
      subjectNeeds[session.subjectId].remaining--;
    }

    // For extra self-study (sessions saved with original ID)
    allSelfStudySubjects.forEach(subj => {
      if (subj.originalSubjectId === session.subjectId && subj.isExtraSelfStudy) {
        const origSubject = subjects.find(sub => sub.id === session.subjectId);
        if (origSubject) {
          const dayOfWeek = new Date(session.date + 'T00:00:00').getDay();
          const isFixedSlot = (origSubject.schedule || []).some(slot =>
            slot.day === dayOfWeek && slot.startTime === session.startTime
          );
          if (!isFixedSlot && subjectNeeds[subj.id]) {
            subjectNeeds[subj.id].scheduled++;
            subjectNeeds[subj.id].remaining--;
          }
        }
      }
    });
  });

  // Helper: Get time slot category (8:00-17:00, lunch 12:00-13:30)
  const getSlotCategory = (minutes) => {
    if (minutes < timeToMinutes('09:30')) return 'early';
    if (minutes < timeToMinutes('12:00')) return 'morning';
    if (minutes < timeToMinutes('13:30')) return 'lunch'; // Skip lunch
    return 'afternoon';
  };

  // Build day info for each day in the week
  const dayInfoMap = {};
  const availableDays = weekDates.filter(dateStr => {
    const event = events.find(e => e.date === dateStr);
    return !(event && ['holiday', 'trip'].includes(event.type));
  });

  availableDays.forEach(dateStr => {
    const fixedSessions = getFixedSessionsForDate(dateStr, subjects);
    const confirmedForDay = existingSessions.filter(s => s.date === dateStr);
    const teacherSuggestionsForDay = suggestions.filter(s => s.date === dateStr);

    // Analyze what categories are already scheduled today (from fixed sessions)
    const existingCategories = new Set();
    [...fixedSessions, ...confirmedForDay].forEach(s => {
      const subj = subjects.find(sub => sub.id === s.subjectId);
      if (subj?.category) existingCategories.add(subj.category);
    });

    dayInfoMap[dateStr] = {
      date: dateStr,
      fixedSessions,
      confirmedSessions: confirmedForDay,
      allSessions: [...fixedSessions, ...confirmedForDay, ...teacherSuggestionsForDay],
      freeSlots: findFreeSlots(fixedSessions, settings),
      existingCategories,
      suggestedSubjects: new Set()
    };
  });

  // BALANCED DISTRIBUTION ALGORITHM
  // Strategy: Round-robin across days, alternating categories
  // Goal: Each day should have academic + physical if possible

  // Build a queue of sessions to distribute per category
  const categoryQueues = {
    academic: [],
    physical: [],
    art: []
  };

  Object.values(subjectNeeds).forEach(need => {
    if (need.remaining <= 0) return;
    const cat = need.subject.category || 'academic';
    for (let i = 0; i < need.remaining; i++) {
      categoryQueues[cat]?.push(need.subject);
    }
  });

  console.log('Distribution plan:', {
    academic: categoryQueues.academic.length,
    physical: categoryQueues.physical.length,
    art: categoryQueues.art.length
  });

  // Round-robin distribute: iterate through days, try to add 1 academic + 1 physical per day
  let dayIndex = 0;
  let maxIterations = availableDays.length * 10;
  let iterations = 0;

  while (iterations < maxIterations) {
    iterations++;
    const dateStr = availableDays[dayIndex % availableDays.length];
    const dayInfo = dayInfoMap[dateStr];

    // Determine which category to prioritize for this day
    const hasAcademic = dayInfo.existingCategories.has('academic') || dayInfo.suggestedSubjects.size > 0 &&
      [...dayInfo.suggestedSubjects].some(id => {
        const subj = allSelfStudySubjects.find(s => s.id === id);
        return subj?.category === 'academic';
      });
    const hasPhysical = dayInfo.existingCategories.has('physical') ||
      [...dayInfo.suggestedSubjects].some(id => {
        const subj = allSelfStudySubjects.find(s => s.id === id);
        return subj?.category === 'physical';
      });

    // Try to add what's missing
    const categoriesToTry = [];
    if (!hasAcademic && categoryQueues.academic.length > 0) categoriesToTry.push('academic');
    if (!hasPhysical && categoryQueues.physical.length > 0) categoriesToTry.push('physical');
    if (categoryQueues.art.length > 0) categoriesToTry.push('art');

    // If day already has both, still try to add more if subject needs more sessions
    if (categoriesToTry.length === 0) {
      if (categoryQueues.academic.length > 0) categoriesToTry.push('academic');
      if (categoryQueues.physical.length > 0) categoriesToTry.push('physical');
    }

    if (categoriesToTry.length === 0) break; // Nothing left to schedule

    let addedThisRound = false;

    for (const category of categoriesToTry) {
      const queue = categoryQueues[category];
      if (queue.length === 0) continue;

      // Find a subject from this category that hasn't been scheduled today
      let subjectIndex = -1;
      for (let i = 0; i < queue.length; i++) {
        const subject = queue[i];
        const subjectIdsToCheck = [subject.id];
        if (subject.originalSubjectId) subjectIdsToCheck.push(subject.originalSubjectId);

        const alreadyToday = dayInfo.suggestedSubjects.has(subject.id) ||
          dayInfo.confirmedSessions.some(s => subjectIdsToCheck.includes(s.subjectId));

        if (!alreadyToday) {
          subjectIndex = i;
          break;
        }
      }

      if (subjectIndex === -1) continue;

      const subject = queue[subjectIndex];
      const config = subject.config || subject.flexibleConfig || {};
      const duration = config.duration || subject.slotDuration || 1.5;
      const preferredSlots = config.preferredSlots || ['early', 'morning', 'early-afternoon', 'afternoon', 'evening'];

      // Find a valid time slot
      let scheduled = false;
      for (const slot of dayInfo.freeSlots) {
        if (slot.duration < duration) continue;

        // Skip past time slots
        if (isSlotInPast(dateStr, slot.startTime)) continue;

        const slotCategory = getSlotCategory(timeToMinutes(slot.startTime));
        if (!preferredSlots.includes(slotCategory)) continue;

        const newEndTime = addHoursToTime(slot.startTime, duration);

        // Check for time conflict
        if (hasTimeConflict(slot.startTime, newEndTime, dayInfo.allSessions).conflict) continue;

        // Create suggestion
        const slotMinutes = timeToMinutes(slot.startTime);
        const isMorning = slotMinutes < timeToMinutes('12:00');
        const isAfternoon = slotMinutes >= timeToMinutes('14:00') && slotMinutes < timeToMinutes('17:00');
        const isEvening = slotMinutes >= timeToMinutes('19:00');

        let reason = '';
        let priority = 0;

        if (isMorning) {
          if (category === 'academic') {
            reason = '🌅 Sáng tập trung cao → học thuật';
            priority = 10;
          } else {
            reason = '🌅 Sáng → học tập hiệu quả';
            priority = 5;
          }
        } else if (isAfternoon) {
          if (category === 'physical') {
            reason = '☀️ Chiều → thể chất thư giãn';
            priority = 10;
          } else {
            reason = '☀️ Chiều → học nhẹ nhàng';
            priority = 5;
          }
        } else if (isEvening) {
          reason = '🌙 Tối → ôn bài';
          priority = 6;
        }

        const newSuggestion = {
          id: generateId(),
          subjectId: subject.originalSubjectId || subject.id,
          subjectName: subject.name,
          color: subject.color,
          date: dateStr,
          dayName: formatDateDisplay(dateStr),
          startTime: slot.startTime,
          endTime: newEndTime,
          duration: duration,
          reason: '🤖 ' + reason,
          priority: priority,
          selected: true,
          isTeacherSlot: false,
          isExtraSelfStudy: subject.isExtraSelfStudy || false
        };

        suggestions.push(newSuggestion);
        dayInfo.allSessions.push(newSuggestion);
        dayInfo.suggestedSubjects.add(subject.id);

        // Update free slot
        slot.startTime = addHoursToTime(slot.startTime, duration + 0.5);
        slot.duration -= duration + 0.5;

        // Remove from queue
        queue.splice(subjectIndex, 1);
        scheduled = true;
        addedThisRound = true;
        break;
      }

      if (scheduled) break; // Move to next day
    }

    dayIndex++;

    // If we've gone through all days without adding anything, we're done
    if (dayIndex % availableDays.length === 0 && !addedThisRound) {
      break;
    }
  }

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
  saveGeneratedSessions,
  checkSessionConflict
};
