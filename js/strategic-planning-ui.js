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
  SCHOOL_TYPES,
  CURRICULUM_TYPES,
  FINANCIAL_CAPACITY,
  ENGLISH_LEVELS,
  ACHIEVEMENT_CATEGORIES,
  ACHIEVEMENT_LEVELS,
  ACTIVITY_DEPTH,
  TOP_5_AUSTRALIA_UNIS,
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
        <h3>🎯 Định Hướng Du Học Úc - Top 5</h3>
        <div class="planning-steps" id="planning-steps">
          <span class="step active" data-step="1">1. Học lực</span>
          <span class="step" data-step="2">2. Anh văn</span>
          <span class="step" data-step="3">3. Hoạt động</span>
          <span class="step" data-step="4">4. Mục tiêu</span>
          <span class="step" data-step="5">5. AI</span>
          <span class="step" data-step="6">6. Lộ trình</span>
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
    case 1: renderStep1_AcademicAbilities(); break;
    case 2: renderStep2_EnglishProfile(); break;
    case 3: renderStep3_Activities(); break;
    case 4: renderStep4_GoalsContext(); break;
    case 5: renderStep5_AIAnalysis(); break;
    case 6: renderStep6_Roadmap(); break;
  }
}

function updateStepIndicator(currentStep) {
  document.querySelectorAll('#planning-steps .step').forEach((el, i) => {
    el.classList.toggle('active', i + 1 === currentStep);
    el.classList.toggle('completed', i + 1 < currentStep);
  });
}

// ============================================
// STEP 1: ACADEMIC ABILITIES (Học lực cơ bản)
// ============================================

function renderStep1_AcademicAbilities() {
  const body = document.getElementById('planning-body');
  const footer = document.getElementById('planning-footer');
  const { childInfo, studentContext } = planningState;
  const basicInfo = studentContext.basicInfo || {};
  const grade = basicInfo.currentGrade || studentContext.currentGrade || childInfo?.grade || 4;
  const level = grade <= 5 ? 'elementary' : grade <= 9 ? 'middle' : 'high';
  const subjects = SUBJECTS_BY_LEVEL[level];

  // Calculate age from birthDate if available
  const calculateAge = (birthDate) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };
  const currentAge = basicInfo.age || calculateAge(basicInfo.birthDate);

  body.innerHTML = `
    <div class="planning-form">
      <div class="form-section child-info-section">
        <h4>👧 Thông tin cơ bản của con</h4>
        <p class="form-hint">🇦🇺 Cần thông tin chính xác để lên lộ trình học bổng Top 5 Úc</p>

        <div class="form-row">
          <div class="form-group">
            <label>Tên con *</label>
            <input type="text" id="child-name"
                   value="${basicInfo.name || childInfo?.name || ''}"
                   placeholder="Nhập tên con..." required />
          </div>
          <div class="form-group">
            <label>Ngày sinh</label>
            <input type="date" id="child-birthdate"
                   value="${basicInfo.birthDate || ''}"
                   onchange="window.updateChildAge(this.value)" />
          </div>
          <div class="form-group">
            <label>Tuổi</label>
            <input type="number" id="child-age" min="5" max="20"
                   value="${currentAge || ''}"
                   placeholder="VD: 10" />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Đang học lớp *</label>
            <select id="child-grade" onchange="window.updateGradeLevel(this.value)">
              ${[1,2,3,4,5,6,7,8,9,10,11,12].map(g => `
                <option value="${g}" ${grade === g ? 'selected' : ''}>Lớp ${g}</option>
              `).join('')}
            </select>
          </div>
          <div class="form-group">
            <label>Năm học</label>
            <input type="text" id="academic-year"
                   value="${basicInfo.academicYear || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`}"
                   placeholder="VD: 2024-2025" />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Tên trường đang học</label>
            <input type="text" id="school-name-basic"
                   value="${basicInfo.schoolName || ''}"
                   placeholder="VD: THCS Nguyễn Du, TH Vinschool..." />
          </div>
          <div class="form-group">
            <label>Loại trường</label>
            <select id="school-type-basic">
              ${Object.entries(SCHOOL_TYPES).map(([key, type]) => `
                <option value="${key}" ${basicInfo.schoolType === key ? 'selected' : ''}>${type.name}</option>
              `).join('')}
            </select>
          </div>
        </div>

        <div class="form-group">
          <label>Chương trình học</label>
          <div class="radio-cards compact">
            ${Object.entries(CURRICULUM_TYPES).map(([key, curr]) => `
              <label class="radio-card ${(basicInfo.curriculum || 'vn_gdpt') === key ? 'selected' : ''}">
                <input type="radio" name="curriculum" value="${key}"
                       ${(basicInfo.curriculum || 'vn_gdpt') === key ? 'checked' : ''}
                       onchange="window.updateCurriculum('${key}')" />
                <span class="card-title">${curr.name}</span>
              </label>
            `).join('')}
          </div>
        </div>
      </div>

      <div class="form-section">
        <h4>📚 Năng lực môn học</h4>
        <p class="form-hint">Kéo thanh trượt để đánh giá (1-10). Top 5 Úc yêu cầu GPA 8.5+</p>
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
        <h4>💪 Kỹ năng mềm</h4>
        <p class="form-hint">Scholarship profile cần kỹ năng toàn diện</p>
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
        <h4>⚡ Năng khiếu & Khó khăn</h4>
        <div class="form-group">
          <label>Năng khiếu đặc biệt (có thể trở thành SPIKE)</label>
          <input type="text" id="talents-input"
                 value="${(studentContext.talents || []).join(', ')}"
                 placeholder="VD: Vẽ, Piano, Coding, Toán tư duy..." />
        </div>
        <div class="form-group">
          <label>Khó khăn cần cải thiện</label>
          <input type="text" id="challenges-input"
                 value="${(studentContext.challenges || []).join(', ')}"
                 placeholder="VD: Hay mất tập trung, sợ nói trước đám đông..." />
        </div>
      </div>

      <div class="form-section">
        <h4>❤️ Đam mê & Sở thích</h4>
        <p class="form-hint">Đam mê thực sự sẽ tạo "unique story" cho application</p>
        <div class="form-group">
          <label>Sở thích học tập</label>
          <input type="text" id="interests-input"
                 value="${(studentContext.interests || []).join(', ')}"
                 placeholder="VD: Khoa học, Lập trình, Đọc sách lịch sử..." />
        </div>
        <div class="form-group">
          <label>Hoạt động yêu thích</label>
          <input type="text" id="hobbies-input"
                 value="${(studentContext.hobbies || []).join(', ')}"
                 placeholder="VD: Đá bóng, Chơi game, Làm video YouTube..." />
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
// STEP 2: ENGLISH PROFILE (Anh văn & Thành tích)
// ============================================

