/**
 * AI Tutor UI - Chat Interface
 * Tab view for tutoring sessions
 */

import {
  initTutor,
  startSession,
  sendMessage,
  endSession,
  getCurrentSession,
  getSessions,
  checkDailyLimit,
  updateDailyUsage
} from '../index.js';

import { NOTE_TYPES, getNotes, getNotesForReview, getStatsByType } from '../kidbrain.js';
import { TUTOR_PERSONAS, getPersonaForGrade } from '../persona.js';
import { exportKidBrain } from '../export-kidbrain.js';
import { initProfileEditor, showProfileEditor } from './profile-editor.js';

let currentChildId = null;
let currentChildName = null;
let currentChildGrade = null;
let currentUserId = null;
let isTyping = false;
let sessionStartTime = null;

// ============================================
// INITIALIZATION
// ============================================

export function initTutorUI(database, userId, childId, childName, grade) {
  initTutor(database);
  initProfileEditor(database, userId, childId);
  currentUserId = userId;
  currentChildId = childId;
  currentChildName = childName;
  currentChildGrade = grade;
}

export function showTutorView(container) {
  if (!container) return;

  container.innerHTML = renderTutorView();
  bindTutorEvents(container);
  loadSessionHistory();
}

// ============================================
// RENDER
// ============================================

function renderTutorView() {
  const persona = getPersonaForGrade(currentChildGrade || 4);

  return `
    <div class="tutor-container">
      <!-- Tutor Header -->
      <div class="tutor-header">
        <div class="tutor-header__persona">
          <span class="tutor-avatar">${persona.avatar}</span>
          <div class="tutor-info">
            <span class="tutor-name">${persona.name}</span>
            <span class="tutor-status" id="tutor-status">Sẵn sàng giúp đỡ</span>
          </div>
        </div>
        <div class="tutor-header__actions">
          <button class="btn btn--sm btn--outline" id="btn-edit-profile" title="Sửa hồ sơ con">
            👤 Hồ sơ
          </button>
          <button class="btn btn--sm btn--outline" id="btn-kidbrain" title="Xem kiến thức đã học">
            🧠 KidBrain
          </button>
          <button class="btn btn--sm btn--outline" id="btn-tutor-history" title="Lịch sử chat">
            📜 Lịch sử
          </button>
        </div>
      </div>

      <!-- Main Content Area -->
      <div class="tutor-content">
        <!-- Chat Panel (default) -->
        <div class="tutor-panel tutor-panel--active" id="panel-chat">
          <div class="chat-messages" id="chat-messages">
            <!-- Welcome message -->
            <div class="chat-welcome">
              <div class="welcome-avatar">${persona.avatar}</div>
              <h3>Xin chào ${currentChildName || 'bạn nhỏ'}!</h3>
              <p>Mình là ${persona.name}, gia sư AI của con. Hôm nay con muốn học gì nào?</p>
              <div class="quick-topics">
                <button class="topic-btn" data-subject="Toán">🔢 Toán</button>
                <button class="topic-btn" data-subject="Tiếng Việt">📚 Tiếng Việt</button>
                <button class="topic-btn" data-subject="Tiếng Anh">🔤 Tiếng Anh</button>
                <button class="topic-btn" data-subject="Khoa học">🔬 Khoa học</button>
              </div>
            </div>
          </div>

          <!-- Chat Input -->
          <div class="chat-input-area">
            <div class="daily-limit" id="daily-limit" style="display:none;">
              <span class="limit-text">⏰ Còn <strong id="remaining-time">30</strong> phút hôm nay</span>
            </div>
            <div class="chat-input-container">
              <textarea
                id="chat-input"
                placeholder="Nhập câu hỏi của con..."
                rows="1"
              ></textarea>
              <button class="btn-send" id="btn-send" disabled>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <!-- KidBrain Panel -->
        <div class="tutor-panel" id="panel-kidbrain">
          <div class="kidbrain-header">
            <button class="btn btn--sm btn--ghost" id="btn-back-chat">← Quay lại</button>
            <h3>🧠 KidBrain của ${currentChildName || 'con'}</h3>
            <button class="btn btn--sm btn--outline" id="btn-export-kidbrain" title="Export to Obsidian">
              📥 Export
            </button>
          </div>
          <div class="kidbrain-stats" id="kidbrain-stats">
            <!-- Stats rendered by JS -->
          </div>
          <div class="kidbrain-tabs">
            <button class="kb-tab kb-tab--active" data-type="all">Tất cả</button>
            <button class="kb-tab" data-type="learned">📚 Đã học</button>
            <button class="kb-tab" data-type="discovered">💡 Khám phá</button>
            <button class="kb-tab" data-type="remember">⭐ Ghi nhớ</button>
          </div>
          <div class="kidbrain-notes" id="kidbrain-notes">
            <!-- Notes rendered by JS -->
          </div>
        </div>

        <!-- History Panel -->
        <div class="tutor-panel" id="panel-history">
          <div class="history-header">
            <button class="btn btn--sm btn--ghost" id="btn-back-chat-2">← Quay lại</button>
            <h3>📜 Lịch sử chat</h3>
          </div>
          <div class="session-list" id="session-list">
            <!-- Sessions rendered by JS -->
          </div>
        </div>
      </div>

      <!-- Profile Editor Container (fullscreen overlay) -->
      <div id="profile-editor-container" style="display:none;"></div>
    </div>
  `;
}

