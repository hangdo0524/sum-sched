/**
 * Curriculum UI - Main interface for curriculum management
 */

import {
  getCurricula,
  getCurriculum,
  createCurriculumFromRoadmap,
  scheduleCurriculum,
  exportCurriculumPDF,
  exportCurriculumJSON,
  getSources
} from '../index.js';
import { getCurriculumProgress } from '../time-mapper.js';

let currentUserId = null;
let currentChildId = null;
let currentRoadmap = null;

// ============================================
// MAIN VIEW
// ============================================

/**
 * Show curriculum list view
 */
export async function showCurriculumView(userId, childId, roadmap, container) {
  currentUserId = userId;
  currentChildId = childId;
  currentRoadmap = roadmap;

  const curricula = await getCurricula(userId, childId);

  container.innerHTML = `
    <div class="curriculum-view">
      <div class="curriculum-header">
        <h2>📚 Giáo trình</h2>
        <button class="btn btn-primary" onclick="window.showCreateCurriculumModal()">
          ➕ Tạo giáo trình mới
        </button>
      </div>

      ${curricula.length === 0 ? `
        <div class="empty-state">
          <div class="empty-icon">📖</div>
          <h3>Chưa có giáo trình</h3>
          <p>Tạo giáo trình từ lộ trình để bắt đầu học</p>
          ${roadmap ? `
            <button class="btn btn-primary" onclick="window.showCreateCurriculumModal()">
              Tạo giáo trình đầu tiên
            </button>
          ` : `
            <p class="hint">Hãy tạo lộ trình trước trong tab "Định hướng"</p>
          `}
        </div>
      ` : `
        <div class="curriculum-grid">
          ${curricula.map(c => renderCurriculumCard(c)).join('')}
        </div>
      `}
    </div>
  `;
}

function renderCurriculumCard(curriculum) {
  const progress = getCurriculumProgress(curriculum);
  const subjectName = curriculum.subject?.name || 'Môn học';

  return `
    <div class="curriculum-card" onclick="window.openCurriculum('${curriculum.id}')">
      <div class="curriculum-card__header">
        <h3>${subjectName}</h3>
        <span class="grade-badge">Lớp ${curriculum.grade}</span>
      </div>

      <p class="curriculum-card__title">${curriculum.title || 'Chưa có tiêu đề'}</p>

      <div class="curriculum-card__meta">
        <span>📅 HK${curriculum.semester}</span>
        <span>📖 ${curriculum.totalLessons || 0} bài</span>
        <span>⏱️ ${curriculum.totalWeeks || 0} tuần</span>
      </div>

      <div class="progress-bar">
        <div class="progress-bar__fill" style="width: ${progress.percentage}%"></div>
      </div>
      <p class="progress-text">${progress.completed}/${progress.total} bài đã học (${progress.percentage}%)</p>

      <div class="curriculum-card__actions">
        <button class="btn btn-sm" onclick="event.stopPropagation(); window.exportCurriculumPDF('${curriculum.id}')">
          📄 PDF
        </button>
        <button class="btn btn-sm" onclick="event.stopPropagation(); window.exportCurriculumJSON('${curriculum.id}')">
          📥 JSON
        </button>
      </div>
    </div>
  `;
}

// ============================================
// CREATE CURRICULUM MODAL
// ============================================

/**
 * Show create curriculum modal
 */