function renderStep2_EnglishProfile() {
  const body = document.getElementById('planning-body');
  const footer = document.getElementById('planning-footer');
  const { studentContext } = planningState;
  const englishProfile = studentContext.englishProfile || {};
  const achievements = studentContext.achievements || [];

  body.innerHTML = `
    <div class="planning-form">
      <div class="form-section">
        <h4>🌏 Trình độ tiếng Anh</h4>
        <p class="form-hint">Top 5 Úc yêu cầu IELTS 6.5-7.0+ (Academic)</p>

        <div class="form-group">
          <label>Trình độ hiện tại</label>
          <div class="radio-cards compact">
            ${Object.entries(ENGLISH_LEVELS).map(([key, level]) => `
              <label class="radio-card ${englishProfile.currentLevel === key ? 'selected' : ''}">
                <input type="radio" name="englishLevel" value="${key}"
                       ${englishProfile.currentLevel === key ? 'checked' : ''}
                       onchange="window.updateEnglishLevel('${key}')" />
                <span class="card-title">${level.name}</span>
                <span class="card-desc">IELTS ${level.ielts}</span>
              </label>
            `).join('')}
          </div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Điểm IELTS/TOEFL (nếu đã thi)</label>
            <input type="number" id="ielts-score" step="0.5" min="0" max="9"
                   value="${englishProfile.ieltsScore || ''}"
                   placeholder="VD: 6.5" />
          </div>
          <div class="form-group">
            <label>Số năm học tiếng Anh</label>
            <input type="number" id="years-learning" min="0" max="15"
                   value="${englishProfile.yearsLearning || 0}" />
          </div>
        </div>

        <div class="form-group">
          <label>Phương pháp học (chọn nhiều)</label>
          <div class="checkbox-group">
            ${[
              { id: 'school', label: 'Trường học' },
              { id: 'center', label: 'Trung tâm Anh ngữ' },
              { id: 'online', label: 'Online courses' },
              { id: 'native_teacher', label: 'Giáo viên bản ngữ' },
              { id: 'self_study', label: 'Tự học' }
            ].map(method => `
              <label class="checkbox-item">
                <input type="checkbox" name="learningMethod" value="${method.id}"
                       ${(englishProfile.learningMethod || []).includes(method.id) ? 'checked' : ''} />
                ${method.label}
              </label>
            `).join('')}
          </div>
        </div>

        <div class="form-group">
          <label>Mức độ tiếp xúc tiếng Anh hàng ngày</label>
          <select id="daily-exposure">
            <option value="low" ${englishProfile.dailyExposure === 'low' ? 'selected' : ''}>Thấp - Chỉ ở trường</option>
            <option value="medium" ${englishProfile.dailyExposure === 'medium' ? 'selected' : ''}>Trung bình - Có xem phim/đọc sách</option>
            <option value="high" ${englishProfile.dailyExposure === 'high' ? 'selected' : ''}>Cao - Môi trường song ngữ</option>
          </select>
        </div>
      </div>

      <div class="form-section">
        <h4>🏆 Thành tích & Giải thưởng</h4>
        <p class="form-hint">Giải thưởng quốc tế/quốc gia rất có giá trị cho hồ sơ</p>

        <div id="achievements-list">
          ${achievements.length > 0 ? achievements.map((ach, i) => renderAchievementItem(ach, i)).join('') : `
            <p class="empty-hint">Chưa có thành tích. Nhấn "Thêm" để bổ sung.</p>
          `}
        </div>

        <button type="button" class="btn btn-outline btn-sm" onclick="window.addAchievement()">
          + Thêm thành tích
        </button>
      </div>
    </div>
  `;

  footer.innerHTML = `
    <button class="btn btn-secondary" onclick="window.planningPrev()">◀ Quay lại</button>
    <button class="btn btn-primary" onclick="window.planningNext()">Tiếp theo ▶</button>
  `;
}

