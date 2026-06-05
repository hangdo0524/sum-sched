/**
 * KidBrain - Child's Knowledge Vault
 * Simplified atomic knowledge storage (3 types)
 */

import { ref, get, set, push, query, orderByChild, limitToLast } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js';

let db = null;

export function initKidBrain(database) {
  db = database;
}

// ============================================
// NOTE TYPES
// ============================================

export const NOTE_TYPES = {
  learned: {
    id: 'learned',
    name: 'Đã học',
    icon: '📚',
    description: 'Kiến thức mới học được',
    color: '#3b82f6'
  },
  discovered: {
    id: 'discovered',
    name: 'Khám phá',
    icon: '💡',
    description: 'Điều tự khám phá, aha moment',
    color: '#f59e0b'
  },
  remember: {
    id: 'remember',
    name: 'Ghi nhớ',
    icon: '⭐',
    description: 'Mẹo, công thức cần nhớ',
    color: '#10b981'
  }
};

// ============================================
// CRUD OPERATIONS
// ============================================

/**
 * Create a new knowledge note
 */
export async function createNote(userId, childId, noteData) {
  if (!db) return null;

  const note = {
    type: noteData.type || 'learned',
    title: noteData.title,
    content: noteData.content,
    subject: noteData.subject || null,
    relatedLessonId: noteData.lessonId || null,
    sessionId: noteData.sessionId || null,
    tags: noteData.tags || [],
    createdAt: new Date().toISOString(),
    // Spaced repetition fields
    nextReview: calculateNextReview(0),
    reviewCount: 0,
    easeFactor: 2.5
  };

  try {
    const notesRef = ref(db, `kidbrains/${userId}/${childId}/notes`);
    const newNoteRef = push(notesRef);
    await set(newNoteRef, note);

    // Update stats
    await updateStats(userId, childId, 'noteCreated');

    return { id: newNoteRef.key, ...note };
  } catch (error) {
    console.error('Error creating note:', error);
    return null;
  }
}

/**
 * Get all notes for a child
 */
export async function getNotes(userId, childId, options = {}) {
  if (!db) return [];

  const { type, subject, limit: maxNotes = 100 } = options;

  try {
    const notesRef = ref(db, `kidbrains/${userId}/${childId}/notes`);
    const snapshot = await get(notesRef);

    if (!snapshot.exists()) return [];

    let notes = [];
    snapshot.forEach(child => {
      notes.push({ id: child.key, ...child.val() });
    });

    // Filter by type
    if (type) {
      notes = notes.filter(n => n.type === type);
    }

    // Filter by subject
    if (subject) {
      notes = notes.filter(n => n.subject === subject);
    }

    // Sort by createdAt desc
    notes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Limit
    return notes.slice(0, maxNotes);

  } catch (error) {
    console.error('Error getting notes:', error);
    return [];
  }
}

/**
 * Get a single note
 */
export async function getNote(userId, childId, noteId) {
  if (!db) return null;

  try {
    const snapshot = await get(ref(db, `kidbrains/${userId}/${childId}/notes/${noteId}`));
    return snapshot.exists() ? { id: noteId, ...snapshot.val() } : null;
  } catch (error) {
    console.error('Error getting note:', error);
    return null;
  }
}

/**
 * Update a note
 */
export async function updateNote(userId, childId, noteId, updates) {
  if (!db) return false;

  try {
    const noteRef = ref(db, `kidbrains/${userId}/${childId}/notes/${noteId}`);
    const snapshot = await get(noteRef);

    if (!snapshot.exists()) return false;

    await set(noteRef, {
      ...snapshot.val(),
      ...updates,
      updatedAt: new Date().toISOString()
    });

    return true;
  } catch (error) {
    console.error('Error updating note:', error);
    return false;
  }
}

/**
 * Delete a note
 */
export async function deleteNote(userId, childId, noteId) {
  if (!db) return false;

  try {
    await set(ref(db, `kidbrains/${userId}/${childId}/notes/${noteId}`), null);
    return true;
  } catch (error) {
    console.error('Error deleting note:', error);
    return false;
  }
}

// ============================================
// SPACED REPETITION
// ============================================

/**
 * Get notes due for review
 */
export async function getNotesForReview(userId, childId, limit = 10) {
  const notes = await getNotes(userId, childId, { limit: 500 });
  const now = new Date().toISOString();

  const dueNotes = notes.filter(note => {
    if (!note.nextReview) return true;
    return note.nextReview <= now;
  });

  // Sort by nextReview (oldest first)
  dueNotes.sort((a, b) => {
    if (!a.nextReview) return -1;
    if (!b.nextReview) return 1;
    return new Date(a.nextReview) - new Date(b.nextReview);
  });

  return dueNotes.slice(0, limit);
}

/**
 * Record review result and update spaced repetition
 */
