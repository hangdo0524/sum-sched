/**
 * Strategic Planning UI
 * Form nhập năng lực, mục tiêu → AI phân tích → Lộ trình 12 năm
 */

import {
  SUBJECT_LEVELS,
  SKILL_LEVELS,
  LEARNING_STYLES,
  ACADEMIC_PRIORITIES,
  SUBJECTS_BY_LEVEL,
  SKILLS,
  createEmptyStudentContext,
  saveStudentContext,
  getStudentContext,
  createEmptyFamilyAspirations,
  saveFamilyAspirations,
  getFamilyAspirations,
  generateAnalysisPrompt,
  analyzeWithAI,
  saveAIRecommendation,
  getAIRecommendation,
  saveRoadmap,
  getRoadmap,
  generateRoadmapFromRecommendation
} from './strategic-planning.js';

// State
let planningState = {
  step: 1,
  userId: null,
  childId: null,
  childInfo: null,
  studentContext: null,
  familyAspirations: null,
  aiRecommendation: null,
  roadmap: null
};

// ============================================
// MAIN WIZARD
// ============================================

export async function showStrategicPlanningWizard(userId, childId, childInfo) {
  // Load existing data
  const existingContext = await getStudentContext(userId, childId);
  const existingAspirations = await getFamilyAspirations(userId, childId);
  const existingRecommendation = await getAIRecommendation(userId, childId);
  const existingRoadmap = await getRoadmap(userId, childId);

  planningState = {
    step: 1,
    userId,
    childId,
    childInfo,
    studentContext: existingContext || createEmptyStudentContext(childInfo.grade || 4),
    familyAspirations: existingAspirations || createEmptyFamilyAspirations(),
    aiRecommendation: existingRecommendation,
    roadmap: existingRoadmap
  };

  showPlanningModal();
  renderPlanningStep(1);
}

function showPlanningModal() {
  let modal = document.getElementById('strategic-planning-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'strategic-planning-modal';
    modal.className = 'planning-modal-overlay';
    document.body.appendChild(modal);
  }
  modal.style.display = 'flex';
  modal.innerHTML = `
    <div class="planning-modal-backdrop" onclick="window.closeStrategicPlanning()"></div>
    <div class="planning-modal-content">
      <div class="planning-modal-header">
        <h3>🎯 Định Hướng Chiến Lược</h3>
        <div class="planning-steps" id="planning-steps">
          <span class="step active" data-step="1">1. Năng lực</span>
          <span class="step" data-step="2">2. Mục tiêu</span>
          <span class="step" data-step="3">3. AI Phân tích</span>
          <span class="step" data-step="4">4. Lộ trình</span>
        </div>
        <button class="planning-modal-close" onclick="window.closeStrategicPlanning()">✕</button>
      </div>
      <div class="planning-modal-body" id="planning-body">
        <!-- Content rendered by renderPlanningStep -->
      </div>
      <div class="planning-modal-footer" id="planning-footer">
        <!-- Buttons rendered by renderPlanningStep -->
      </div>
    </div>
  `;
}

export function closeStrategicPlanning() {
  const modal = document.getElementById('strategic-planning-modal');
  if (modal) modal.style.display = 'none';
}

function renderPlanningStep(step) {
  planningState.step = step;
  updateStepIndicator(step);

  switch (step) {
    case 1: renderStep1_StudentContext(); break;
    case 2: renderStep2_FamilyAspirations(); break;
    case 3: renderStep3_AIAnalysis(); break;
    case 4: renderStep4_Roadmap(); break;
  }
}

function updateStepIndicator(currentStep) {
  document.querySelectorAll('#planning-steps .step').forEach((el, i) => {
    el.classList.toggle('active', i + 1 === currentStep);
    el.classList.toggle('completed', i + 1 < currentStep);
  });
}

// ============================================
// STEP 1: STUDENT CONTEXT (Năng lực)
// ============================================