export async function showCreateCurriculumModal() {
  const sources = await getSources(currentUserId);

  const modal = document.createElement('div');
  modal.id = 'create-curriculum-modal';
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content curriculum-modal">
      <div class="modal-header">
        <h3>➕ Tạo Giáo Trình Mới</h3>
        <button class="btn-close" onclick="window.closeCreateCurriculumModal()">&times;</button>
      </div>

      <div class="modal-body">
        <div class="form-section">
          <h4>📚 Thông tin cơ bản</h4>

          <div class="form-row">
            <div class="form-group">
              <label>Môn học</label>
              <select id="curriculum-subject">
                <option value="math">Toán</option>
                <option value="vietnamese">Tiếng Việt</option>
                <option value="english">Tiếng Anh</option>
                <option value="physics">Vật lý</option>
                <option value="chemistry">Hóa học</option>
                <option value="biology">Sinh học</option>
                <option value="history">Lịch sử</option>
                <option value="geography">Địa lý</option>
                <option value="science">Khoa học</option>
                <option value="informatics">Tin học</option>
              </select>
            </div>

            <div class="form-group">
              <label>Lớp</label>
              <select id="curriculum-grade">
                ${[1,2,3,4,5,6,7,8,9,10,11,12].map(g => `
                  <option value="${g}">Lớp ${g}</option>
                `).join('')}
              </select>
            </div>

            <div class="form-group">
              <label>Học kỳ</label>
              <select id="curriculum-semester">
                <option value="1">Học kỳ 1</option>
                <option value="2">Học kỳ 2</option>
              </select>
            </div>
          </div>
        </div>

        <div class="form-section">
          <h4>📖 Nguồn tham khảo</h4>
          <p class="form-hint">Chọn các nguồn để AI tham khảo khi tạo giáo trình</p>

          <div class="source-list">
            ${sources.map(s => `
              <label class="source-item ${s.isBuiltIn ? 'built-in' : 'custom'}">
                <input type="checkbox" name="curriculum-sources" value="${s.id}"
                       ${s.id === 'gdpt_2018' ? 'checked' : ''} />
                <span class="source-name">${s.name}</span>
                <span class="source-type">${s.isBuiltIn ? '📚 Chuẩn' : '📝 Tùy chỉnh'}</span>
              </label>
            `).join('')}
          </div>

          <button class="btn btn-outline btn-sm" onclick="window.showAddSourceModal()">
            ➕ Thêm nguồn mới
          </button>
        </div>

        <div class="form-section">
          <h4>💡 Yêu cầu bổ sung (tùy chọn)</h4>
          <textarea id="curriculum-custom-prompt" rows="3"
                    placeholder="VD: Tập trung vào các dạng bài thi, thêm nhiều bài tập nâng cao..."></textarea>
        </div>

        ${currentRoadmap ? `
          <div class="roadmap-context">
            <h4>🎯 Lộ trình hiện tại</h4>
            <p><strong>${currentRoadmap.selectedPathName || 'Chưa có tên'}</strong></p>
            <p>${currentRoadmap.ultimateGoal || ''}</p>
          </div>
        ` : `
          <div class="warning-box">
            ⚠️ Chưa có lộ trình. Giáo trình sẽ được tạo theo chương trình chuẩn.
          </div>
        `}
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="window.closeCreateCurriculumModal()">Hủy</button>
        <button class="btn btn-primary" onclick="window.generateCurriculum()">
          🤖 Tạo giáo trình
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
}

window.closeCreateCurriculumModal = function() {
  const modal = document.getElementById('create-curriculum-modal');
  if (modal) modal.remove();
};

window.showCreateCurriculumModal = showCreateCurriculumModal;

// ============================================
// GENERATE CURRICULUM
// ============================================

window.generateCurriculum = async function() {
  const subject = document.getElementById('curriculum-subject')?.value;
  const grade = parseInt(document.getElementById('curriculum-grade')?.value);
  const semester = document.getElementById('curriculum-semester')?.value;
  const customPrompt = document.getElementById('curriculum-custom-prompt')?.value;

  const sourceCheckboxes = document.querySelectorAll('input[name="curriculum-sources"]:checked');
  const sourceIds = Array.from(sourceCheckboxes).map(cb => cb.value);

  if (!subject || !grade) {
    alert('Vui lòng chọn môn học và lớp');
    return;
  }

  // Show loading
  const footer = document.querySelector('#create-curriculum-modal .modal-footer');
  footer.innerHTML = `
    <div class="generating">
      <div class="spinner"></div>
      <span>🤖 AI đang tạo giáo trình... (có thể mất 1-2 phút)</span>
    </div>
  `;

  try {
    const result = await createCurriculumFromRoadmap({
      userId: currentUserId,
      childId: currentChildId,
      roadmap: currentRoadmap,
      subject,
      grade,
      semester,
      sourceIds,
      customPrompt: customPrompt || null
    });

    if (result.error) {
      alert('❌ Lỗi: ' + result.error);
      footer.innerHTML = `
        <button class="btn btn-secondary" onclick="window.closeCreateCurriculumModal()">Hủy</button>
        <button class="btn btn-primary" onclick="window.generateCurriculum()">🔄 Thử lại</button>
      `;
      return;
    }

    alert('✅ Đã tạo giáo trình thành công!');
    window.closeCreateCurriculumModal();

    // Refresh view
    const container = document.querySelector('.curriculum-view')?.parentElement;
    if (container) {
      showCurriculumView(currentUserId, currentChildId, currentRoadmap, container);
    }

  } catch (error) {
    alert('❌ Lỗi: ' + error.message);
    footer.innerHTML = `
      <button class="btn btn-secondary" onclick="window.closeCreateCurriculumModal()">Hủy</button>
      <button class="btn btn-primary" onclick="window.generateCurriculum()">🔄 Thử lại</button>
    `;
  }
};

