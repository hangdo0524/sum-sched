/**
 * Academic Calendar Management
 * Quản lý: Cấp học → Năm học → Kỳ học → Tuần → Sessions
 */

import { ref, get, set, push, remove, update } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js';

let db = null;

// Initialize with Firebase database reference
export function initAcademicCalendar(database) {
  db = database;
}

// ============================================
// ACADEMIC LEVELS (Cấp học) - Static Data
// ============================================

export const ACADEMIC_LEVELS = {
  elementary: {
    id: 'elementary',
    name: 'Tiểu học',
    gradeRange: { from: 1, to: 5 },
    defaults: {
      maxStudyHoursPerDay: 4,
      sessionDuration: 45,
      breakBetweenSessions: 15,
      recommendedSubjectsPerDay: 3,
      timeAllocation: {
        academic: 60,
        physical: 25,
        creative: 10,
        free: 5
      }
    },
    subjects: {
      required: ['Toán', 'Tiếng Việt', 'Tiếng Anh'],
      elective: ['Tin học', 'Mỹ thuật', 'Âm nhạc', 'Thể dục']
    }
  },
  middle: {
    id: 'middle',
    name: 'THCS',
    gradeRange: { from: 6, to: 9 },
    defaults: {
      maxStudyHoursPerDay: 5,
      sessionDuration: 60,
      breakBetweenSessions: 15,
      recommendedSubjectsPerDay: 4,
      timeAllocation: {
        academic: 70,
        physical: 20,
        creative: 7,
        free: 3
      }
    },
    subjects: {
      required: ['Toán', 'Ngữ văn', 'Tiếng Anh', 'Vật lý', 'Hóa học', 'Sinh học', 'Lịch sử', 'Địa lý'],
      elective: ['Tin học', 'Công nghệ', 'GDCD']
    }
  },
  high: {
    id: 'high',
    name: 'THPT',
    gradeRange: { from: 10, to: 12 },
    defaults: {
      maxStudyHoursPerDay: 6,
      sessionDuration: 90,
      breakBetweenSessions: 10,
      recommendedSubjectsPerDay: 5,
      timeAllocation: {
        academic: 75,
        physical: 15,
        creative: 7,
        free: 3
      }
    },
    subjects: {
      required: ['Toán', 'Ngữ văn', 'Tiếng Anh'],
      elective: ['Vật lý', 'Hóa học', 'Sinh học', 'Lịch sử', 'Địa lý', 'GDCD', 'Tin học']
    }
  }
};

// Get level from grade
export function getLevelFromGrade(grade) {
  if (grade >= 1 && grade <= 5) return ACADEMIC_LEVELS.elementary;
  if (grade >= 6 && grade <= 9) return ACADEMIC_LEVELS.middle;
  if (grade >= 10 && grade <= 12) return ACADEMIC_LEVELS.high;
  return ACADEMIC_LEVELS.elementary;
}

// ============================================
// VIETNAM HOLIDAYS - Auto-generate
// ============================================

export function getVietnamHolidays(year) {
  return [
    {
      name: 'Tết Dương lịch',
      startDate: `${year}-01-01`,
      endDate: `${year}-01-01`,
      type: 'national'
    },
    {
      name: 'Tết Nguyên Đán',
      startDate: `${year}-01-25`, // Approximate - should calculate lunar
      endDate: `${year}-02-02`,
      type: 'national'
    },
    {
      name: 'Giỗ Tổ Hùng Vương',
      startDate: `${year}-04-07`, // 10/3 âm lịch - approximate
      endDate: `${year}-04-07`,
      type: 'national'
    },
    {
      name: 'Giải phóng miền Nam',
      startDate: `${year}-04-30`,
      endDate: `${year}-04-30`,
      type: 'national'
    },
    {
      name: 'Quốc tế Lao động',
      startDate: `${year}-05-01`,
      endDate: `${year}-05-01`,
      type: 'national'
    },
    {
      name: 'Quốc khánh',
      startDate: `${year}-09-02`,
      endDate: `${year}-09-02`,
      type: 'national'
    }
  ];
}

// ============================================
// ACADEMIC YEARS (Năm học)
// ============================================

/**
 * Get all academic years for a user
 */