function renderStep1_StudentContext() {
  const body = document.getElementById('planning-body');
  const footer = document.getElementById('planning-footer');
  const { childInfo, studentContext } = planningState;
  const grade = studentContext.currentGrade || childInfo?.grade || 4;
  const level = grade <= 5 ? 'elementary' : grade <= 9 ? 'middle' : 'high';
  const subjects = SUBJECTS_BY_LEVEL[level];

  body.innerHTML = `
    <div class="planning-form">
      <div class="form-section">
        <h4>👧 ${childInfo?.name || 'Con'} - Lớp ${grade}</h4>
        <p class="form-hint">Đánh giá năng lực hiện tại để AI đề xuất lộ trình phù hợp</p>
      </div>

      <div class="form-section">
        <h4>📚 Năng lực môn học</h4>
        <p class="form-hint">Kéo thanh trượt để đánh giá (1-10)</p>
        <div class="ability-grid" id="academic-abilities">
          ${subjects.map(subj => {
            const val = studentContext.academics?.[subj]?.level || 5;
            return `
              <div class="ability-item">
                <label>${subj}</label>
                <div class="ability-slider">
                  <input type="range" min="1" max="10" value="${val}"
                         data-subject="${subj}"
                         oninput="window.updateAbilityValue(this)" />
                  <span class="ability-value">${val}</span>
                </div>
                <small class="ability-desc">${SUBJECT_LEVELS[val]}</small>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <div class="form-section">
        <h4>💪 Kỹ năng</h4>
        <div class="ability-grid" id="skill-abilities">
          ${SKILLS.map(skill => {
            const val = studentContext.skills?.[skill.id] || 5;
            return `
              <div class="ability-item">
                <label>${skill.name}</label>
                <div class="ability-slider">
                  <input type="range" min="1" max="10" value="${val}"
                         data-skill="${skill.id}"
                         oninput="window.updateSkillValue(this)" />
                  <span class="ability-value">${val}</span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <div class="form-section">
        <h4>🎨 Phong cách học</h4>
        <div class="radio-cards">
          ${Object.entries(LEARNING_STYLES).map(([key, style]) => `
            <label class="radio-card ${studentContext.learningStyle === key ? 'selected' : ''}">
              <input type="radio" name="learningStyle" value="${key}"
                     ${studentContext.learningStyle === key ? 'checked' : ''}
                     onchange="window.updateLearningStyle('${key}')" />
              <span class="card-title">${style.name}</span>
              <span class="card-desc">${style.desc}</span>
            </label>
          `).join('')}
        </div>
      </div>

      <div class="form-section">
        <h4>🌟 Năng khiếu & Thành tích</h4>
        <div class="form-group">
          <label>Năng khiếu đặc biệt</label>
          <input type="text" id="talents-input"
                 value="${(studentContext.talents || []).join(', ')}"
                 placeholder="VD: Vẽ, Piano, Bơi lội..." />
        </div>
        <div class="form-group">
          <label>Thành tích đã đạt</label>
          <input type="text" id="achievements-input"
                 value="${(studentContext.achievements || []).join(', ')}"
                 placeholder="VD: Giải 3 Toán cấp trường..." />
        </div>
        <div class="form-group">
          <label>Khó khăn gặp phải</label>
          <input type="text" id="challenges-input"
                 value="${(studentContext.challenges || []).join(', ')}"
                 placeholder="VD: Hay mất tập trung, sợ nói trước đám đông..." />
        </div>
      </div>

      <div class="form-section">
        <h4>❤️ Sở thích</h4>
        <div class="form-group">
          <label>Sở thích học tập</label>
          <input type="text" id="interests-input"
                 value="${(studentContext.interests || []).join(', ')}"
                 placeholder="VD: Khoa học, Lập trình, Đọc sách..." />
        </div>
        <div class="form-group">
          <label>Hoạt động yêu thích</label>
          <input type="text" id="hobbies-input"
                 value="${(studentContext.hobbies || []).join(', ')}"
                 placeholder="VD: Đá bóng, Chơi game, Xem phim..." />
        </div>
      </div>
    </div>
  `;

  footer.innerHTML = `
    <button class="btn btn-secondary" onclick="window.closeStrategicPlanning()">Hủy</button>
    <button class="btn btn-primary" onclick="window.planningNext()">Tiếp theo ▶</button>
  `;
}

// ============================================
// STEP 2: FAMILY ASPIRATIONS (Mục tiêu)
// ============================================

function renderStep2_FamilyAspirations() {
  const body = document.getElementById('planning-body');
  const footer = document.getElementById('planning-footer');
  const { familyAspirations } = planningState;

  body.innerHTML = `
    <div class="planning-form">
      <div class="form-section">
        <h4>🎯 Mục tiêu học tập</h4>
        <p class="form-hint">Để trống nếu chưa xác định - AI sẽ đề xuất</p>

        <div class="form-group">
          <label>Trường THPT mục tiêu</label>
          <input type="text" id="target-highschool"
                 value="${familyAspirations.academicGoals?.targetHighSchool || ''}"
                 placeholder="VD: THPT Chuyên Lê Hồng Phong, THPT Nguyễn Thượng Hiền..." />
        </div>

        <div class="form-group">
          <label>Trường Đại học mục tiêu</label>
          <input type="text" id="target-university"
                 value="${familyAspirations.academicGoals?.targetUniversity || ''}"
                 placeholder="VD: ĐH Bách khoa, ĐH Y Dược, FPT..." />
        </div>

        <div class="form-group">
          <label>Ngành học dự kiến</label>
          <input type="text" id="target-major"
                 value="${familyAspirations.academicGoals?.targetMajor || ''}"
                 placeholder="VD: Công nghệ thông tin, Y khoa, Kinh tế..." />
        </div>

        <div class="form-group">
          <label>Nghề nghiệp mơ ước</label>
          <input type="text" id="target-career"
                 value="${familyAspirations.academicGoals?.targetCareer || ''}"
                 placeholder="VD: Bác sĩ, Kỹ sư, Doanh nhân, Nhà khoa học..." />
        </div>
      </div>

      <div class="form-section">
        <h4>📈 Định hướng phát triển</h4>

        <div class="form-group">
          <label>Ưu tiên học tập</label>
          <div class="radio-cards">
            ${Object.entries(ACADEMIC_PRIORITIES).map(([key, priority]) => `
              <label class="radio-card ${familyAspirations.developmentFocus?.academicPriority === key ? 'selected' : ''}">
                <input type="radio" name="academicPriority" value="${key}"
                       ${familyAspirations.developmentFocus?.academicPriority === key ? 'checked' : ''}
                       onchange="window.updateAcademicPriority('${key}')" />
                <span class="card-title">${priority.name}</span>
                <span class="card-desc">${priority.desc}</span>
              </label>
            `).join('')}
          </div>
        </div>

        <div class="form-group">
          <label>Hoạt động ngoại khóa mong muốn</label>
          <input type="text" id="extracurricular"
                 value="${(familyAspirations.developmentFocus?.extracurricular || []).join(', ')}"
                 placeholder="VD: CLB Toán, Đội bóng, Ban nhạc..." />
        </div>

        <div class="form-group">
          <label>Kỹ năng mềm muốn phát triển</label>
          <input type="text" id="soft-skills"
                 value="${(familyAspirations.developmentFocus?.softSkills || []).join(', ')}"
                 placeholder="VD: Lãnh đạo, Thuyết trình, Làm việc nhóm..." />
        </div>
      </div>

      <div class="form-section">
        <h4>⏰ Nguồn lực & Điều kiện</h4>

        <div class="form-row">
          <div class="form-group">
            <label>Thời gian học mỗi ngày</label>
            <select id="study-time">
              ${[1, 2, 3, 4, 5, 6].map(h => `
                <option value="${h}" ${familyAspirations.resources?.studyTimePerDay === h ? 'selected' : ''}>
                  ${h} giờ/ngày
                </option>
              `).join('')}
            </select>
          </div>

          <div class="form-group">
            <label>Ngân sách</label>
            <select id="budget">
              <option value="limited" ${familyAspirations.resources?.budget === 'limited' ? 'selected' : ''}>Hạn chế</option>
              <option value="moderate" ${familyAspirations.resources?.budget === 'moderate' ? 'selected' : ''}>Vừa phải</option>
              <option value="flexible" ${familyAspirations.resources?.budget === 'flexible' ? 'selected' : ''}>Linh hoạt</option>
            </select>
          </div>

          <div class="form-group">
            <label>Mức độ tham gia của PH</label>
            <select id="parent-involvement">
              <option value="high" ${familyAspirations.resources?.parentInvolvement === 'high' ? 'selected' : ''}>Cao - Hỗ trợ nhiều</option>
              <option value="medium" ${familyAspirations.resources?.parentInvolvement === 'medium' ? 'selected' : ''}>Trung bình</option>
              <option value="low" ${familyAspirations.resources?.parentInvolvement === 'low' ? 'selected' : ''}>Thấp - Con tự học</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label>
            <input type="checkbox" id="tutoring-available"
                   ${familyAspirations.resources?.tutoringAvailable ? 'checked' : ''} />
            Có thể thuê gia sư / học thêm
          </label>
        </div>
      </div>

      <div class="form-section">
        <h4>⚠️ Ràng buộc (nếu có)</h4>
        <div class="form-group">
          <label>Vấn đề sức khỏe cần lưu ý</label>
          <input type="text" id="health-issues"
                 value="${(familyAspirations.constraints?.healthIssues || []).join(', ')}"
                 placeholder="VD: Cận thị, Dị ứng, ADHD..." />
        </div>
        <div class="form-group">
          <label>Cam kết gia đình</label>
          <input type="text" id="family-commitments"
                 value="${(familyAspirations.constraints?.familyCommitments || []).join(', ')}"
                 placeholder="VD: Về quê mỗi tháng, Du lịch hè..." />
        </div>
      </div>
    </div>
  `;

  footer.innerHTML = `
    <button class="btn btn-secondary" onclick="window.planningPrev()">◀ Quay lại</button>
    <button class="btn btn-primary" onclick="window.planningNext()">Tiếp theo ▶</button>
  `;
}

// ============================================
// STEP 3: AI ANALYSIS
// ============================================

function renderStep3_AIAnalysis() {
  const body = document.getElementById('planning-body');
  const footer = document.getElementById('planning-footer');
  const { aiRecommendation } = planningState;

  if (aiRecommendation && !aiRecommendation.error) {
    renderAIResults(aiRecommendation);
  } else {
    body.innerHTML = `
      <div class="ai-analysis-container">
        <div class="ai-intro">
          <div class="ai-icon">🤖</div>
          <h3>Phân tích bằng AI</h3>
          <p>
            Dựa trên năng lực và mục tiêu đã nhập, AI sẽ:
          </p>
          <ul>
            <li>✅ Đánh giá năng lực hiện tại so với mục tiêu</li>
            <li>✅ Đề xuất 3 lộ trình phù hợp</li>
            <li>✅ Xác định các mốc quan trọng từng cấp học</li>
            <li>✅ Gợi ý hành động cần làm ngay</li>
          </ul>
        </div>

        <div class="ai-action">
          <button class="btn btn-primary btn-lg" onclick="window.runAIAnalysis()">
            🚀 Bắt đầu phân tích
          </button>
          <p class="hint">Quá trình phân tích mất khoảng 10-20 giây</p>
        </div>

        <div id="ai-loading" style="display: none;">
          <div class="loading-spinner"></div>
          <p>Đang phân tích...</p>
        </div>

        <div id="ai-error" style="display: none;" class="error-box"></div>
      </div>
    `;
  }

  footer.innerHTML = `
    <button class="btn btn-secondary" onclick="window.planningPrev()">◀ Quay lại</button>
    <button class="btn btn-primary" onclick="window.planningNext()" ${!aiRecommendation ? 'disabled' : ''}>
      Tiếp theo ▶
    </button>
  `;
}

function renderAIResults(recommendation) {
  const body = document.getElementById('planning-body');
  const { assessment, pathOptions, milestones, immediateActions } = recommendation;

  body.innerHTML = `
    <div class="ai-results">
      <div class="result-section">
        <h4>📊 Đánh giá tổng quan</h4>
        <div class="assessment-card ${assessment.currentLevel}">
          <div class="assessment-score">
            <span class="score-value">${assessment.feasibilityPercent || 75}%</span>
            <span class="score-label">Khả năng đạt mục tiêu</span>
          </div>
          <p class="assessment-summary">${assessment.summary}</p>
          <div class="assessment-details">
            <div class="detail-col">
              <strong>Điểm mạnh:</strong>
              <ul>${(assessment.strengths || []).map(s => `<li>✅ ${s}</li>`).join('')}</ul>
            </div>
            <div class="detail-col">
              <strong>Cần cải thiện:</strong>
              <ul>${(assessment.weaknesses || []).map(w => `<li>⚠️ ${w}</li>`).join('')}</ul>
            </div>
          </div>
        </div>
      </div>

      <div class="result-section">
        <h4>🎯 Đề xuất lộ trình</h4>
        <p class="hint">Chọn 1 lộ trình phù hợp nhất</p>
        <div class="path-options">
          ${(pathOptions || []).map((path, i) => `
            <label class="path-card ${planningState.selectedPathId === path.id ? 'selected' : ''}">
              <input type="radio" name="selectedPath" value="${path.id}"
                     ${planningState.selectedPathId === path.id ? 'checked' : ''}
                     onchange="window.selectPath('${path.id}')" />
              <div class="path-header">
                <span class="path-name">${path.name}</span>
                <span class="path-score">${path.suitabilityPercent}% phù hợp</span>
              </div>
              <p class="path-desc">${path.description}</p>
              <div class="path-details">
                <div class="pros">
                  <strong>Ưu điểm:</strong>
                  ${(path.pros || []).map(p => `<span class="tag tag-success">${p}</span>`).join('')}
                </div>
                <div class="cons">
                  <strong>Nhược điểm:</strong>
                  ${(path.cons || []).map(c => `<span class="tag tag-warning">${c}</span>`).join('')}
                </div>
              </div>
            </label>
          `).join('')}
        </div>
      </div>

      <div class="result-section">
        <h4>📌 Hành động cần làm ngay (3 tháng tới)</h4>
        <ul class="action-list">
          ${(immediateActions || []).map(action => `<li>👉 ${action}</li>`).join('')}
        </ul>
      </div>

      <div class="result-action">
        <button class="btn btn-outline" onclick="window.runAIAnalysis()">
          🔄 Phân tích lại
        </button>
      </div>
    </div>
  `;
}

// ============================================
// STEP 4: ROADMAP
// ============================================

function renderStep4_Roadmap() {
  const body = document.getElementById('planning-body');
  const footer = document.getElementById('planning-footer');
  const { roadmap, studentContext, aiRecommendation } = planningState;

  if (!roadmap && !aiRecommendation) {
    body.innerHTML = `
      <div class="empty-state">
        <p>Chưa có dữ liệu. Vui lòng hoàn thành bước phân tích AI trước.</p>
      </div>
    `;
    footer.innerHTML = `
      <button class="btn btn-secondary" onclick="window.planningPrev()">◀ Quay lại</button>
    `;
    return;
  }

  // Generate roadmap if not exists
  const currentRoadmap = roadmap || generateRoadmapFromRecommendation(
    aiRecommendation,
    planningState.selectedPathId || aiRecommendation.pathOptions?.[0]?.id,
    studentContext.currentGrade
  );

  if (!currentRoadmap) {
    body.innerHTML = `<div class="error-box">Không thể tạo lộ trình. Vui lòng thử lại.</div>`;
    return;
  }

  planningState.roadmap = currentRoadmap;

  body.innerHTML = `
    <div class="roadmap-view">
      <div class="roadmap-header">
        <h3>🗺️ Lộ trình 12 năm: ${currentRoadmap.selectedPathName}</h3>
        <p class="roadmap-goal">${currentRoadmap.ultimateGoal}</p>
      </div>

      <div class="roadmap-phases">
        ${renderPhase('🏫 Tiểu học', currentRoadmap.phases.elementary, 'elementary')}
        ${renderPhase('🎓 THCS', currentRoadmap.phases.middle, 'middle')}
        ${renderPhase('🎯 THPT', currentRoadmap.phases.high, 'high')}
      </div>

      <div class="roadmap-actions">
        <h4>📌 Hành động ngay (3 tháng tới)</h4>
        <ul class="immediate-actions">
          ${(currentRoadmap.immediateActions || []).map(action => `
            <li>
              <input type="checkbox" />
              <span>${action}</span>
            </li>
          `).join('')}
        </ul>
      </div>
    </div>
  `;

  footer.innerHTML = `
    <button class="btn btn-secondary" onclick="window.planningPrev()">◀ Quay lại</button>
    <button class="btn btn-primary" onclick="window.saveAndApplyRoadmap()">
      ✅ Lưu & Áp dụng
    </button>
  `;
}

function renderPhase(title, phase, key) {
  if (!phase || phase.grades?.length === 0) return '';

  return `
    <div class="roadmap-phase phase-${key}">
      <div class="phase-header">
        <h4>${title}</h4>
        <span class="phase-grades">Lớp ${phase.grades?.join(', ') || '?'}</span>
      </div>
      <div class="phase-content">
        <div class="phase-focus">
          <strong>Trọng tâm:</strong> ${phase.focus || 'Chưa xác định'}
        </div>
        <div class="phase-details">
          <div class="detail-item">
            <strong>📚 Môn tập trung:</strong>
            <div class="tag-list">
              ${(phase.subjects || []).map(s => `<span class="tag">${s}</span>`).join('')}
            </div>
          </div>
          <div class="detail-item">
            <strong>💪 Kỹ năng:</strong>
            <div class="tag-list">
              ${(phase.skills || []).map(s => `<span class="tag">${s}</span>`).join('')}
            </div>
          </div>
          <div class="detail-item">
            <strong>🎯 Hoạt động:</strong>
            <div class="tag-list">
              ${(phase.activities || []).map(a => `<span class="tag">${a}</span>`).join('')}
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ============================================
// HANDLERS
// ============================================

window.closeStrategicPlanning = closeStrategicPlanning;

window.updateAbilityValue = function(input) {
  const val = input.value;
  const subject = input.dataset.subject;
  input.nextElementSibling.textContent = val;
  input.parentElement.nextElementSibling.textContent = SUBJECT_LEVELS[val];

  if (!planningState.studentContext.academics) {
    planningState.studentContext.academics = {};
  }
  planningState.studentContext.academics[subject] = { level: parseInt(val), notes: '' };
};

window.updateSkillValue = function(input) {
  const val = input.value;
  const skill = input.dataset.skill;
  input.nextElementSibling.textContent = val;

  if (!planningState.studentContext.skills) {
    planningState.studentContext.skills = {};
  }
  planningState.studentContext.skills[skill] = parseInt(val);
};

window.updateLearningStyle = function(style) {
  planningState.studentContext.learningStyle = style;
  document.querySelectorAll('[name="learningStyle"]').forEach(el => {
    el.closest('.radio-card').classList.toggle('selected', el.value === style);
  });
};

window.updateAcademicPriority = function(priority) {
  planningState.familyAspirations.developmentFocus.academicPriority = priority;
  document.querySelectorAll('[name="academicPriority"]').forEach(el => {
    el.closest('.radio-card').classList.toggle('selected', el.value === priority);
  });
};

window.selectPath = function(pathId) {
  planningState.selectedPathId = pathId;
  document.querySelectorAll('.path-card').forEach(el => {
    el.classList.toggle('selected', el.querySelector('input').value === pathId);
  });
};

window.planningNext = async function() {
  await saveCurrentStepData();

  if (planningState.step < 4) {
    renderPlanningStep(planningState.step + 1);
  }
};

window.planningPrev = function() {
  if (planningState.step > 1) {
    renderPlanningStep(planningState.step - 1);
  }
};

async function saveCurrentStepData() {
  const { userId, childId, studentContext, familyAspirations } = planningState;

  if (planningState.step === 1) {
    // Save student context
    studentContext.talents = parseCommaSeparated(document.getElementById('talents-input')?.value);
    studentContext.achievements = parseCommaSeparated(document.getElementById('achievements-input')?.value);
    studentContext.challenges = parseCommaSeparated(document.getElementById('challenges-input')?.value);
    studentContext.interests = parseCommaSeparated(document.getElementById('interests-input')?.value);
    studentContext.hobbies = parseCommaSeparated(document.getElementById('hobbies-input')?.value);

    await saveStudentContext(userId, childId, studentContext);
  }

  if (planningState.step === 2) {
    // Save family aspirations
    familyAspirations.academicGoals = {
      targetHighSchool: document.getElementById('target-highschool')?.value || '',
      targetUniversity: document.getElementById('target-university')?.value || '',
      targetMajor: document.getElementById('target-major')?.value || '',
      targetCareer: document.getElementById('target-career')?.value || ''
    };
    familyAspirations.developmentFocus.extracurricular = parseCommaSeparated(document.getElementById('extracurricular')?.value);
    familyAspirations.developmentFocus.softSkills = parseCommaSeparated(document.getElementById('soft-skills')?.value);
    familyAspirations.resources = {
      studyTimePerDay: parseInt(document.getElementById('study-time')?.value) || 3,
      budget: document.getElementById('budget')?.value || 'moderate',
      parentInvolvement: document.getElementById('parent-involvement')?.value || 'medium',
      tutoringAvailable: document.getElementById('tutoring-available')?.checked || false,
      onlineResourcesAccess: true
    };
    familyAspirations.constraints = {
      healthIssues: parseCommaSeparated(document.getElementById('health-issues')?.value),
      familyCommitments: parseCommaSeparated(document.getElementById('family-commitments')?.value),
      otherResponsibilities: []
    };

    await saveFamilyAspirations(userId, childId, familyAspirations);
  }
}

window.runAIAnalysis = async function() {
  const { userId, childId, childInfo, studentContext, familyAspirations } = planningState;

  document.getElementById('ai-loading').style.display = 'block';
  document.getElementById('ai-error').style.display = 'none';
  document.querySelector('.ai-action').style.display = 'none';

  const prompt = generateAnalysisPrompt(studentContext, familyAspirations, childInfo);
  const result = await analyzeWithAI(prompt);

  document.getElementById('ai-loading').style.display = 'none';

  if (result.error) {
    document.getElementById('ai-error').style.display = 'block';
    document.getElementById('ai-error').innerHTML = `
      <p>❌ Lỗi: ${result.error}</p>
      <button class="btn btn-outline" onclick="window.runAIAnalysis()">Thử lại</button>
    `;
    document.querySelector('.ai-action').style.display = 'block';
    return;
  }

  planningState.aiRecommendation = result;
  planningState.selectedPathId = result.pathOptions?.[0]?.id;
  await saveAIRecommendation(userId, childId, result);

  renderAIResults(result);

  // Enable next button
  const nextBtn = document.querySelector('#planning-footer .btn-primary');
  if (nextBtn) nextBtn.disabled = false;
};

window.saveAndApplyRoadmap = async function() {
  const { userId, childId, roadmap } = planningState;

  if (!roadmap) {
    alert('Chưa có lộ trình để lưu');
    return;
  }

  const success = await saveRoadmap(userId, childId, roadmap);

  if (success) {
    alert('✅ Đã lưu lộ trình thành công!\n\nBạn có thể xem lại trong tab "Năm học" và bắt đầu tạo kế hoạch chi tiết.');
    closeStrategicPlanning();

    // Dispatch event for app to refresh
    window.dispatchEvent(new CustomEvent('roadmapCreated', { detail: roadmap }));
  } else {
    alert('❌ Lỗi khi lưu. Vui lòng thử lại.');
  }
};

function parseCommaSeparated(str) {
  if (!str) return [];
  return str.split(',').map(s => s.trim()).filter(s => s.length > 0);
}

// ============================================
// EXPORTS
// ============================================

export default {
  showStrategicPlanningWizard,
  closeStrategicPlanning
};