// ============================================
// CURRICULUM DETAIL VIEW
// ============================================

window.openCurriculum = async function(curriculumId) {
  const curriculum = await getCurriculum(currentUserId, currentChildId, curriculumId);
  if (!curriculum) {
    alert('Không tìm thấy giáo trình');
    return;
  }

  showCurriculumDetail(curriculum);
};

function showCurriculumDetail(curriculum) {
  const modal = document.createElement('div');
  modal.id = 'curriculum-detail-modal';
  modal.className = 'modal-overlay';

  const progress = getCurriculumProgress(curriculum);

  modal.innerHTML = `
    <div class="modal-content curriculum-detail-modal">
      <div class="modal-header">
        <div>
          <h3>${curriculum.subject?.name || 'Môn học'} - Lớp ${curriculum.grade}</h3>
          <p class="subtitle">${curriculum.title}</p>
        </div>
        <button class="btn-close" onclick="document.getElementById('curriculum-detail-modal').remove()">&times;</button>
      </div>

      <div class="curriculum-detail-body">
        <div class="curriculum-stats">
          <div class="stat">
            <span class="stat-value">${curriculum.totalLessons || 0}</span>
            <span class="stat-label">Bài học</span>
          </div>
          <div class="stat">
            <span class="stat-value">${curriculum.totalWeeks || 0}</span>
            <span class="stat-label">Tuần</span>
          </div>
          <div class="stat">
            <span class="stat-value">${progress.percentage}%</span>
            <span class="stat-label">Hoàn thành</span>
          </div>
        </div>

        <div class="curriculum-objectives">
          <h4>🎯 Mục tiêu</h4>
          <ul>
            ${(curriculum.objectives || []).map(obj => `<li>${obj}</li>`).join('')}
          </ul>
        </div>

        <div class="curriculum-units">
          <h4>📖 Nội dung</h4>
          ${(curriculum.units || []).map(unit => `
            <div class="unit-accordion">
              <div class="unit-header" onclick="this.parentElement.classList.toggle('expanded')">
                <span class="unit-title">${unit.title}</span>
                <span class="unit-meta">${unit.lessons?.length || 0} bài | ${unit.duration}</span>
                <span class="expand-icon">▼</span>
              </div>
              <div class="unit-content">
                <ul class="lesson-list">
                  ${(unit.lessons || []).map(lesson => `
                    <li class="lesson-item ${lesson.completedAt ? 'completed' : ''}">
                      <span class="lesson-type ${lesson.type}">${getLessonTypeIcon(lesson.type)}</span>
                      <span class="lesson-title">${lesson.title}</span>
                      <span class="lesson-duration">${lesson.duration} phút</span>
                      ${lesson.scheduledDate ? `<span class="lesson-date">${formatDate(lesson.scheduledDate)}</span>` : ''}
                    </li>
                  `).join('')}
                </ul>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-outline" onclick="window.exportCurriculumPDF('${curriculum.id}')">📄 Xuất PDF</button>
        <button class="btn btn-outline" onclick="window.exportCurriculumJSON('${curriculum.id}')">📥 Xuất JSON</button>
        <button class="btn btn-primary" onclick="window.showScheduleModal('${curriculum.id}')">📅 Xếp lịch</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
}

function getLessonTypeIcon(type) {
  const icons = {
    concept: '📚',
    practice: '✏️',
    review: '🔄',
    assessment: '📝'
  };
  return icons[type] || '📖';
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

// ============================================
// EXPORT FUNCTIONS
// ============================================

window.exportCurriculumPDF = async function(curriculumId) {
  const result = await exportCurriculumPDF(currentUserId, currentChildId, curriculumId);
  if (result.error) {
    alert('❌ ' + result.error);
  }
};

window.exportCurriculumJSON = async function(curriculumId) {
  const result = await exportCurriculumJSON(currentUserId, currentChildId, curriculumId);
  if (!result) {
    alert('❌ Không thể xuất JSON');
  }
};

// ============================================
// SCHEDULE MODAL
// ============================================

window.showScheduleModal = async function(curriculumId) {
  // TODO: Implement schedule modal
  alert('Tính năng xếp lịch sẽ được thêm sau');
};

// ============================================
// ADD SOURCE MODAL
// ============================================

window.showAddSourceModal = function() {
  // TODO: Implement add source modal
  alert('Tính năng thêm nguồn sẽ được thêm sau');
};

// ============================================
// EXPORTS
// ============================================

export default {
  showCurriculumView,
  showCreateCurriculumModal
};