function renderAchievementItem(ach, index) {
  const achObj = typeof ach === 'string' ? { title: ach, category: 'academic_olympiad', level: 'school' } : ach;
  return `
    <div class="achievement-item" data-index="${index}">
      <div class="form-row">
        <select class="ach-category" onchange="window.updateAchievement(${index}, 'category', this.value)">
          ${Object.entries(ACHIEVEMENT_CATEGORIES).map(([key, cat]) => `
            <option value="${key}" ${achObj.category === key ? 'selected' : ''}>${cat.name}</option>
          `).join('')}
        </select>
        <select class="ach-level" onchange="window.updateAchievement(${index}, 'level', this.value)">
          ${Object.entries(ACHIEVEMENT_LEVELS).map(([key, lv]) => `
            <option value="${key}" ${achObj.level === key ? 'selected' : ''}>${lv.name}</option>
          `).join('')}
        </select>
        <input type="text" class="ach-title" placeholder="Tên giải thưởng"
               value="${achObj.title || ''}"
               onchange="window.updateAchievement(${index}, 'title', this.value)" />
        <button type="button" class="btn-icon" onclick="window.removeAchievement(${index})">🗑️</button>
      </div>
    </div>
  `;
}

// ============================================
// STEP 3: ACTIVITIES (Hoạt động ngoại khóa + Leadership)
// ============================================