// ============================================
// EVENT BINDING
// ============================================

function bindTutorEvents(container) {
  // Chat input
  const chatInput = container.querySelector('#chat-input');
  const btnSend = container.querySelector('#btn-send');

  chatInput?.addEventListener('input', () => {
    btnSend.disabled = !chatInput.value.trim();
    autoResizeTextarea(chatInput);
  });

  chatInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (chatInput.value.trim()) {
        handleSendMessage();
      }
    }
  });

  btnSend?.addEventListener('click', handleSendMessage);

  // Quick topic buttons
  container.querySelectorAll('.topic-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const subject = btn.dataset.subject;
      startTutorSession(subject);
    });
  });

  // Panel navigation
  container.querySelector('#btn-kidbrain')?.addEventListener('click', () => showPanel('kidbrain'));
  container.querySelector('#btn-tutor-history')?.addEventListener('click', () => showPanel('history'));
  container.querySelector('#btn-back-chat')?.addEventListener('click', () => showPanel('chat'));
  container.querySelector('#btn-back-chat-2')?.addEventListener('click', () => showPanel('chat'));

  // Profile Editor
  container.querySelector('#btn-edit-profile')?.addEventListener('click', () => {
    const editorContainer = container.querySelector('#profile-editor-container');
    if (editorContainer) {
      editorContainer.style.display = 'block';
      showProfileEditor(editorContainer);
    }
  });

  // Export KidBrain
  container.querySelector('#btn-export-kidbrain')?.addEventListener('click', handleExportKidBrain);

  // KidBrain tabs
  container.querySelectorAll('.kb-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      container.querySelectorAll('.kb-tab').forEach(t => t.classList.remove('kb-tab--active'));
      tab.classList.add('kb-tab--active');
      loadKidBrainNotes(tab.dataset.type);
    });
  });

  // Check daily limit
  checkAndShowDailyLimit();
}

// ============================================
// CHAT FUNCTIONS
// ============================================

async function startTutorSession(subject) {
  const limitCheck = await checkDailyLimit(currentUserId, currentChildId);

  if (!limitCheck.allowed) {
    showLimitReached(limitCheck.message);
    return;
  }

  const result = await startSession({
    userId: currentUserId,
    childId: currentChildId,
    childName: currentChildName,
    grade: currentChildGrade,
    subject
  });

  if (result.success) {
    sessionStartTime = Date.now();
    clearWelcome();
    addMessage('assistant', result.session.greeting, result.session.persona);
    updateStatus('Đang học ' + subject);
  } else {
    showError(result.error);
  }
}

async function handleSendMessage() {
  const chatInput = document.getElementById('chat-input');
  const message = chatInput.value.trim();

  if (!message || isTyping) return;

  // Check if session exists
  if (!getCurrentSession()) {
    // Start a general session
    await startTutorSession(null);
  }

  // Clear input
  chatInput.value = '';
  chatInput.style.height = 'auto';
  document.getElementById('btn-send').disabled = true;

  // Add user message
  addMessage('user', message);

  // Show typing indicator
  showTyping();
  isTyping = true;

  try {
    const result = await sendMessage(message);

    hideTyping();
    isTyping = false;

    if (result.success) {
      addMessage('assistant', result.message, result.persona, result.notesCreated);
    } else {
      if (result.errorCode === 'QUOTA_EXCEEDED') {
        showQuotaError();
      } else {
        showError(result.error);
      }
    }
  } catch (error) {
    hideTyping();
    isTyping = false;
    showError('Có lỗi xảy ra. Vui lòng thử lại.');
  }
}

