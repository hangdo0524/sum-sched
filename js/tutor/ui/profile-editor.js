/**
 * Profile & Records Editor UI
 * Parent can edit child profile, interests, challenges, and records
 */

import { ref, get, set, push } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js';

let db = null;
let currentUserId = null;
let currentChildId = null;
let currentProfile = null;

// ============================================
// INITIALIZATION
// ============================================

export function initProfileEditor(database, userId, childId) {
  db = database;
  currentUserId = userId;
  currentChildId = childId;
}

// ============================================
// DATA OPERATIONS
// ============================================

async function loadProfile() {
  if (!db || !currentUserId || !currentChildId) return null;

  try {
    // Load child basic info
    const childSnap = await get(ref(db, `families/${currentUserId}/children/${currentChildId}`));
    const child = childSnap.exists() ? childSnap.val() : {};

    // Load extended profile (kidbrain profile)
    const profileSnap = await get(ref(db, `kidbrain/${currentUserId}/${currentChildId}/profile`));
    const extProfile = profileSnap.exists() ? profileSnap.val() : {};

    // Load records
    const recordsSnap = await get(ref(db, `kidbrain/${currentUserId}/${currentChildId}/records`));
    const records = recordsSnap.exists() ? recordsSnap.val() : {};

    currentProfile = {
      ...child,
      ...extProfile,
      records: records
    };

    return currentProfile;
  } catch (error) {
    console.error('Error loading profile:', error);
    return null;
  }
}

async function saveBasicInfo(data) {
  if (!db || !currentUserId || !currentChildId) return false;

  try {
    const childRef = ref(db, `families/${currentUserId}/children/${currentChildId}`);
    const snapshot = await get(childRef);
    const current = snapshot.exists() ? snapshot.val() : {};

    await set(childRef, {
      ...current,
      name: data.name,
      grade: data.grade,
      school: data.school,
      birthDate: data.birthDate,
      updatedAt: new Date().toISOString()
    });

    return true;
  } catch (error) {
    console.error('Error saving basic info:', error);
    return false;
  }
}

async function saveExtendedProfile(data) {
  if (!db || !currentUserId || !currentChildId) return false;

  try {
    const profileRef = ref(db, `kidbrain/${currentUserId}/${currentChildId}/profile`);

    await set(profileRef, {
      interests: data.interests || [],
      strengths: data.strengths || [],
      challenges: data.challenges || [],
      learningStyle: data.learningStyle || null,
      parentNotes: data.parentNotes || '',
      updatedAt: new Date().toISOString()
    });

    return true;
  } catch (error) {
    console.error('Error saving extended profile:', error);
    return false;
  }
}

async function addRecord(record) {
  if (!db || !currentUserId || !currentChildId) return null;

  try {
    const recordsRef = ref(db, `kidbrain/${currentUserId}/${currentChildId}/records`);
    const newRecordRef = push(recordsRef);

    const newRecord = {
      ...record,
      createdAt: new Date().toISOString()
    };

    await set(newRecordRef, newRecord);
    return { id: newRecordRef.key, ...newRecord };
  } catch (error) {
    console.error('Error adding record:', error);
    return null;
  }
}

async function deleteRecord(recordId) {
  if (!db || !currentUserId || !currentChildId || !recordId) return false;

  try {
    await set(ref(db, `kidbrain/${currentUserId}/${currentChildId}/records/${recordId}`), null);
    return true;
  } catch (error) {
    console.error('Error deleting record:', error);
    return false;
  }
}

// ============================================
// RENDER
// ============================================

export async function showProfileEditor(container) {
  if (!container) return;

  container.innerHTML = '<div class="loading">Đang tải...</div>';

  const profile = await loadProfile();

  container.innerHTML = renderProfileEditor(profile);
  bindProfileEvents(container);
}