function renderStep3_Activities() {
  const body = document.getElementById('planning-body');
  const footer = document.getElementById('planning-footer');
  const { studentContext } = planningState;
  const extracurriculars = studentContext.extracurriculars || [];
  const leadershipHistory = studentContext.leadershipHistory || [];
  const potentialSpike = studentContext.potentialSpike || {};

  body.innerHTML = `
    <div class="planning-form">
      <div class="form-section">
        <h4>🎯 Hoạt động ngoại khóa</h4>
        <p class="form-hint">Top 5 Úc cần thấy "depth over breadth" - chuyên sâu hơn là dàn trải</p>

        <div id="extracurricular-list">
          ${extracurriculars.length > 0 ? extracurriculars.map((act, i) => renderActivityItem(act, i)).join('') : `
            <p class="empty-hint">Chưa có hoạt động. Nhấn "Thêm" để bổ sung.</p>
          `}
        </div>

        <button type="button" class="btn btn-outline btn-sm" onclick="window.addActivity()">
          + Thêm hoạt động
        </button>
      </div>

      <div class="form-section">
        <h4>👑 Vai trò lãnh đạo</h4>
        <p class="form-hint">Leadership với impact đo lường được rất quan trọng</p>

        <div id="leadership-list">
          ${leadershipHistory.length > 0 ? leadershipHistory.map((lead, i) => renderLeadershipItem(lead, i)).join('') : `
            <p class="empty-hint">Chưa có vai trò lãnh đạo. Nhấn "Thêm" để bổ sung.</p>
          `}
        </div>

        <button type="button" class="btn btn-outline btn-sm" onclick="window.addLeadership()">
          + Thêm vai trò
        </button>
      </div>

      <div class="form-section spike-section">
        <h4>⭐ SPIKE - Điểm nổi bật độc đáo</h4>
        <p class="form-hint">
          "Spike" = lĩnh vực con XUẤT SẮC và khác biệt. Đây là yếu tố quan trọng nhất trong hồ sơ học bổng.
          VD: Robotics champion, Published author, Social project founder...
        </p>

        <div class="form-group">
          <label>Lĩnh vực SPIKE tiềm năng</label>
          <input type="text" id="spike-area"
                 value="${potentialSpike.area || ''}"
                 placeholder="VD: Robotics, Âm nhạc cổ điển, Viết sáng tạo, Khởi nghiệp xã hội..." />
        </div>

        <div class="form-group">
          <label>Bằng chứng/Thành tích trong lĩnh vực này</label>
          <textarea id="spike-evidence" rows="2"
                    placeholder="VD: Giải 3 Robotics quốc gia, Biểu diễn piano 50+ buổi, Xuất bản 2 truyện ngắn...">${(potentialSpike.evidence || []).join('\n')}</textarea>
        </div>

        <div class="form-group">
          <label>Kế hoạch phát triển SPIKE</label>
          <textarea id="spike-plan" rows="2"
                    placeholder="VD: Tham gia đội tuyển, Học chuyên sâu với mentor, Mở rộng dự án...">${potentialSpike.developmentPlan || ''}</textarea>
        </div>
      </div>
    </div>
  `;

  footer.innerHTML = `
    <button class="btn btn-secondary" onclick="window.planningPrev()">◀ Quay lại</button>
    <button class="btn btn-primary" onclick="window.planningNext()">Tiếp theo ▶</button>
  `;
}

function renderActivityItem(act, index) {
  const actObj = typeof act === 'object' ? act : { activity: act };
  return `
    <div class="activity-item" data-index="${index}">
      <div class="form-row">
        <input type="text" class="act-name" placeholder="Tên hoạt động"
               value="${actObj.activity || ''}"
               onchange="window.updateActivity(${index}, 'activity', this.value)" />
        <select class="act-depth" onchange="window.updateActivity(${index}, 'depth', this.value)">
          ${Object.entries(ACTIVITY_DEPTH).map(([key, depth]) => `
            <option value="${key}" ${actObj.depth === key ? 'selected' : ''}>${depth.name} (${depth.years})</option>
          `).join('')}
        </select>
        <input type="text" class="act-role" placeholder="Vai trò"
               value="${actObj.role || ''}"
               onchange="window.updateActivity(${index}, 'role', this.value)" />
        <button type="button" class="btn-icon" onclick="window.removeActivity(${index})">🗑️</button>
      </div>
    </div>
  `;
}

function renderLeadershipItem(lead, index) {
  const leadObj = typeof lead === 'object' ? lead : { role: lead };
  return `
    <div class="leadership-item" data-index="${index}">
      <div class="form-row">
        <input type="text" class="lead-role" placeholder="Vai trò (VD: Lớp trưởng)"
               value="${leadObj.role || ''}"
               onchange="window.updateLeadership(${index}, 'role', this.value)" />
        <input type="text" class="lead-org" placeholder="Tổ chức"
               value="${leadObj.organization || ''}"
               onchange="window.updateLeadership(${index}, 'organization', this.value)" />
        <input type="text" class="lead-impact" placeholder="Impact (VD: Tổ chức 5 sự kiện)"
               value="${leadObj.impact || ''}"
               onchange="window.updateLeadership(${index}, 'impact', this.value)" />
        <button type="button" class="btn-icon" onclick="window.removeLeadership(${index})">🗑️</button>
      </div>
    </div>
  `;
}

// ============================================
// STEP 4: GOALS & CONTEXT (Bối cảnh + Mục tiêu)
// ============================================

