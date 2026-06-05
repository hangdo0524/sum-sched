/**
 * Curriculum Engine - Main Entry Point
 * AI-powered curriculum generation from roadmap
 */

import { ref, get, set } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js';
import { generateCurriculum, generateLessonDetail } from './generator.js';
import { loadSource, getSources, addCustomSource, parseSourceContent } from './sources.js';
import { mapCurriculumToSchedule, getScheduledLessons } from './time-mapper.js';
import { exportToPDF, exportToJSON } from './export.js';

let db = null;

export function initCurriculum(database) {
  db = database;
}

// ============================================
// CURRICULUM CRUD
// ============================================

/**
 * Get all curricula for a child
 */
export async function getCurricula(userId, childId) {
  if (!db) return [];

  try {
    const snapshot = await get(ref(db, `curricula/${userId}/${childId}`));
    if (!snapshot.exists()) return [];

    const data = snapshot.val();
    return Object.entries(data).map(([id, curriculum]) => ({
      id,
      ...curriculum
    }));
  } catch (error) {
    console.error('Error getting curricula:', error);
    return [];
  }
}

/**
 * Get a specific curriculum
 */
export async function getCurriculum(userId, childId, curriculumId) {
  if (!db) return null;

  try {
    const snapshot = await get(ref(db, `curricula/${userId}/${childId}/${curriculumId}`));
    return snapshot.exists() ? { id: curriculumId, ...snapshot.val() } : null;
  } catch (error) {
    console.error('Error getting curriculum:', error);
    return null;
  }
}

/**
 * Save curriculum
 */
export async function saveCurriculum(userId, childId, curriculum) {
  if (!db) return null;

  try {
    const curriculumId = curriculum.id || `curriculum_${Date.now()}`;
    const data = {
      ...curriculum,
      id: curriculumId,
      updatedAt: new Date().toISOString()
    };

    if (!curriculum.createdAt) {
      data.createdAt = data.updatedAt;
    }

    await set(ref(db, `curricula/${userId}/${childId}/${curriculumId}`), data);
    return curriculumId;
  } catch (error) {
    console.error('Error saving curriculum:', error);
    return null;
  }
}

/**
 * Delete curriculum
 */
export async function deleteCurriculum(userId, childId, curriculumId) {
  if (!db) return false;

  try {
    await set(ref(db, `curricula/${userId}/${childId}/${curriculumId}`), null);
    return true;
  } catch (error) {
    console.error('Error deleting curriculum:', error);
    return false;
  }
}

// ============================================
// CURRICULUM GENERATION
// ============================================

/**
 * Generate curriculum from roadmap
 */
export async function createCurriculumFromRoadmap(options) {
  const {
    userId,
    childId,
    roadmap,
    subject,
    grade,
    semester,
    sourceIds = ['gdpt_2018'],
    customPrompt = null
  } = options;

  // Load sources
  const sources = [];
  for (const sourceId of sourceIds) {
    const source = await loadSource(sourceId);
    if (source) sources.push(source);
  }

  // Generate curriculum with AI
  const curriculum = await generateCurriculum({
    roadmap,
    subject,
    grade,
    semester,
    sources,
    customPrompt
  });

  if (curriculum.error) {
    return curriculum;
  }

  // Save to Firebase
  const curriculumId = await saveCurriculum(userId, childId, curriculum);

  return {
    ...curriculum,
    id: curriculumId
  };
}

/**
 * Generate detailed content for a lesson
 */
export async function generateLessonContent(options) {
  const {
    curriculum,
    unitId,
    lessonId,
    sources = []
  } = options;

  const unit = curriculum.units?.find(u => u.id === unitId);
  const lesson = unit?.lessons?.find(l => l.id === lessonId);

  if (!lesson) {
    return { error: 'Lesson not found' };
  }

  const detailedLesson = await generateLessonDetail({
    curriculum,
    unit,
    lesson,
    sources
  });

  return detailedLesson;
}

/**
 * Update a specific lesson in curriculum
 */
export async function updateLesson(userId, childId, curriculumId, unitId, lessonId, lessonData) {
  const curriculum = await getCurriculum(userId, childId, curriculumId);
  if (!curriculum) return { error: 'Curriculum not found' };

  const unitIndex = curriculum.units?.findIndex(u => u.id === unitId);
  if (unitIndex === -1) return { error: 'Unit not found' };

  const lessonIndex = curriculum.units[unitIndex].lessons?.findIndex(l => l.id === lessonId);
  if (lessonIndex === -1) return { error: 'Lesson not found' };

  // Update lesson
  curriculum.units[unitIndex].lessons[lessonIndex] = {
    ...curriculum.units[unitIndex].lessons[lessonIndex],
    ...lessonData,
    updatedAt: new Date().toISOString()
  };

  await saveCurriculum(userId, childId, curriculum);
  return curriculum;
}

// ============================================
// SCHEDULE INTEGRATION
// ============================================

/**
 * Map curriculum to weekly schedule
 */
export async function scheduleCurriculum(options) {
  const {
    userId,
    childId,
    curriculumId,
    startDate,
    weeklySlots,
    excludeDates = []
  } = options;

  const curriculum = await getCurriculum(userId, childId, curriculumId);
  if (!curriculum) return { error: 'Curriculum not found' };

  const scheduledCurriculum = mapCurriculumToSchedule({
    curriculum,
    startDate,
    weeklySlots,
    excludeDates
  });

  // Save updated curriculum with schedule
  await saveCurriculum(userId, childId, scheduledCurriculum);

  return scheduledCurriculum;
}

/**
 * Get lessons for a specific date range
 */
export async function getLessonsForDateRange(userId, childId, startDate, endDate) {
  const curricula = await getCurricula(userId, childId);

  const allLessons = [];
  for (const curriculum of curricula) {
    const lessons = getScheduledLessons(curriculum, startDate, endDate);
    allLessons.push(...lessons.map(l => ({
      ...l,
      curriculumId: curriculum.id,
      subjectName: curriculum.subject?.name
    })));
  }

  return allLessons.sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));
}

// ============================================
// EXPORT
// ============================================

/**
 * Export curriculum to PDF
 */
export async function exportCurriculumPDF(userId, childId, curriculumId, options = {}) {
  const curriculum = await getCurriculum(userId, childId, curriculumId);
  if (!curriculum) return { error: 'Curriculum not found' };

  return exportToPDF(curriculum, options);
}

/**
 * Export curriculum to JSON
 */
export async function exportCurriculumJSON(userId, childId, curriculumId) {
  const curriculum = await getCurriculum(userId, childId, curriculumId);
  if (!curriculum) return null;

  return exportToJSON(curriculum);
}

// ============================================
// SOURCES MANAGEMENT
// ============================================

export {
  loadSource,
  getSources,
  addCustomSource,
  parseSourceContent
};

// ============================================
// DEFAULT EXPORT
// ============================================

export default {
  initCurriculum,
  // CRUD
  getCurricula,
  getCurriculum,
  saveCurriculum,
  deleteCurriculum,
  // Generation
  createCurriculumFromRoadmap,
  generateLessonContent,
  updateLesson,
  // Schedule
  scheduleCurriculum,
  getLessonsForDateRange,
  // Export
  exportCurriculumPDF,
  exportCurriculumJSON,
  // Sources
  loadSource,
  getSources,
  addCustomSource,
  parseSourceContent
};