function renderProfileEditor(profile) {
  const p = profile || {};
  const records = p.records || {};

  return `
    <div class="profile-editor">
      <div class="profile-editor__header">
        <h2>👤 Hồ sơ của ${p.name || 'Con'}</h2>
        <button class="btn btn--sm btn--ghost" id="btn-close-profile">✕</button>
      </div>

      <div class="profile-editor__content">
        <!-- Basic Info Section -->
        <section class="profile-section">
          <h3>📋 Thông tin cơ bản</h3>
          <form id="form-basic-info" class="profile-form">
            <div class="form-row">
              <label>Tên con</label>
              <input type="text" name="name" value="${escapeAttr(p.name || '')}" required>
            </div>
            <div class="form-row">
              <label>Lớp</label>
              <select name="grade">
                <option value="">-- Chọn lớp --</option>
                ${[1,2,3,4,5,6,7,8,9,10,11,12].map(g =>
                  `<option value="${g}" ${p.grade == g ? 'selected' : ''}>Lớp ${g}</option>`
                ).join('')}
              </select>
            </div>
            <div class="form-row">
              <label>Trường</label>
              <input type="text" name="school" value="${escapeAttr(p.school || '')}" placeholder="VD: Trường Tiểu học ABC">
            </div>
            <div class="form-row">
              <label>Ngày sinh</label>
              <input type="date" name="birthDate" value="${p.birthDate || ''}">
            </div>
            <button type="submit" class="btn btn--primary">💾 Lưu thông tin</button>
          </form>
        </section>

        <!-- Interests & Strengths Section -->
        <section class="profile-section">
          <h3>⭐ Sở thích & Thế mạnh</h3>
          <form id="form-interests" class="profile-form">
            <div class="form-row">
              <label>Sở thích (mỗi dòng 1 sở thích)</label>
              <textarea name="interests" rows="3" placeholder="VD:\nĐọc sách\nVẽ tranh\nChơi cờ vua">${(p.interests || []).join('\n')}</textarea>
            </div>
            <div class="form-row">
              <label>Thế mạnh</label>
              <textarea name="strengths" rows="3" placeholder="VD:\nTư duy logic tốt\nSáng tạo\nKiên nhẫn">${(p.strengths || []).join('\n')}</textarea>
            </div>
            <div class="form-row">
              <label>Thử thách cần vượt qua</label>
              <textarea name="challenges" rows="3" placeholder="VD:\nNhút nhát khi nói tiếng Anh\nHay quên làm bài tập">${(p.challenges || []).join('\n')}</textarea>
            </div>
            <div class="form-row">
              <label>Phong cách học tập</label>
              <select name="learningStyle">
                <option value="">-- Chưa xác định --</option>
                <option value="visual" ${p.learningStyle === 'visual' ? 'selected' : ''}>👁️ Thị giác (xem hình ảnh, video)</option>
                <option value="auditory" ${p.learningStyle === 'auditory' ? 'selected' : ''}>👂 Thính giác (nghe giảng, thảo luận)</option>
                <option value="kinesthetic" ${p.learningStyle === 'kinesthetic' ? 'selected' : ''}>✋ Vận động (thực hành, làm tay)</option>
                <option value="reading" ${p.learningStyle === 'reading' ? 'selected' : ''}>📖 Đọc/Viết (sách, ghi chép)</option>
              </select>
            </div>
            <button type="submit" class="btn btn--primary">💾 Lưu</button>
          </form>
        </section>

        <!-- Parent Notes Section -->
        <section class="profile-section">
          <h3>📝 Ghi chú của mẹ</h3>
          <form id="form-parent-notes" class="profile-form">
            <div class="form-row">
              <textarea name="parentNotes" rows="5" placeholder="Ghi chú quan sát, quyết định giáo dục...">${escapeAttr(p.parentNotes || '')}</textarea>
            </div>
            <button type="submit" class="btn btn--primary">💾 Lưu ghi chú</button>
          </form>
        </section>

        <!-- Records Section -->
        <section class="profile-section">
          <h3>🏆 Thành tích & Ghi nhận</h3>
          <div class="records-list" id="records-list">
            ${renderRecordsList(records)}
          </div>
          <button class="btn btn--outline" id="btn-add-record">+ Thêm ghi nhận</button>

          <!-- Add Record Form (hidden by default) -->
          <form id="form-add-record" class="profile-form" style="display:none; margin-top: 16px;">
            <div class="form-row">
              <label>Loại</label>
              <select name="type" required>
                <option value="achievement">🏆 Thành tích</option>
                <option value="milestone">🎯 Cột mốc</option>
                <option value="observation">👀 Quan sát</option>
                <option value="concern">⚠️ Lưu ý</option>
              </select>
            </div>
            <div class="form-row">
              <label>Tiêu đề</label>
              <input type="text" name="title" required placeholder="VD: Đạt giải Ba Toán cấp Quận">
            </div>
            <div class="form-row">
              <label>Ngày</label>
              <input type="date" name="date" value="${new Date().toISOString().split('T')[0]}">
            </div>
            <div class="form-row">
              <label>Chi tiết</label>
              <textarea name="description" rows="3" placeholder="Mô tả chi tiết..."></textarea>
            </div>
            <div class="form-actions">
              <button type="submit" class="btn btn--primary">💾 Lưu</button>
              <button type="button" class="btn btn--ghost" id="btn-cancel-record">Hủy</button>
            </div>
          </form>
        </section>
      </div>
    </div>
  `;
}