function renderStep4_GoalsContext() {
  const body = document.getElementById('planning-body');
  const footer = document.getElementById('planning-footer');
  const { familyAspirations, childInfo } = planningState;
  const currentContext = familyAspirations.currentContext || {};
  const academicGoals = familyAspirations.academicGoals || {};
  const applicationTimeline = familyAspirations.applicationTimeline || {};

  body.innerHTML = `
    <div class="planning-form">
      <div class="form-section">
        <h4>🏫 Bối cảnh hiện tại</h4>
        <p class="form-hint">Thông tin trường đang học giúp AI đánh giá chính xác hơn</p>

        <div class="form-row">
          <div class="form-group">
            <label>Tên trường đang học</label>
            <input type="text" id="school-name"
                   value="${currentContext.schoolName || ''}"
                   placeholder="VD: THCS Nguyễn Du, Trường Quốc tế ABC..." />
          </div>
          <div class="form-group">
            <label>Loại trường</label>
            <select id="school-type">
              ${Object.entries(SCHOOL_TYPES).map(([key, type]) => `
                <option value="${key}" ${currentContext.schoolType === key ? 'selected' : ''}>${type.name}</option>
              `).join('')}
            </select>
          </div>
        </div>

        <div class="form-group">
          <label>Xếp loại trong lớp/trường</label>
          <select id="current-performance">
            <option value="top5" ${currentContext.currentPerformance === 'top5' ? 'selected' : ''}>Top 5% - Xuất sắc</option>
            <option value="top10" ${currentContext.currentPerformance === 'top10' ? 'selected' : ''}>Top 10% - Giỏi</option>
            <option value="top20" ${currentContext.currentPerformance === 'top20' ? 'selected' : ''}>Top 20% - Khá giỏi</option>
            <option value="average" ${currentContext.currentPerformance === 'average' ? 'selected' : ''}>Trung bình</option>
            <option value="below_average" ${currentContext.currentPerformance === 'below_average' ? 'selected' : ''}>Dưới trung bình</option>
          </select>
        </div>
      </div>

      <div class="form-section australia-goal">
        <h4>🇦🇺 Mục tiêu du học Úc - Top 5</h4>
        <p class="form-hint">Melbourne, Sydney, UNSW, ANU, Monash - IELTS 6.5+, GPA 8.5+</p>

        <div class="form-group">
          <label>Trường ĐH mục tiêu tại Úc</label>
          <select id="target-university">
            <option value="">-- Chọn trường --</option>
            ${Object.entries(TOP_5_AUSTRALIA_UNIS).map(([key, uni]) => `
              <option value="${key}" ${academicGoals.targetUniversity === key ? 'selected' : ''}>${uni.name}</option>
            `).join('')}
            <option value="any_top5" ${academicGoals.targetUniversity === 'any_top5' ? 'selected' : ''}>Bất kỳ trường Top 5</option>
          </select>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>Ngành học dự kiến</label>
            <input type="text" id="target-major"
                   value="${academicGoals.targetMajor || ''}"
                   placeholder="VD: Computer Science, Medicine, Business..." />
          </div>
          <div class="form-group">
            <label>Nghề nghiệp mơ ước</label>
            <input type="text" id="target-career"
                   value="${academicGoals.targetCareer || ''}"
                   placeholder="VD: AI Engineer, Doctor, Entrepreneur..." />
          </div>
        </div>

        <div class="form-group">
          <label>Yêu cầu học bổng</label>
          <div class="radio-cards compact">
            ${Object.entries(FINANCIAL_CAPACITY).map(([key, cap]) => `
              <label class="radio-card ${academicGoals.scholarshipRequirement === key ? 'selected' : ''}">
                <input type="radio" name="scholarshipReq" value="${key}"
                       ${academicGoals.scholarshipRequirement === key ? 'checked' : ''}
                       onchange="window.updateScholarshipReq('${key}')" />
                <span class="card-title">${cap.name}</span>
              </label>
            `).join('')}
          </div>
        </div>
      </div>

      <div class="form-section">
        <h4>📅 Timeline Apply</h4>

        <div class="form-row">
          <div class="form-group">
            <label>Năm dự định apply đại học</label>
            <input type="number" id="target-apply-year" min="2025" max="2040"
                   value="${applicationTimeline.targetApplyYear || (new Date().getFullYear() + (12 - (childInfo?.grade || 4)))}"
                   placeholder="VD: 2030" />
          </div>
          <div class="form-group">
            <label>Pathway ưu tiên</label>
            <select id="preferred-pathway">
              <option value="direct_entry" ${applicationTimeline.preferredPathway === 'direct_entry' ? 'selected' : ''}>Direct Entry (vào thẳng)</option>
              <option value="foundation" ${applicationTimeline.preferredPathway === 'foundation' ? 'selected' : ''}>Foundation Year</option>
              <option value="pathway" ${applicationTimeline.preferredPathway === 'pathway' ? 'selected' : ''}>Pathway Program</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label>
            <input type="checkbox" id="gap-year"
                   ${applicationTimeline.gapYearConsidered ? 'checked' : ''} />
            Có thể xem xét Gap Year
          </label>
        </div>

        <div class="form-group">
          <label>Quốc gia backup (nếu không đậu Úc)</label>
          <div class="checkbox-group">
            ${[
              { id: 'uk', label: '🇬🇧 UK' },
              { id: 'usa', label: '🇺🇸 USA' },
              { id: 'singapore', label: '🇸🇬 Singapore' },
              { id: 'japan', label: '🇯🇵 Japan' },
              { id: 'korea', label: '🇰🇷 Korea' }
            ].map(country => `
              <label class="checkbox-item">
                <input type="checkbox" name="backupCountry" value="${country.id}"
                       ${(applicationTimeline.backupCountries || []).includes(country.id) ? 'checked' : ''} />
                ${country.label}
              </label>
            `).join('')}
          </div>
        </div>
      </div>

      <div class="form-section">
        <h4>⏰ Nguồn lực gia đình</h4>

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
            <label>Mức độ hỗ trợ của PH</label>
            <select id="parent-involvement">
              <option value="high" ${familyAspirations.resources?.parentInvolvement === 'high' ? 'selected' : ''}>Cao - Đồng hành sát</option>
              <option value="medium" ${familyAspirations.resources?.parentInvolvement === 'medium' ? 'selected' : ''}>Trung bình</option>
              <option value="low" ${familyAspirations.resources?.parentInvolvement === 'low' ? 'selected' : ''}>Thấp - Con tự chủ</option>
            </select>
          </div>
        </div>

        <div class="form-group">
          <label>
            <input type="checkbox" id="tutoring-available"
                   ${familyAspirations.resources?.tutoringAvailable ? 'checked' : ''} />
            Có thể thuê gia sư / học thêm / IELTS center
          </label>
        </div>
      </div>

      <div class="form-section">
        <h4>⚠️ Ràng buộc (nếu có)</h4>
        <div class="form-row">
          <div class="form-group">
            <label>Vấn đề sức khỏe</label>
            <input type="text" id="health-issues"
                   value="${(familyAspirations.constraints?.healthIssues || []).join(', ')}"
                   placeholder="VD: Cận thị, Dị ứng..." />
          </div>
          <div class="form-group">
            <label>Cam kết gia đình</label>
            <input type="text" id="family-commitments"
                   value="${(familyAspirations.constraints?.familyCommitments || []).join(', ')}"
                   placeholder="VD: Về quê hè, Du lịch tháng 7..." />
          </div>
        </div>
      </div>
    </div>
  `;

  footer.innerHTML = `
    <button class="btn btn-secondary" onclick="window.planningPrev()">◀ Quay lại</button>
    <button class="btn btn-primary" onclick="window.planningNext()">🚀 Phân tích AI ▶</button>
  `;
}

