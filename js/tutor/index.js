/**
 * AI Tutor - Main Entry Point
 * Chat engine with persona and KidBrain integration
 */

import { ref, get, set, push } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js';
import { aiProvider } from '../ai/index.js';
import { getPersonaForGrade, buildSystemPrompt } from './persona.js';
import {
  initKidBrain,
  autoSaveFromChat,
  cleanKidBrainMarkers,
  parseKidBrainMarkers
} from './kidbrain.js';

let db = null;

// Session state
let currentSession = null;

export function initTutor(database) {
  db = database;
  initKidBrain(database);
}

// ============================================
// SESSION MANAGEMENT
// ============================================

/**
 * Start a new tutoring session
 */
export async function startSession(options) {
  const {
    userId,
    childId,
    childName,
    grade,
    subject = null,
    lessonId = null,
    lessonTitle = null,
    lessonObjectives = null
  } = options;

  // Get persona based on grade
  const persona = getPersonaForGrade(grade);

  // Build system prompt with context
  const systemPrompt = buildSystemPrompt(persona, {
    subject,
    lessonTitle,
    lessonObjectives,
    childName
  });

  // Create session
  const session = {
    userId,
    childId,
    childName,
    grade,
    subject,
    lessonId,
    persona: persona.id,
    messages: [],
    systemPrompt,
    startedAt: new Date().toISOString(),
    notesCreated: []
  };

  // Save to Firebase
  try {
    const sessionsRef = ref(db, `kidbrains/${userId}/${childId}/sessions`);
    const newSessionRef = push(sessionsRef);
    session.id = newSessionRef.key;

    await set(newSessionRef, {
      ...session,
      messages: [] // Don't save messages array initially
    });

    currentSession = session;

    return {
      success: true,
      session: {
        id: session.id,
        persona,
        greeting: generateGreeting(persona, childName, subject)
      }
    };

  } catch (error) {
    console.error('Error starting session:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send a message in current session
 */
export async function sendMessage(userMessage) {
  if (!currentSession) {
    return { success: false, error: 'No active session' };
  }

  const { userId, childId, subject, systemPrompt, messages, persona: personaId } = currentSession;
  const persona = getPersonaForGrade(currentSession.grade);

  // Add user message to history
  messages.push({
    role: 'user',
    content: userMessage,
    timestamp: new Date().toISOString()
  });

  try {
    // Prepare messages for AI
    const aiMessages = messages.map(m => ({
      role: m.role,
      content: m.content
    }));

    // Call AI
    const response = await aiProvider.chat({
      task: subject ? `tutor_${subject}` : 'tutor_session',
      messages: aiMessages,
      systemPrompt,
      temperature: 0.7,
      maxTokens: 1000
    });

    if (!response.success) {
      return { success: false, error: response.error?.message || 'AI error' };
    }

    let aiContent = response.content;

    // Check for KidBrain markers
    const markers = parseKidBrainMarkers(aiContent);
    let savedNotes = [];

    if (markers.length > 0) {
      // Auto-save notes
      savedNotes = await autoSaveFromChat(
        userId,
        childId,
        currentSession.id,
        aiContent,
        subject
      );

      // Track in session
      currentSession.notesCreated.push(...savedNotes.map(n => n.id));

      // Clean markers from display text
      aiContent = cleanKidBrainMarkers(aiContent);
    }

    // Add AI response to history
    const aiMessage = {
      role: 'assistant',
      content: aiContent,
      timestamp: new Date().toISOString(),
      notesCreated: savedNotes.map(n => ({ id: n.id, type: n.type, title: n.title }))
    };
    messages.push(aiMessage);

    // Save updated messages to Firebase
    await saveSessionMessages(userId, childId, currentSession.id, messages);

    return {
      success: true,
      message: aiContent,
      notesCreated: savedNotes,
      persona
    };

  } catch (error) {
    console.error('Error sending message:', error);

    // Handle quota exceeded
    if (error.code === 'QUOTA_EXCEEDED') {
      return {
        success: false,
        error: 'Đã hết lượt chat hôm nay. Hãy thêm API key trong Cài đặt AI.',
        errorCode: 'QUOTA_EXCEEDED'
      };
    }

    return { success: false, error: error.message || 'Lỗi không xác định' };
  }
}

/**
 * End current session
 */
export async function endSession() {
  if (!currentSession) return null;

  const { userId, childId, id, messages, notesCreated, startedAt } = currentSession;

  // Calculate duration
  const duration = Math.round((Date.now() - new Date(startedAt).getTime()) / 1000 / 60);

  // Update session with end time
  try {
    await set(ref(db, `kidbrains/${userId}/${childId}/sessions/${id}/endedAt`), new Date().toISOString());
    await set(ref(db, `kidbrains/${userId}/${childId}/sessions/${id}/duration`), duration);
    await set(ref(db, `kidbrains/${userId}/${childId}/sessions/${id}/messageCount`), messages.length);
  } catch (error) {
    console.error('Error ending session:', error);
  }

  const summary = {
    sessionId: id,
    duration,
    messageCount: messages.length,
    notesCreated: notesCreated.length
  };

  currentSession = null;

  return summary;
}

/**
 * Get current session
 */
export function getCurrentSession() {
  return currentSession;
}

// ============================================
// SESSION HISTORY
// ============================================

/**
 * Get past sessions
 */
export async function getSessions(userId, childId, limit = 20) {
  if (!db) return [];

  try {
    const snapshot = await get(ref(db, `kidbrains/${userId}/${childId}/sessions`));
    if (!snapshot.exists()) return [];

    const sessions = [];
    snapshot.forEach(child => {
      sessions.push({ id: child.key, ...child.val() });
    });

    // Sort by startedAt desc
    sessions.sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));

    return sessions.slice(0, limit);

  } catch (error) {
    console.error('Error getting sessions:', error);
    return [];
  }
}

/**
 * Get session messages
 */
export async function getSessionMessages(userId, childId, sessionId) {
  if (!db) return [];

  try {
    const snapshot = await get(ref(db, `kidbrains/${userId}/${childId}/sessions/${sessionId}/messages`));
    if (!snapshot.exists()) return [];

    const messages = [];
    snapshot.forEach(child => {
      messages.push(child.val());
    });

    return messages;

  } catch (error) {
    console.error('Error getting session messages:', error);
    return [];
  }
}

/**
 * Save session messages
 */
async function saveSessionMessages(userId, childId, sessionId, messages) {
  if (!db) return;

  try {
    await set(ref(db, `kidbrains/${userId}/${childId}/sessions/${sessionId}/messages`), messages);
  } catch (error) {
    console.error('Error saving messages:', error);
  }
}

// ============================================
// HELPERS
// ============================================

/**
 * Generate greeting based on persona and context
 */
function generateGreeting(persona, childName, subject) {
  const greetings = {
    elementary: [
      `Chào ${childName}! ${persona.avatar} Cô là ${persona.name}, hôm nay ${subject ? `mình học ${subject}` : 'mình học gì'} nhé!`,
      `${childName} ơi! ${persona.avatar} Cô ${persona.name} đây! Sẵn sàng học chưa nào?`,
      `Xin chào ${childName}! ${persona.avatar} Cô rất vui được gặp con! ${subject ? `Hôm nay học ${subject}` : 'Con muốn học gì'} nè?`
    ],
    middle: [
      `Chào ${childName}! Thầy là ${persona.name}. ${subject ? `Hôm nay chúng ta sẽ học ${subject}` : 'Em muốn học gì hôm nay'}?`,
      `Xin chào ${childName}! ${persona.name} đây. ${subject ? `Sẵn sàng cho bài ${subject}` : 'Em cần thầy giúp gì'} nhé!`
    ],
    high: [
      `Chào ${childName}. ${persona.name} đây. ${subject ? `Hôm nay ta xem ${subject}` : 'Em cần hỗ trợ gì'}?`,
      `Xin chào ${childName}! ${subject ? `Sẵn sàng cho ${subject}` : 'Em muốn thảo luận vấn đề gì'} hôm nay?`
    ]
  };

  const list = greetings[persona.id] || greetings.elementary;
  return list[Math.floor(Math.random() * list.length)];
}

/**
 * Check daily chat limit
 */
export async function checkDailyLimit(userId, childId) {
  if (!db) return { allowed: true };

  const today = new Date().toISOString().split('T')[0];

  try {
    const snapshot = await get(ref(db, `kidbrains/${userId}/${childId}/settings`));
    const settings = snapshot.exists() ? snapshot.val() : {};

    const dailyLimit = settings.dailyLimit || 30; // 30 minutes default
    const lastActiveDate = settings.lastActiveDate;
    const todayMinutes = settings.todayMinutes || 0;

    // Reset if new day
    if (lastActiveDate !== today) {
      await set(ref(db, `kidbrains/${userId}/${childId}/settings/lastActiveDate`), today);
      await set(ref(db, `kidbrains/${userId}/${childId}/settings/todayMinutes`), 0);
      return { allowed: true, remaining: dailyLimit, limit: dailyLimit };
    }

    const remaining = dailyLimit - todayMinutes;

    if (remaining <= 0) {
      return {
        allowed: false,
        remaining: 0,
        limit: dailyLimit,
        message: 'Đã hết thời gian học hôm nay. Nghỉ ngơi đi nhé!'
      };
    }

    return { allowed: true, remaining, limit: dailyLimit };

  } catch (error) {
    console.error('Error checking limit:', error);
    return { allowed: true };
  }
}

/**
 * Update daily usage
 */
export async function updateDailyUsage(userId, childId, minutes) {
  if (!db) return;

  const today = new Date().toISOString().split('T')[0];

  try {
    const snapshot = await get(ref(db, `kidbrains/${userId}/${childId}/settings/todayMinutes`));
    const current = snapshot.exists() ? snapshot.val() : 0;

    await set(ref(db, `kidbrains/${userId}/${childId}/settings/todayMinutes`), current + minutes);
    await set(ref(db, `kidbrains/${userId}/${childId}/settings/lastActiveDate`), today);

  } catch (error) {
    console.error('Error updating usage:', error);
  }
}

// ============================================
// EXPORTS
// ============================================

export default {
  initTutor,
  // Session
  startSession,
  sendMessage,
  endSession,
  getCurrentSession,
  // History
  getSessions,
  getSessionMessages,
  // Limits
  checkDailyLimit,
  updateDailyUsage
};