export async function getAcademicYears(userId, childId) {
  if (!db || !userId) return getAcademicYearsFromLocal(childId);

  try {
    const yearsRef = ref(db, `academicYears/${userId}/${childId}`);
    const snapshot = await get(yearsRef);
    if (snapshot.exists()) {
      return Object.entries(snapshot.val()).map(([id, data]) => ({ id, ...data }));
    }
    return [];
  } catch (error) {
    console.error('Error getting academic years:', error);
    return getAcademicYearsFromLocal(childId);
  }
}

/**
 * Get a specific academic year
 */
export async function getAcademicYear(userId, childId, yearId) {
  if (!db || !userId) {
    const years = getAcademicYearsFromLocal(childId);
    return years.find(y => y.id === yearId) || null;
  }

  try {
    const yearRef = ref(db, `academicYears/${userId}/${childId}/${yearId}`);
    const snapshot = await get(yearRef);
    if (snapshot.exists()) {
      return { id: yearId, ...snapshot.val() };
    }
    return null;
  } catch (error) {
    console.error('Error getting academic year:', error);
    return null;
  }
}

/**
 * Create a new academic year
 */
export async function createAcademicYear(userId, childId, yearData) {
  const level = getLevelFromGrade(yearData.studentGrade);

  const academicYear = {
    name: yearData.name || `Năm học ${yearData.startDate.substring(0, 4)}-${yearData.endDate.substring(0, 4)}`,
    startDate: yearData.startDate,
    endDate: yearData.endDate,
    studentGrade: yearData.studentGrade,
    academicLevel: level.id,
    school: yearData.school || '',
    config: {
      termsCount: yearData.termsCount || 2,
      weeksPerTerm: yearData.weeksPerTerm || 18
    },
    holidays: yearData.holidays || getVietnamHolidays(parseInt(yearData.startDate.substring(0, 4))),
    events: yearData.events || [],
    status: 'planning',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  if (!db || !userId) {
    const id = `year_${Date.now()}`;
    saveAcademicYearToLocal(childId, id, academicYear);
    return { id, ...academicYear };
  }

  try {
    const yearsRef = ref(db, `academicYears/${userId}/${childId}`);
    const newYearRef = push(yearsRef);
    await set(newYearRef, academicYear);
    return { id: newYearRef.key, ...academicYear };
  } catch (error) {
    console.error('Error creating academic year:', error);
    return null;
  }
}

/**
 * Update an academic year
 */
export async function updateAcademicYear(userId, childId, yearId, updates) {
  const updateData = {
    ...updates,
    updatedAt: new Date().toISOString()
  };

  if (!db || !userId) {
    const years = getAcademicYearsFromLocal(childId);
    const yearIndex = years.findIndex(y => y.id === yearId);
    if (yearIndex >= 0) {
      years[yearIndex] = { ...years[yearIndex], ...updateData };
      localStorage.setItem(`sumSched_${childId}_academicYears`, JSON.stringify(years));
      return true;
    }
    return false;
  }

  try {
    const yearRef = ref(db, `academicYears/${userId}/${childId}/${yearId}`);
    await update(yearRef, updateData);
    return true;
  } catch (error) {
    console.error('Error updating academic year:', error);
    return false;
  }
}

/**
 * Delete an academic year (and all related terms/weeks)
 */
export async function deleteAcademicYear(userId, childId, yearId) {
  if (!db || !userId) {
    const years = getAcademicYearsFromLocal(childId).filter(y => y.id !== yearId);
    localStorage.setItem(`sumSched_${childId}_academicYears`, JSON.stringify(years));
    // Also delete related terms and weeks
    const terms = getTermsFromLocal(childId).filter(t => t.academicYearId !== yearId);
    localStorage.setItem(`sumSched_${childId}_terms`, JSON.stringify(terms));
    return true;
  }

  try {
    // Delete academic year
    await remove(ref(db, `academicYears/${userId}/${childId}/${yearId}`));

    // Delete related terms
    const terms = await getTerms(userId, childId, yearId);
    for (const term of terms) {
      await deleteTerm(userId, childId, term.id);
    }

    return true;
  } catch (error) {
    console.error('Error deleting academic year:', error);
    return false;
  }
}

// ============================================
// TERMS (Kỳ học)
// ============================================

/**
 * Get all terms for an academic year
 */
export async function getTerms(userId, childId, yearId = null) {
  if (!db || !userId) {
    const terms = getTermsFromLocal(childId);
    return yearId ? terms.filter(t => t.academicYearId === yearId) : terms;
  }

  try {
    const termsRef = ref(db, `terms/${userId}/${childId}`);
    const snapshot = await get(termsRef);
    if (snapshot.exists()) {
      const terms = Object.entries(snapshot.val()).map(([id, data]) => ({ id, ...data }));
      return yearId ? terms.filter(t => t.academicYearId === yearId) : terms;
    }
    return [];
  } catch (error) {
    console.error('Error getting terms:', error);
    return getTermsFromLocal(childId);
  }
}

/**
 * Get a specific term
 */
export async function getTerm(userId, childId, termId) {
  if (!db || !userId) {
    const terms = getTermsFromLocal(childId);
    return terms.find(t => t.id === termId) || null;
  }

  try {
    const termRef = ref(db, `terms/${userId}/${childId}/${termId}`);
    const snapshot = await get(termRef);
    if (snapshot.exists()) {
      return { id: termId, ...snapshot.val() };
    }
    return null;
  } catch (error) {
    console.error('Error getting term:', error);
    return null;
  }
}

/**
 * Create a new term
 */
export async function createTerm(userId, childId, termData) {
  const term = {
    academicYearId: termData.academicYearId,
    name: termData.name,
    shortName: termData.shortName || termData.name.replace('Học kỳ ', 'HK'),
    type: termData.type || 'semester',
    order: termData.order || 1,
    startDate: termData.startDate,
    endDate: termData.endDate,
    totalWeeks: termData.totalWeeks || calculateWeeks(termData.startDate, termData.endDate),
    structure: termData.structure || {
      learningWeeks: 15,
      reviewWeeks: 2,
      examWeeks: 2
    },
    goals: termData.goals || { academic: [], skills: [], activities: [] },
    subjects: termData.subjects || [],
    exams: termData.exams || [],
    status: 'planning',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  if (!db || !userId) {
    const id = `term_${Date.now()}`;
    saveTermToLocal(childId, id, term);
    return { id, ...term };
  }

  try {
    const termsRef = ref(db, `terms/${userId}/${childId}`);
    const newTermRef = push(termsRef);
    await set(newTermRef, term);
    return { id: newTermRef.key, ...term };
  } catch (error) {
    console.error('Error creating term:', error);
    return null;
  }
}

/**
 * Update a term
 */
export async function updateTerm(userId, childId, termId, updates) {
  const updateData = {
    ...updates,
    updatedAt: new Date().toISOString()
  };

  if (!db || !userId) {
    const terms = getTermsFromLocal(childId);
    const termIndex = terms.findIndex(t => t.id === termId);
    if (termIndex >= 0) {
      terms[termIndex] = { ...terms[termIndex], ...updateData };
      localStorage.setItem(`sumSched_${childId}_terms`, JSON.stringify(terms));
      return true;
    }
    return false;
  }

  try {
    const termRef = ref(db, `terms/${userId}/${childId}/${termId}`);
    await update(termRef, updateData);
    return true;
  } catch (error) {
    console.error('Error updating term:', error);
    return false;
  }
}

/**
 * Delete a term (and all related weeks)
 */
export async function deleteTerm(userId, childId, termId) {
  if (!db || !userId) {
    const terms = getTermsFromLocal(childId).filter(t => t.id !== termId);
    localStorage.setItem(`sumSched_${childId}_terms`, JSON.stringify(terms));
    // Also delete related weeks
    const weeks = getWeeksFromLocal(childId).filter(w => w.termId !== termId);
    localStorage.setItem(`sumSched_${childId}_weeks`, JSON.stringify(weeks));
    return true;
  }

  try {
    // Delete term
    await remove(ref(db, `terms/${userId}/${childId}/${termId}`));

    // Delete related weeks
    const weeks = await getWeeks(userId, childId, termId);
    for (const week of weeks) {
      await deleteWeek(userId, childId, week.id);
    }

    return true;
  } catch (error) {
    console.error('Error deleting term:', error);
    return false;
  }
}

// ============================================
// WEEKS (Tuần học)
// ============================================

/**
 * Get all weeks for a term
 */
export async function getWeeks(userId, childId, termId = null) {
  if (!db || !userId) {
    const weeks = getWeeksFromLocal(childId);
    return termId ? weeks.filter(w => w.termId === termId) : weeks;
  }

  try {
    const weeksRef = ref(db, `weeks/${userId}/${childId}`);
    const snapshot = await get(weeksRef);
    if (snapshot.exists()) {
      const weeks = Object.entries(snapshot.val()).map(([id, data]) => ({ id, ...data }));
      return termId ? weeks.filter(w => w.termId === termId) : weeks;
    }
    return [];
  } catch (error) {
    console.error('Error getting weeks:', error);
    return getWeeksFromLocal(childId);
  }
}

/**
 * Get a specific week
 */
export async function getWeek(userId, childId, weekId) {
  if (!db || !userId) {
    const weeks = getWeeksFromLocal(childId);
    return weeks.find(w => w.id === weekId) || null;
  }

  try {
    const weekRef = ref(db, `weeks/${userId}/${childId}/${weekId}`);
    const snapshot = await get(weekRef);
    if (snapshot.exists()) {
      return { id: weekId, ...snapshot.val() };
    }
    return null;
  } catch (error) {
    console.error('Error getting week:', error);
    return null;
  }
}

/**
 * Get current week (based on today's date)
 */
export async function getCurrentWeek(userId, childId) {
  const today = new Date().toISOString().split('T')[0];
  const weeks = await getWeeks(userId, childId);
  return weeks.find(w => w.startDate <= today && w.endDate >= today) || null;
}

/**
 * Create a week
 */
export async function createWeek(userId, childId, weekData) {
  const week = {
    termId: weekData.termId,
    weekNumber: weekData.weekNumber,
    name: weekData.name || `Tuần ${weekData.weekNumber}`,
    startDate: weekData.startDate,
    endDate: weekData.endDate,
    type: weekData.type || 'learning',
    goals: weekData.goals || { focus: '', tasks: [] },
    adjustments: weekData.adjustments || { reason: '', skipDates: [], extraHours: {} },
    result: null,
    createdAt: new Date().toISOString()
  };

  if (!db || !userId) {
    const id = `week_${Date.now()}`;
    saveWeekToLocal(childId, id, week);
    return { id, ...week };
  }

  try {
    const weeksRef = ref(db, `weeks/${userId}/${childId}`);
    const newWeekRef = push(weeksRef);
    await set(newWeekRef, week);
    return { id: newWeekRef.key, ...week };
  } catch (error) {
    console.error('Error creating week:', error);
    return null;
  }
}

/**
 * Update a week
 */
export async function updateWeek(userId, childId, weekId, updates) {
  if (!db || !userId) {
    const weeks = getWeeksFromLocal(childId);
    const weekIndex = weeks.findIndex(w => w.id === weekId);
    if (weekIndex >= 0) {
      weeks[weekIndex] = { ...weeks[weekIndex], ...updates };
      localStorage.setItem(`sumSched_${childId}_weeks`, JSON.stringify(weeks));
      return true;
    }
    return false;
  }

  try {
    const weekRef = ref(db, `weeks/${userId}/${childId}/${weekId}`);
    await update(weekRef, updates);
    return true;
  } catch (error) {
    console.error('Error updating week:', error);
    return false;
  }
}

/**
 * Delete a week
 */
export async function deleteWeek(userId, childId, weekId) {
  if (!db || !userId) {
    const weeks = getWeeksFromLocal(childId).filter(w => w.id !== weekId);
    localStorage.setItem(`sumSched_${childId}_weeks`, JSON.stringify(weeks));
    return true;
  }

  try {
    await remove(ref(db, `weeks/${userId}/${childId}/${weekId}`));
    return true;
  } catch (error) {
    console.error('Error deleting week:', error);
    return false;
  }
}

// ============================================
// AUTO-GENERATION
// ============================================

/**
 * Generate weeks for a term
 */
export async function generateWeeksForTerm(userId, childId, term, academicYear) {
  const weeks = [];
  let currentDate = new Date(term.startDate);
  let weekNumber = 1;

  // Align to Monday
  const dayOfWeek = currentDate.getDay();
  if (dayOfWeek !== 1) {
    const daysToMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
    currentDate.setDate(currentDate.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  }

  const termEndDate = new Date(term.endDate);
  const holidays = academicYear.holidays || [];

  // Generate learning weeks
  for (let i = 0; i < term.structure.learningWeeks && currentDate <= termEndDate; i++) {
    const weekData = createWeekData(term, weekNumber++, currentDate, 'learning', holidays);
    weeks.push(weekData);
    currentDate.setDate(currentDate.getDate() + 7);
  }

  // Generate review weeks
  for (let i = 0; i < term.structure.reviewWeeks && currentDate <= termEndDate; i++) {
    const weekData = createWeekData(term, weekNumber++, currentDate, 'review', holidays);
    weeks.push(weekData);
    currentDate.setDate(currentDate.getDate() + 7);
  }

  // Generate exam weeks
  for (let i = 0; i < term.structure.examWeeks && currentDate <= termEndDate; i++) {
    const weekData = createWeekData(term, weekNumber++, currentDate, 'exam', holidays);
    weeks.push(weekData);
    currentDate.setDate(currentDate.getDate() + 7);
  }

  // Save all weeks
  const savedWeeks = [];
  for (const weekData of weeks) {
    const saved = await createWeek(userId, childId, weekData);
    if (saved) savedWeeks.push(saved);
  }

  return savedWeeks;
}

function createWeekData(term, weekNumber, startDate, type, holidays) {
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 6);

  const weekStartStr = formatDateStr(startDate);
  const weekEndStr = formatDateStr(endDate);

  // Find holidays in this week
  const weekHolidays = holidays.filter(h => {
    return (h.startDate <= weekEndStr && h.endDate >= weekStartStr);
  });

  const adjustments = {
    reason: weekHolidays.map(h => h.name).join(', '),
    skipDates: weekHolidays.flatMap(h => getDateRange(h.startDate, h.endDate)),
    extraHours: {}
  };

  return {
    termId: term.id,
    weekNumber,
    name: getWeekName(weekNumber, type),
    startDate: weekStartStr,
    endDate: weekEndStr,
    type,
    goals: { focus: '', tasks: [] },
    adjustments: adjustments.skipDates.length > 0 ? adjustments : { reason: '', skipDates: [], extraHours: {} }
  };
}

function getWeekName(weekNumber, type) {
  switch (type) {
    case 'learning': return `Tuần ${weekNumber}`;
    case 'review': return `Tuần ôn thi`;
    case 'exam': return `Tuần thi`;
    case 'break': return `Tuần nghỉ`;
    default: return `Tuần ${weekNumber}`;
  }
}

/**
 * Generate weekly schedule (sessions) from term subjects and week type
 * @param {Object} week - Week object
 * @param {Object} term - Term object with subjects
 * @param {Object} level - Academic level with defaults
 * @returns {Array} Array of session objects
 */
export function generateWeeklySchedule(week, term, level) {
  if (!term.subjects || term.subjects.length === 0) {
    return [];
  }

  const sessions = [];
  const skipDates = new Set(week.adjustments?.skipDates || []);

  // Hour multipliers based on week type
  const hourMultiplier = {
    'learning': 1.0,
    'review': 1.3,   // More study time during review
    'exam': 0.3,     // Reduced - mostly exams
    'break': 0
  };

  if (week.type === 'break') {
    return [];
  }

  // Get available days (Mon-Sat, excluding holidays)
  const availableDays = getWeekDays(week.startDate, week.endDate)
    .filter(day => !skipDates.has(day) && new Date(day).getDay() !== 0); // Exclude Sundays

  if (availableDays.length === 0) {
    return [];
  }

  // Define time slots
  const timeSlots = {
    morning: [
      { start: '08:00', end: '09:30' },
      { start: '09:45', end: '11:15' }
    ],
    afternoon: [
      { start: '14:00', end: '15:30' },
      { start: '15:45', end: '17:15' }
    ],
    evening: [
      { start: '19:00', end: '20:30' }
    ]
  };

  // Flatten all available slots
  const allSlots = [...timeSlots.morning, ...timeSlots.afternoon, ...timeSlots.evening];
  let slotIndex = 0;

  // Sort subjects by priority
  const sortedSubjects = [...term.subjects].sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return (priorityOrder[a.priority] || 1) - (priorityOrder[b.priority] || 1);
  });

  // Distribute sessions across days
  sortedSubjects.forEach(subject => {
    const adjustedHours = (subject.weeklyHours || 3) * (hourMultiplier[week.type] || 1);
    const sessionDuration = level?.defaults?.sessionDuration || 90; // minutes
    const sessionsNeeded = Math.ceil((adjustedHours * 60) / sessionDuration);

    for (let i = 0; i < sessionsNeeded; i++) {
      const dayIndex = (slotIndex % availableDays.length);
      const day = availableDays[dayIndex];
      const slot = allSlots[Math.floor(slotIndex / availableDays.length) % allSlots.length];

      sessions.push({
        id: `gen_${week.id}_${subject.subjectId || subject.name}_${i}`,
        weekId: week.id,
        subjectId: subject.subjectId || subject.name,
        subjectName: subject.name,
        date: day,
        startTime: slot.start,
        endTime: slot.end,
        duration: sessionDuration,
        type: week.type === 'exam' ? 'exam' : 'regular',
        status: 'planned',
        generated: true
      });

      slotIndex++;
    }
  });

  // Sort by date and time
  sessions.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.startTime.localeCompare(b.startTime);
  });

  return sessions;
}

