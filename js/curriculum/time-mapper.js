/**
 * Time Mapper - Map curriculum lessons to schedule
 */

// ============================================
// SCHEDULE MAPPING
// ============================================

/**
 * Map curriculum lessons to a weekly schedule
 */
export function mapCurriculumToSchedule(options) {
  const {
    curriculum,
    startDate,
    weeklySlots,
    excludeDates = []
  } = options;

  if (!curriculum || !curriculum.units) {
    return curriculum;
  }

  // Collect all lessons
  const allLessons = [];
  for (const unit of curriculum.units) {
    for (const lesson of unit.lessons || []) {
      allLessons.push({
        ...lesson,
        unitId: unit.id,
        unitTitle: unit.title
      });
    }
  }

  // Generate schedule dates
  const scheduleDates = generateScheduleDates({
    startDate: new Date(startDate),
    weeklySlots,
    totalSlots: allLessons.length,
    excludeDates: excludeDates.map(d => new Date(d).toISOString().split('T')[0])
  });

  // Assign dates to lessons
  const scheduledLessons = allLessons.map((lesson, index) => ({
    ...lesson,
    scheduledDate: scheduleDates[index]?.date || null,
    scheduledTime: scheduleDates[index]?.time || null,
    weekNumber: scheduleDates[index]?.weekNumber || null
  }));

  // Update curriculum with scheduled lessons
  const updatedUnits = curriculum.units.map(unit => ({
    ...unit,
    lessons: unit.lessons?.map(lesson => {
      const scheduled = scheduledLessons.find(l => l.id === lesson.id);
      return scheduled || lesson;
    })
  }));

  return {
    ...curriculum,
    units: updatedUnits,
    schedule: {
      startDate,
      weeklySlots,
      excludeDates,
      generatedAt: new Date().toISOString()
    }
  };
}

/**
 * Generate schedule dates based on weekly slots
 */
function generateScheduleDates(options) {
  const { startDate, weeklySlots, totalSlots, excludeDates } = options;

  const dates = [];
  let currentDate = new Date(startDate);
  let weekNumber = 1;
  let slotsGenerated = 0;

  // Sort weekly slots by day and time
  const sortedSlots = [...weeklySlots].sort((a, b) => {
    if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
    return a.startTime.localeCompare(b.startTime);
  });

  // Maximum iterations to prevent infinite loop
  const maxWeeks = 52;
  let weeksProcessed = 0;

  while (slotsGenerated < totalSlots && weeksProcessed < maxWeeks) {
    for (const slot of sortedSlots) {
      if (slotsGenerated >= totalSlots) break;

      // Calculate the date for this slot in the current week
      const slotDate = getDateForDayOfWeek(currentDate, slot.dayOfWeek);
      const dateStr = slotDate.toISOString().split('T')[0];

      // Skip if excluded or in the past
      if (excludeDates.includes(dateStr) || slotDate < startDate) {
        continue;
      }

      dates.push({
        date: dateStr,
        time: slot.startTime,
        dayOfWeek: slot.dayOfWeek,
        weekNumber,
        duration: slot.duration || 45
      });

      slotsGenerated++;
    }

    // Move to next week
    currentDate = addDays(currentDate, 7);
    weekNumber++;
    weeksProcessed++;
  }

  return dates;
}

/**
 * Get date for a specific day of week in the same week as reference date
 */
function getDateForDayOfWeek(referenceDate, dayOfWeek) {
  const date = new Date(referenceDate);
  const currentDay = date.getDay();
  const diff = dayOfWeek - currentDay;
  date.setDate(date.getDate() + diff);
  return date;
}

/**
 * Add days to a date
 */
function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// ============================================
// SCHEDULE QUERIES
// ============================================

/**
 * Get scheduled lessons for a date range
 */
export function getScheduledLessons(curriculum, startDate, endDate) {
  if (!curriculum || !curriculum.units) return [];

  const start = new Date(startDate);
  const end = new Date(endDate);
  const lessons = [];

  for (const unit of curriculum.units) {
    for (const lesson of unit.lessons || []) {
      if (!lesson.scheduledDate) continue;

      const lessonDate = new Date(lesson.scheduledDate);
      if (lessonDate >= start && lessonDate <= end) {
        lessons.push({
          ...lesson,
          unitId: unit.id,
          unitTitle: unit.title
        });
      }
    }
  }

  return lessons.sort((a, b) =>
    new Date(a.scheduledDate) - new Date(b.scheduledDate)
  );
}