// ============================================
// STEP 5: AI ANALYSIS
// ============================================

function renderStep5_AIAnalysis() {
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
// STEP 6: ROADMAP
// ============================================

function renderStep6_Roadmap() {
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

// English Profile handlers
window.updateEnglishLevel = function(level) {
  if (!planningState.studentContext.englishProfile) {
    planningState.studentContext.englishProfile = {};
  }
  planningState.studentContext.englishProfile.currentLevel = level;
  document.querySelectorAll('[name="englishLevel"]').forEach(el => {
    el.closest('.radio-card').classList.toggle('selected', el.value === level);
  });
};

// Achievement handlers
window.addAchievement = function() {
  if (!planningState.studentContext.achievements) {
    planningState.studentContext.achievements = [];
  }
  planningState.studentContext.achievements.push({
    category: 'academic_olympiad',
    level: 'school',
    title: '',
    year: new Date().getFullYear()
  });
  refreshAchievementsList();
};

window.updateAchievement = function(index, field, value) {
  if (planningState.studentContext.achievements?.[index]) {
    planningState.studentContext.achievements[index][field] = value;
  }
};

window.removeAchievement = function(index) {
  planningState.studentContext.achievements?.splice(index, 1);
  refreshAchievementsList();
};

function refreshAchievementsList() {
  const container = document.getElementById('achievements-list');
  if (!container) return;
  const achievements = planningState.studentContext.achievements || [];
  container.innerHTML = achievements.length > 0
    ? achievements.map((ach, i) => renderAchievementItem(ach, i)).join('')
    : '<p class="empty-hint">Chưa có thành tích. Nhấn "Thêm" để bổ sung.</p>';
}

// Activity handlers
window.addActivity = function() {
  if (!planningState.studentContext.extracurriculars) {
    planningState.studentContext.extracurriculars = [];
  }
  planningState.studentContext.extracurriculars.push({
    activity: '',
    depth: 'explorer',
    role: ''
  });
  refreshActivitiesList();
};

window.updateActivity = function(index, field, value) {
  if (planningState.studentContext.extracurriculars?.[index]) {
    planningState.studentContext.extracurriculars[index][field] = value;
  }
};

window.removeActivity = function(index) {
  planningState.studentContext.extracurriculars?.splice(index, 1);
  refreshActivitiesList();
};

function refreshActivitiesList() {
  const container = document.getElementById('extracurricular-list');
  if (!container) return;
  const activities = planningState.studentContext.extracurriculars || [];
  container.innerHTML = activities.length > 0
    ? activities.map((act, i) => renderActivityItem(act, i)).join('')
    : '<p class="empty-hint">Chưa có hoạt động. Nhấn "Thêm" để bổ sung.</p>';
}

// Leadership handlers
window.addLeadership = function() {
  if (!planningState.studentContext.leadershipHistory) {
    planningState.studentContext.leadershipHistory = [];
  }
  planningState.studentContext.leadershipHistory.push({
    role: '',
    organization: '',
    impact: ''
  });
  refreshLeadershipList();
};

window.updateLeadership = function(index, field, value) {
  if (planningState.studentContext.leadershipHistory?.[index]) {
    planningState.studentContext.leadershipHistory[index][field] = value;
  }
};

window.removeLeadership = function(index) {
  planningState.studentContext.leadershipHistory?.splice(index, 1);
  refreshLeadershipList();
};

function refreshLeadershipList() {
  const container = document.getElementById('leadership-list');
  if (!container) return;
  const leadership = planningState.studentContext.leadershipHistory || [];
  container.innerHTML = leadership.length > 0
    ? leadership.map((lead, i) => renderLeadershipItem(lead, i)).join('')
    : '<p class="empty-hint">Chưa có vai trò lãnh đạo. Nhấn "Thêm" để bổ sung.</p>';
}

// Scholarship requirement handler
window.updateScholarshipReq = function(req) {
  if (!planningState.familyAspirations.academicGoals) {
    planningState.familyAspirations.academicGoals = {};
  }
  planningState.familyAspirations.academicGoals.scholarshipRequirement = req;
  document.querySelectorAll('[name="scholarshipReq"]').forEach(el => {
    el.closest('.radio-card').classList.toggle('selected', el.value === req);
  });
};

// Child info handlers
window.updateChildAge = function(birthDate) {
  if (!birthDate) return;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;

  const ageInput = document.getElementById('child-age');
  if (ageInput) ageInput.value = age;

  if (!planningState.studentContext.basicInfo) {
    planningState.studentContext.basicInfo = {};
  }
  planningState.studentContext.basicInfo.birthDate = birthDate;
  planningState.studentContext.basicInfo.age = age;
};

window.updateGradeLevel = function(grade) {
  const gradeNum = parseInt(grade);
  if (!planningState.studentContext.basicInfo) {
    planningState.studentContext.basicInfo = {};
  }
  planningState.studentContext.basicInfo.currentGrade = gradeNum;
  planningState.studentContext.currentGrade = gradeNum;

  // Update subjects based on new grade level
  const level = gradeNum <= 5 ? 'elementary' : gradeNum <= 9 ? 'middle' : 'high';
  const subjects = SUBJECTS_BY_LEVEL[level];
  const newAcademics = {};
  subjects.forEach(subj => {
    newAcademics[subj] = planningState.studentContext.academics?.[subj] || { level: 5, notes: '' };
  });
  planningState.studentContext.academics = newAcademics;

  // Re-render the academic abilities section
  const academicGrid = document.getElementById('academic-abilities');
  if (academicGrid) {
    academicGrid.innerHTML = subjects.map(subj => {
      const val = newAcademics[subj]?.level || 5;
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
    }).join('');
  }
};

window.updateCurriculum = function(curriculum) {
  if (!planningState.studentContext.basicInfo) {
    planningState.studentContext.basicInfo = {};
  }
  planningState.studentContext.basicInfo.curriculum = curriculum;
  document.querySelectorAll('[name="curriculum"]').forEach(el => {
    el.closest('.radio-card').classList.toggle('selected', el.value === curriculum);
  });
};

window.planningNext = async function() {
  await saveCurrentStepData();

  if (planningState.step < 6) {
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
    // Save basic child info
    studentContext.basicInfo = {
      name: document.getElementById('child-name')?.value || '',
      birthDate: document.getElementById('child-birthdate')?.value || null,
      age: parseInt(document.getElementById('child-age')?.value) || null,
      currentGrade: parseInt(document.getElementById('child-grade')?.value) || studentContext.currentGrade,
      schoolName: document.getElementById('school-name-basic')?.value || '',
      schoolType: document.getElementById('school-type-basic')?.value || 'public',
      curriculum: document.querySelector('[name="curriculum"]:checked')?.value || 'vn_gdpt',
      academicYear: document.getElementById('academic-year')?.value || ''
    };
    studentContext.currentGrade = studentContext.basicInfo.currentGrade;

    // Save academic abilities
    studentContext.talents = parseCommaSeparated(document.getElementById('talents-input')?.value);
    studentContext.challenges = parseCommaSeparated(document.getElementById('challenges-input')?.value);
    studentContext.interests = parseCommaSeparated(document.getElementById('interests-input')?.value);
    studentContext.hobbies = parseCommaSeparated(document.getElementById('hobbies-input')?.value);
    await saveStudentContext(userId, childId, studentContext);
  }

  if (planningState.step === 2) {
    // Save English profile and achievements
    studentContext.englishProfile = {
      currentLevel: document.querySelector('[name="englishLevel"]:checked')?.value || 'elementary',
      ieltsScore: parseFloat(document.getElementById('ielts-score')?.value) || null,
      yearsLearning: parseInt(document.getElementById('years-learning')?.value) || 0,
      learningMethod: Array.from(document.querySelectorAll('[name="learningMethod"]:checked')).map(el => el.value),
      dailyExposure: document.getElementById('daily-exposure')?.value || 'low'
    };
    // Keep achievements as they are updated through handlers
    await saveStudentContext(userId, childId, studentContext);
  }

  if (planningState.step === 3) {
    // Save activities, leadership, and spike
    studentContext.potentialSpike = {
      area: document.getElementById('spike-area')?.value || '',
      evidence: parseCommaSeparated(document.getElementById('spike-evidence')?.value.replace(/\n/g, ',')),
      developmentPlan: document.getElementById('spike-plan')?.value || ''
    };
    // Keep extracurriculars and leadership as they are updated through handlers
    await saveStudentContext(userId, childId, studentContext);
  }

  if (planningState.step === 4) {
    // Save goals and context
    familyAspirations.currentContext = {
      schoolName: document.getElementById('school-name')?.value || '',
      schoolType: document.getElementById('school-type')?.value || 'public',
      currentPerformance: document.getElementById('current-performance')?.value || 'average'
    };

    familyAspirations.academicGoals = {
      ...familyAspirations.academicGoals,
      targetUniversity: document.getElementById('target-university')?.value || '',
      targetMajor: document.getElementById('target-major')?.value || '',
      targetCareer: document.getElementById('target-career')?.value || '',
      studyAbroadIntent: true,
      targetCountry: 'australia',
      scholarshipRequirement: document.querySelector('[name="scholarshipReq"]:checked')?.value || 'full_scholarship'
    };

    familyAspirations.applicationTimeline = {
      targetApplyYear: parseInt(document.getElementById('target-apply-year')?.value) || null,
      gapYearConsidered: document.getElementById('gap-year')?.checked || false,
      preferredPathway: document.getElementById('preferred-pathway')?.value || 'direct_entry',
      backupCountries: Array.from(document.querySelectorAll('[name="backupCountry"]:checked')).map(el => el.value)
    };

    familyAspirations.resources = {
      studyTimePerDay: parseInt(document.getElementById('study-time')?.value) || 3,
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