function renderRecordsList(records) {
  const recordsArray = Object.entries(records || {})
    .map(([id, r]) => ({ id, ...r }))
    .sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));

  if (!recordsArray.length) {
    return '<p class="empty-text">Chưa có ghi nhận nào</p>';
  }

  const typeIcons = {
    achievement: '🏆',
    milestone: '🎯',
    observation: '👀',
    concern: '⚠️'
  };

  return recordsArray.map(r => `
    <div class="record-item record-item--${r.type || 'observation'}">
      <div class="record-item__icon">${typeIcons[r.type] || '📝'}</div>
      <div class="record-item__content">
        <div class="record-item__title">${escapeHtml(r.title)}</div>
        ${r.description ? `<div class="record-item__desc">${escapeHtml(r.description)}</div>` : ''}
        <div class="record-item__date">${formatDate(r.date || r.createdAt)}</div>
      </div>
      <button class="btn btn--sm btn--ghost btn-delete-record" data-id="${r.id}" title="Xóa">🗑️</button>
    </div>
  `).join('');
}

// ============================================
// EVENT BINDING
// ============================================

function bindProfileEvents(container) {
  // Close button
  container.querySelector('#btn-close-profile')?.addEventListener('click', () => {
    container.innerHTML = '';
    container.style.display = 'none';
  });

  // Basic info form
  container.querySelector('#form-basic-info')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Đang lưu...';

    const data = {
      name: form.name.value.trim(),
      grade: form.grade.value ? parseInt(form.grade.value) : null,
      school: form.school.value.trim(),
      birthDate: form.birthDate.value || null
    };

    const success = await saveBasicInfo(data);
    btn.textContent = success ? '✅ Đã lưu!' : '❌ Lỗi';
    setTimeout(() => {
      btn.disabled = false;
      btn.textContent = '💾 Lưu thông tin';
    }, 2000);
  });

  // Interests form
  container.querySelector('#form-interests')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Đang lưu...';

    const data = {
      interests: form.interests.value.split('\n').map(s => s.trim()).filter(Boolean),
      strengths: form.strengths.value.split('\n').map(s => s.trim()).filter(Boolean),
      challenges: form.challenges.value.split('\n').map(s => s.trim()).filter(Boolean),
      learningStyle: form.learningStyle.value || null
    };

    const success = await saveExtendedProfile(data);
    btn.textContent = success ? '✅ Đã lưu!' : '❌ Lỗi';
    setTimeout(() => {
      btn.disabled = false;
      btn.textContent = '💾 Lưu';
    }, 2000);
  });

  // Parent notes form
  container.querySelector('#form-parent-notes')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;

    const profile = await loadProfile();
    const success = await saveExtendedProfile({
      ...profile,
      parentNotes: form.parentNotes.value
    });

    btn.textContent = success ? '✅ Đã lưu!' : '❌ Lỗi';
    setTimeout(() => {
      btn.disabled = false;
      btn.textContent = '💾 Lưu ghi chú';
    }, 2000);
  });

  // Add record button
  container.querySelector('#btn-add-record')?.addEventListener('click', () => {
    container.querySelector('#form-add-record').style.display = 'block';
    container.querySelector('#btn-add-record').style.display = 'none';
  });

  // Cancel add record
  container.querySelector('#btn-cancel-record')?.addEventListener('click', () => {
    container.querySelector('#form-add-record').style.display = 'none';
    container.querySelector('#btn-add-record').style.display = 'block';
    container.querySelector('#form-add-record').reset();
  });

  // Add record form
  container.querySelector('#form-add-record')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;

    const record = {
      type: form.type.value,
      title: form.title.value.trim(),
      date: form.date.value,
      description: form.description.value.trim()
    };

    const result = await addRecord(record);
    if (result) {
      form.reset();
      form.style.display = 'none';
      container.querySelector('#btn-add-record').style.display = 'block';
      // Reload records list
      const profile = await loadProfile();
      container.querySelector('#records-list').innerHTML = renderRecordsList(profile.records);
      bindDeleteRecordEvents(container);
    }
    btn.disabled = false;
  });

  // Delete record buttons
  bindDeleteRecordEvents(container);
}

function bindDeleteRecordEvents(container) {
  container.querySelectorAll('.btn-delete-record').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.id;
      if (!confirm('Xóa ghi nhận này?')) return;

      btn.disabled = true;
      const success = await deleteRecord(id);
      if (success) {
        btn.closest('.record-item').remove();
      } else {
        btn.disabled = false;
        alert('Lỗi khi xóa');
      }
    });
  });
}

// ============================================
// HELPERS
// ============================================

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(str) {
  return escapeHtml(str).replace(/'/g, '&#39;');
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

export default {
  initProfileEditor,
  showProfileEditor
};