/**
 * Get lessons for a specific week
 */
export function getLessonsForWeek(curriculum, weekNumber) {
  if (!curriculum || !curriculum.units) return [];

  const lessons = [];
  for (const unit of curriculum.units) {
    for (const lesson of unit.lessons || []) {
      if (lesson.weekNumber === weekNumber) {
        lessons.push({
          ...lesson,
          unitId: unit.id,
          unitTitle: unit.title
        });
      }
    }
  }

  return lessons;
}

/**
 * Get today's lessons
 */
export function getTodayLessons(curriculum) {
  const today = new Date().toISOString().split('T')[0];
  return getScheduledLessons(curriculum, today, today);
}

/**
 * Get upcoming lessons (next N days)
 */
export function getUpcomingLessons(curriculum, days = 7) {
  const start = new Date();
  const end = addDays(start, days);
  return getScheduledLessons(curriculum, start, end);
}

/**
 * Get overdue lessons (scheduled but not completed)
 */
export function getOverdueLessons(curriculum) {
  const today = new Date().toISOString().split('T')[0];

  const lessons = [];
  if (!curriculum || !curriculum.units) return lessons;

  for (const unit of curriculum.units) {
    for (const lesson of unit.lessons || []) {
      if (!lesson.scheduledDate) continue;
      if (lesson.completedAt) continue;

      if (lesson.scheduledDate < today) {
        lessons.push({
          ...lesson,
          unitId: unit.id,
          unitTitle: unit.title
        });
      }
    }
  }

  return lessons;
}

// ============================================
// SCHEDULE UTILITIES
// ============================================

/**
 * Reschedule a lesson
 */
export function rescheduleLesson(curriculum, lessonId, newDate, newTime) {
  if (!curriculum || !curriculum.units) return curriculum;

  const updatedUnits = curriculum.units.map(unit => ({
    ...unit,
    lessons: unit.lessons?.map(lesson => {
      if (lesson.id === lessonId) {
        return {
          ...lesson,
          scheduledDate: newDate,
          scheduledTime: newTime,
          rescheduledAt: new Date().toISOString()
        };
      }
      return lesson;
    })
  }));

  return {
    ...curriculum,
    units: updatedUnits
  };
}

/**
 * Mark lesson as completed
 */
export function markLessonCompleted(curriculum, lessonId, completionData = {}) {
  if (!curriculum || !curriculum.units) return curriculum;

  const updatedUnits = curriculum.units.map(unit => ({
    ...unit,
    lessons: unit.lessons?.map(lesson => {
      if (lesson.id === lessonId) {
        return {
          ...lesson,
          completedAt: new Date().toISOString(),
          completionData: {
            duration: completionData.actualDuration || lesson.duration,
            notes: completionData.notes || '',
            score: completionData.score || null
          }
        };
      }
      return lesson;
    })
  }));

  return {
    ...curriculum,
    units: updatedUnits
  };
}

/**
 * Get progress statistics
 */
export function getCurriculumProgress(curriculum) {
  if (!curriculum || !curriculum.units) {
    return { total: 0, completed: 0, percentage: 0 };
  }

  let total = 0;
  let completed = 0;

  for (const unit of curriculum.units) {
    for (const lesson of unit.lessons || []) {
      total++;
      if (lesson.completedAt) completed++;
    }
  }

  return {
    total,
    completed,
    remaining: total - completed,
    percentage: total > 0 ? Math.round((completed / total) * 100) : 0
  };
}

// ============================================
// EXPORTS
// ============================================

export default {
  mapCurriculumToSchedule,
  getScheduledLessons,
  getLessonsForWeek,
  getTodayLessons,
  getUpcomingLessons,
  getOverdueLessons,
  rescheduleLesson,
  markLessonCompleted,
  getCurriculumProgress
};