/**
 * Get all days in a week range
 */
function getWeekDays(startDate, endDate) {
  const days = [];
  const current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    days.push(formatDateStr(current));
    current.setDate(current.getDate() + 1);
  }

  return days;
}

/**
 * Apply generated schedule to existing sessions
 * Merges with existing sessions, avoiding conflicts
 */
export async function applyGeneratedSchedule(userId, childId, weekId, generatedSessions) {
  // This function would integrate with the existing sessions system
  // For now, return the generated sessions
  return generatedSessions;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function calculateWeeks(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.ceil(diffDays / 7);
}

function formatDateStr(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDateRange(startDate, endDate) {
  const dates = [];
  const current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    dates.push(formatDateStr(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

// ============================================
// LOCAL STORAGE HELPERS
// ============================================

function getAcademicYearsFromLocal(childId) {
  const key = `sumSched_${childId}_academicYears`;
  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : [];
}

function saveAcademicYearToLocal(childId, id, yearData) {
  const years = getAcademicYearsFromLocal(childId);
  years.push({ id, ...yearData });
  localStorage.setItem(`sumSched_${childId}_academicYears`, JSON.stringify(years));
}

function getTermsFromLocal(childId) {
  const key = `sumSched_${childId}_terms`;
  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : [];
}

function saveTermToLocal(childId, id, termData) {
  const terms = getTermsFromLocal(childId);
  terms.push({ id, ...termData });
  localStorage.setItem(`sumSched_${childId}_terms`, JSON.stringify(terms));
}

function getWeeksFromLocal(childId) {
  const key = `sumSched_${childId}_weeks`;
  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : [];
}

function saveWeekToLocal(childId, id, weekData) {
  const weeks = getWeeksFromLocal(childId);
  weeks.push({ id, ...weekData });
  localStorage.setItem(`sumSched_${childId}_weeks`, JSON.stringify(weeks));
}

// ============================================
// EXPORTS
// ============================================

export default {
  initAcademicCalendar,
  ACADEMIC_LEVELS,
  getLevelFromGrade,
  getVietnamHolidays,
  // Academic Years
  getAcademicYears,
  getAcademicYear,
  createAcademicYear,
  updateAcademicYear,
  deleteAcademicYear,
  // Terms
  getTerms,
  getTerm,
  createTerm,
  updateTerm,
  deleteTerm,
  // Weeks
  getWeeks,
  getWeek,
  getCurrentWeek,
  createWeek,
  updateWeek,
  deleteWeek,
  // Generation
  generateWeeksForTerm,
  generateWeeklySchedule,
  applyGeneratedSchedule
};