export async function recordReview(userId, childId, noteId, quality) {
  // quality: 0-5 (0=forgot, 5=perfect)
  const note = await getNote(userId, childId, noteId);
  if (!note) return false;

  let { easeFactor, reviewCount } = note;
  easeFactor = easeFactor || 2.5;
  reviewCount = reviewCount || 0;

  // SM-2 algorithm
  if (quality >= 3) {
    // Correct response
    reviewCount++;
    easeFactor = Math.max(1.3, easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
  } else {
    // Incorrect - reset
    reviewCount = 0;
  }

  const nextReview = calculateNextReview(reviewCount, easeFactor);

  await updateNote(userId, childId, noteId, {
    reviewCount,
    easeFactor,
    nextReview,
    lastReviewedAt: new Date().toISOString()
  });

  return true;
}

/**
 * Calculate next review date using SM-2
 */
function calculateNextReview(reviewCount, easeFactor = 2.5) {
  let interval;

  if (reviewCount === 0) {
    interval = 1; // 1 day
  } else if (reviewCount === 1) {
    interval = 6; // 6 days
  } else {
    interval = Math.round((reviewCount - 1) * easeFactor);
  }

  const nextDate = new Date();
  nextDate.setDate(nextDate.getDate() + interval);
  return nextDate.toISOString();
}

// ============================================
// AUTO-CAPTURE FROM CHAT
// ============================================

/**
 * Parse AI response for KidBrain markers
 * Format: [💡 KIDBRAIN: type|title|summary]
 */
export function parseKidBrainMarkers(text) {
  const markers = [];
  const regex = /\[💡 KIDBRAIN: (learned|discovered|remember)\|([^|]+)\|([^\]]+)\]/g;

  let match;
  while ((match = regex.exec(text)) !== null) {
    markers.push({
      type: match[1],
      title: match[2].trim(),
      content: match[3].trim()
    });
  }

  return markers;
}

/**
 * Remove KidBrain markers from text (for display)
 */
export function cleanKidBrainMarkers(text) {
  return text.replace(/\[💡 KIDBRAIN: [^\]]+\]/g, '').trim();
}

/**
 * Auto-save notes from chat response
 */
export async function autoSaveFromChat(userId, childId, sessionId, aiResponse, subject = null) {
  const markers = parseKidBrainMarkers(aiResponse);
  const savedNotes = [];

  for (const marker of markers) {
    const note = await createNote(userId, childId, {
      type: marker.type,
      title: marker.title,
      content: marker.content,
      subject,
      sessionId
    });

    if (note) {
      savedNotes.push(note);
    }
  }

  return savedNotes;
}

// ============================================
// STATS
// ============================================

/**
 * Update KidBrain stats
 */
async function updateStats(userId, childId, action) {
  if (!db) return;

  try {
    const statsRef = ref(db, `kidbrains/${userId}/${childId}/_metadata/stats`);
    const snapshot = await get(statsRef);
    const stats = snapshot.exists() ? snapshot.val() : {
      totalNotes: 0,
      learnedCount: 0,
      discoveredCount: 0,
      rememberCount: 0,
      reviewsDone: 0
    };

    if (action === 'noteCreated') {
      stats.totalNotes = (stats.totalNotes || 0) + 1;
    }

    stats.lastActivity = new Date().toISOString();

    await set(statsRef, stats);
  } catch (error) {
    console.error('Error updating stats:', error);
  }
}

/**
 * Get KidBrain stats
 */
export async function getStats(userId, childId) {
  if (!db) return null;

  try {
    const snapshot = await get(ref(db, `kidbrains/${userId}/${childId}/_metadata/stats`));
    return snapshot.exists() ? snapshot.val() : {
      totalNotes: 0,
      reviewsDone: 0
    };
  } catch (error) {
    console.error('Error getting stats:', error);
    return null;
  }
}

/**
 * Get stats by type
 */
export async function getStatsByType(userId, childId) {
  const notes = await getNotes(userId, childId, { limit: 1000 });

  const stats = {
    learned: 0,
    discovered: 0,
    remember: 0,
    total: notes.length
  };

  for (const note of notes) {
    if (stats[note.type] !== undefined) {
      stats[note.type]++;
    }
  }

  return stats;
}

// ============================================
// SEARCH
// ============================================

/**
 * Search notes by keyword
 */
export async function searchNotes(userId, childId, keyword) {
  const notes = await getNotes(userId, childId, { limit: 500 });
  const lowerKeyword = keyword.toLowerCase();

  return notes.filter(note => {
    const searchText = `${note.title} ${note.content}`.toLowerCase();
    return searchText.includes(lowerKeyword);
  });
}

/**
 * Get related notes (same subject or tags)
 */
export async function getRelatedNotes(userId, childId, noteId, limit = 5) {
  const note = await getNote(userId, childId, noteId);
  if (!note) return [];

  const allNotes = await getNotes(userId, childId, { limit: 200 });

  // Score by relevance
  const scored = allNotes
    .filter(n => n.id !== noteId)
    .map(n => {
      let score = 0;
      if (n.subject === note.subject) score += 3;
      if (n.type === note.type) score += 1;
      // Tag overlap
      const tagOverlap = (n.tags || []).filter(t => (note.tags || []).includes(t)).length;
      score += tagOverlap * 2;
      return { note: n, score };
    })
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.slice(0, limit).map(s => s.note);
}

// ============================================
// EXPORTS
// ============================================

export default {
  initKidBrain,
  NOTE_TYPES,
  // CRUD
  createNote,
  getNotes,
  getNote,
  updateNote,
  deleteNote,
  // Spaced repetition
  getNotesForReview,
  recordReview,
  // Auto-capture
  parseKidBrainMarkers,
  cleanKidBrainMarkers,
  autoSaveFromChat,
  // Stats
  getStats,
  getStatsByType,
  // Search
  searchNotes,
  getRelatedNotes
};