function addMessage(role, content, persona = null, notesCreated = []) {
  const messagesContainer = document.getElementById('chat-messages');
  if (!messagesContainer) return;

  const messageEl = document.createElement('div');
  messageEl.className = `chat-message chat-message--${role}`;

  if (role === 'assistant' && persona) {
    messageEl.innerHTML = `
      <div class="message-avatar">${persona.avatar}</div>
      <div class="message-content">
        <div class="message-text">${formatMessage(content)}</div>
        ${notesCreated.length > 0 ? renderNotesCreated(notesCreated) : ''}
      </div>
    `;
  } else {
    messageEl.innerHTML = `
      <div class="message-content">
        <div class="message-text">${escapeHtml(content)}</div>
      </div>
    `;
  }

  messagesContainer.appendChild(messageEl);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function renderNotesCreated(notes) {
  if (!notes.length) return '';

  return `
    <div class="notes-created">
      <span class="notes-label">💡 Đã lưu vào KidBrain:</span>
      ${notes.map(n => `
        <span class="note-badge note-badge--${n.type}">
          ${NOTE_TYPES[n.type]?.icon || '📝'} ${n.title}
        </span>
      `).join('')}
    </div>
  `;
}

function showTyping() {
  const messagesContainer = document.getElementById('chat-messages');
  if (!messagesContainer) return;

  const persona = getPersonaForGrade(currentChildGrade);
  const typingEl = document.createElement('div');
  typingEl.className = 'chat-message chat-message--assistant chat-message--typing';
  typingEl.id = 'typing-indicator';
  typingEl.innerHTML = `
    <div class="message-avatar">${persona.avatar}</div>
    <div class="message-content">
      <div class="typing-dots">
        <span></span><span></span><span></span>
      </div>
    </div>
  `;

  messagesContainer.appendChild(typingEl);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function hideTyping() {
  document.getElementById('typing-indicator')?.remove();
}

function clearWelcome() {
  document.querySelector('.chat-welcome')?.remove();
}

function updateStatus(text) {
  const statusEl = document.getElementById('tutor-status');
  if (statusEl) statusEl.textContent = text;
}

// ============================================
// KIDBRAIN PANEL
// ============================================

async function loadKidBrainNotes(type = 'all') {
  const notesContainer = document.getElementById('kidbrain-notes');
  const statsContainer = document.getElementById('kidbrain-stats');

  if (!notesContainer) return;

  // Load stats
  const stats = await getStatsByType(currentUserId, currentChildId);
  if (statsContainer) {
    statsContainer.innerHTML = `
      <div class="kb-stat">
        <span class="kb-stat__value">${stats.total}</span>
        <span class="kb-stat__label">Tổng</span>
      </div>
      <div class="kb-stat kb-stat--learned">
        <span class="kb-stat__value">${stats.learned}</span>
        <span class="kb-stat__label">📚 Đã học</span>
      </div>
      <div class="kb-stat kb-stat--discovered">
        <span class="kb-stat__value">${stats.discovered}</span>
        <span class="kb-stat__label">💡 Khám phá</span>
      </div>
      <div class="kb-stat kb-stat--remember">
        <span class="kb-stat__value">${stats.remember}</span>
        <span class="kb-stat__label">⭐ Ghi nhớ</span>
      </div>
    `;
  }

  // Load notes
  const options = type !== 'all' ? { type } : {};
  const notes = await getNotes(currentUserId, currentChildId, options);

  if (!notes.length) {
    notesContainer.innerHTML = `
      <div class="empty-notes">
        <p>Chưa có kiến thức nào được lưu.</p>
        <p>Hãy chat với gia sư để bắt đầu học nhé!</p>
      </div>
    `;
    return;
  }

  notesContainer.innerHTML = notes.map(note => `
    <div class="kb-note kb-note--${note.type}">
      <div class="kb-note__header">
        <span class="kb-note__icon">${NOTE_TYPES[note.type]?.icon || '📝'}</span>
        <span class="kb-note__title">${escapeHtml(note.title)}</span>
        ${note.subject ? `<span class="kb-note__subject">${note.subject}</span>` : ''}
      </div>
      <div class="kb-note__content">${escapeHtml(note.content)}</div>
      <div class="kb-note__meta">
        ${formatDate(note.createdAt)}
      </div>
    </div>
  `).join('');
}

async function handleExportKidBrain() {
  const btn = document.getElementById('btn-export-kidbrain');
  if (!btn || !currentUserId || !currentChildId) return;

  btn.disabled = true;
  const originalText = btn.innerHTML;
  btn.innerHTML = '⏳ Đang export...';

  try {
    // Get database reference from window (set in app.js)
    const db = window.tutorDatabase;
    if (!db) {
      throw new Error('Database not available');
    }

    const result = await exportKidBrain(db, currentUserId, currentChildId, currentChildName);

    if (result.success) {
      btn.innerHTML = `✅ Đã export ${result.fileCount} files`;
    } else {
      btn.innerHTML = `❌ ${result.error}`;
    }
  } catch (error) {
    console.error('Export error:', error);
    btn.innerHTML = '❌ Lỗi export';
  }

  setTimeout(() => {
    btn.disabled = false;
    btn.innerHTML = originalText;
  }, 3000);
}

// ============================================
// HISTORY PANEL
// ============================================

async function loadSessionHistory() {
  const container = document.getElementById('session-list');
  if (!container) return;

  const sessions = await getSessions(currentUserId, currentChildId, 20);

  if (!sessions.length) {
    container.innerHTML = `
      <div class="empty-sessions">
        <p>Chưa có phiên học nào.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = sessions.map(session => `
    <div class="session-item" data-id="${session.id}">
      <div class="session-item__header">
        <span class="session-item__date">${formatDate(session.startedAt)}</span>
        ${session.subject ? `<span class="session-item__subject">${session.subject}</span>` : ''}
      </div>
      <div class="session-item__stats">
        <span>💬 ${session.messageCount || 0} tin nhắn</span>
        <span>⏱️ ${session.duration || 0} phút</span>
        ${session.notesCreated?.length ? `<span>📝 ${session.notesCreated.length} ghi chú</span>` : ''}
      </div>
    </div>
  `).join('');
}

// ============================================
// PANEL NAVIGATION
// ============================================

function showPanel(panelName) {
  document.querySelectorAll('.tutor-panel').forEach(p => p.classList.remove('tutor-panel--active'));
  document.getElementById(`panel-${panelName}`)?.classList.add('tutor-panel--active');

  if (panelName === 'kidbrain') {
    loadKidBrainNotes('all');
  } else if (panelName === 'history') {
    loadSessionHistory();
  }
}

// ============================================
// DAILY LIMIT
// ============================================

async function checkAndShowDailyLimit() {
  const limitCheck = await checkDailyLimit(currentUserId, currentChildId);
  const limitEl = document.getElementById('daily-limit');
  const remainingEl = document.getElementById('remaining-time');

  if (limitEl && remainingEl && limitCheck.limit) {
    remainingEl.textContent = limitCheck.remaining;
    limitEl.style.display = 'flex';

    if (!limitCheck.allowed) {
      showLimitReached(limitCheck.message);
    }
  }
}

function showLimitReached(message) {
  const messagesContainer = document.getElementById('chat-messages');
  if (!messagesContainer) return;

  messagesContainer.innerHTML = `
    <div class="limit-reached">
      <div class="limit-icon">⏰</div>
      <h3>Hết thời gian học hôm nay!</h3>
      <p>${message || 'Nghỉ ngơi đi nhé, mai học tiếp!'}</p>
    </div>
  `;

  // Disable input
  const chatInput = document.getElementById('chat-input');
  if (chatInput) {
    chatInput.disabled = true;
    chatInput.placeholder = 'Đã hết thời gian hôm nay...';
  }
}

function showQuotaError() {
  addMessage('assistant', '⚠️ Đã hết lượt chat miễn phí hôm nay. Nhờ ba mẹ thêm API key trong Cài đặt AI nhé!',
    getPersonaForGrade(currentChildGrade));
}

function showError(message) {
  const messagesContainer = document.getElementById('chat-messages');
  if (!messagesContainer) return;

  const errorEl = document.createElement('div');
  errorEl.className = 'chat-error';
  errorEl.innerHTML = `<span>❌ ${escapeHtml(message)}</span>`;
  messagesContainer.appendChild(errorEl);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// ============================================
// HELPERS
// ============================================

function autoResizeTextarea(textarea) {
  textarea.style.height = 'auto';
  textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
}

function formatMessage(text) {
  // Basic markdown-like formatting
  return escapeHtml(text)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>');
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(isoString) {
  if (!isoString) return '';
  const date = new Date(isoString);
  const now = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Hôm nay';
  if (diffDays === 1) return 'Hôm qua';
  if (diffDays < 7) return `${diffDays} ngày trước`;

  return date.toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric' });
}

// ============================================
// EXPORTS
// ============================================

export default {
  initTutorUI,
  showTutorView
};
