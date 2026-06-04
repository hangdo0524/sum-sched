/**
 * Academic Calendar UI Components
 * Setup Wizard, Calendar Overview, Term Detail Views
 */

import {
  ACADEMIC_LEVELS,
  getLevelFromGrade,
  getVietnamHolidays,
  getAcademicYears,
  getAcademicYear,
  createAcademicYear,
  updateAcademicYear,
  getTerms,
  getTerm,
  createTerm,
  updateTerm,
  getWeeks,
  getCurrentWeek,
  generateWeeksForTerm
} from './academic-calendar.js';

// State for wizard
let wizardState = {
  step: 1,
  yearData: null,
  terms: [],
  currentTermIndex: 0
};

// ============================================
// SETUP WIZARD
// ============================================

/**
 * Show Academic Calendar Setup Wizard
 */
export function showAcademicCalendarWizard(userId, childId, childName, existingYear = null) {
  // Reset wizard state
  wizardState = {
    step: 1,
    userId,
    childId,
    childName,
    yearData: existingYear || {
      startDate: '',
      endDate: '',
      studentGrade: 1,
      school: '',
      termsCount: 2,
      holidays: [],
      events: []
    },
    terms: []
  };

  // Set default dates for new school year
  if (!existingYear) {
    const now = new Date();
    const year = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
    wizardState.yearData.startDate = `${year}-09-05`;
    wizardState.yearData.endDate = `${year + 1}-05-31`;
    wizardState.yearData.holidays = getVietnamHolidays(year);
  }

  renderWizardStep(1);
  showWizardModal();
}

function showWizardModal() {
  let modal = document.getElementById('academic-wizard-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'academic-wizard-modal';
    modal.className = 'modal';
    document.body.appendChild(modal);
  }
  modal.style.display = 'flex';
  modal.innerHTML = `
    <div class="modal-content modal-content--wide">
      <div class="modal-header">
        <h3 id="wizard-title">📅 Thiết Lập Năm Học</h3>
        <span class="wizard-step-indicator" id="wizard-step-indicator">Bước 1/4</span>
        <button class="modal-close" onclick="window.closeAcademicWizard()">✕</button>
      </div>
      <div class="modal-body" id="wizard-body">
        <!-- Content rendered by renderWizardStep -->
      </div>
      <div class="modal-footer" id="wizard-footer">
        <!-- Buttons rendered by renderWizardStep -->
      </div>
    </div>
  `;
}

export function closeAcademicWizard() {
  const modal = document.getElementById('academic-wizard-modal');
  if (modal) modal.style.display = 'none';
}

function renderWizardStep(step) {
  wizardState.step = step;
  const indicator = document.getElementById('wizard-step-indicator');
  if (indicator) indicator.textContent = `Bước ${step}/4`;

  switch (step) {
    case 1: renderWizardStep1(); break;
    case 2: renderWizardStep2(); break;
    case 3: renderWizardStep3(); break;
    case 4: renderWizardStep4(); break;
  }
}

// Step 1: Year Setup
function renderWizardStep1() {
  const body = document.getElementById('wizard-body');
  const footer = document.getElementById('wizard-footer');
  const { yearData, childName } = wizardState;

  const level = getLevelFromGrade(yearData.studentGrade || 1);
  const startYear = yearData.startDate ? yearData.startDate.substring(0, 4) : new Date().getFullYear();

  body.innerHTML = `
    <div class="wizard-form">
      <div class="form-section">
        <label>👧 Học sinh: <strong>${childName || 'Con'}</strong></label>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Năm học</label>
          <select id="wizard-year" onchange="window.wizardYearChanged(this.value)">
            ${generateYearOptions(parseInt(startYear))}
          </select>
        </div>
        <div class="form-group">
          <label>Lớp</label>
          <select id="wizard-grade" onchange="window.wizardGradeChanged(this.value)">
            ${generateGradeOptions(yearData.studentGrade || 1)}
          </select>
        </div>
      </div>

      <div class="form-group">
        <label>Cấp học: <strong>${level.name}</strong></label>
        <div class="info-box">
          <small>
            📚 Khuyến nghị: tối đa ${level.defaults.maxStudyHoursPerDay}h/ngày,
            ${level.defaults.sessionDuration} phút/ca,
            ${level.defaults.recommendedSubjectsPerDay} môn/ngày
          </small>
        </div>
      </div>

      <div class="form-group">
        <label>Trường (tùy chọn)</label>
        <input type="text" id="wizard-school" value="${yearData.school || ''}"
               placeholder="VD: Tiểu học Nguyễn Du" />
      </div>

      <div class="form-divider"></div>

      <div class="form-row">
        <div class="form-group">
          <label>📆 Ngày khai giảng</label>
          <input type="date" id="wizard-start" value="${yearData.startDate}" />
        </div>
        <div class="form-group">
          <label>📆 Ngày bế giảng</label>
          <input type="date" id="wizard-end" value="${yearData.endDate}" />
        </div>
      </div>

      <div class="form-divider"></div>

      <div class="form-group">
        <label>📚 Số kỳ học</label>
        <div class="radio-group">
          <label class="radio-option ${yearData.termsCount === 2 ? 'selected' : ''}">
            <input type="radio" name="termsCount" value="2"
                   ${yearData.termsCount === 2 ? 'checked' : ''}
                   onchange="window.wizardTermsChanged(2)" />
            <span>2 kỳ (HK1 + HK2)</span>
          </label>
          <label class="radio-option ${yearData.termsCount === 3 ? 'selected' : ''}">
            <input type="radio" name="termsCount" value="3"
                   ${yearData.termsCount === 3 ? 'checked' : ''}
                   onchange="window.wizardTermsChanged(3)" />
            <span>3 kỳ (HK1 + HK2 + Hè)</span>
          </label>
        </div>
      </div>
    </div>
  `;

  footer.innerHTML = `
    <button class="btn btn-secondary" onclick="window.closeAcademicWizard()">Hủy</button>
    <button class="btn btn-primary" onclick="window.wizardNext()">Tiếp theo ▶</button>
  `;
}

// Step 2: Term Setup
function renderWizardStep2() {
  const body = document.getElementById('wizard-body');
  const footer = document.getElementById('wizard-footer');
  const { yearData, terms, currentTermIndex } = wizardState;

  // Auto-calculate term dates if not set
  if (terms.length === 0) {
    calculateDefaultTerms();
  }

  const term = terms[currentTermIndex] || {};
  const termLabel = currentTermIndex === 2 ? 'Kỳ Hè' : `Học Kỳ ${currentTermIndex + 1}`;

  body.innerHTML = `
    <div class="wizard-form">
      <div class="term-tabs">
        ${terms.map((t, i) => `
          <button class="term-tab ${i === currentTermIndex ? 'active' : ''}"
                  onclick="window.wizardSelectTerm(${i})">
            ${i === 2 ? 'Hè' : `HK${i + 1}`}
          </button>
        `).join('')}
      </div>

      <h4>${termLabel}</h4>

      <div class="form-row">
        <div class="form-group">
          <label>Từ ngày</label>
          <input type="date" id="wizard-term-start" value="${term.startDate || ''}"
                 onchange="window.wizardTermDateChanged('start', this.value)" />
        </div>
        <div class="form-group">
          <label>Đến ngày</label>
          <input type="date" id="wizard-term-end" value="${term.endDate || ''}"
                 onchange="window.wizardTermDateChanged('end', this.value)" />
        </div>
      </div>

      <div class="info-box">
        Tổng: <strong>${term.totalWeeks || 0} tuần</strong>
      </div>

      <div class="form-divider"></div>

      <div class="form-group">
        <label>Cấu trúc kỳ học</label>
        <div class="structure-visual">
          <div class="structure-bar">
            <div class="bar-learning" style="width: ${(term.structure?.learningWeeks || 15) / (term.totalWeeks || 19) * 100}%"></div>
            <div class="bar-review" style="width: ${(term.structure?.reviewWeeks || 2) / (term.totalWeeks || 19) * 100}%"></div>
            <div class="bar-exam" style="width: ${(term.structure?.examWeeks || 2) / (term.totalWeeks || 19) * 100}%"></div>
          </div>
          <div class="structure-legend">
            <span class="legend-item"><span class="dot learning"></span> Học</span>
            <span class="legend-item"><span class="dot review"></span> Ôn</span>
            <span class="legend-item"><span class="dot exam"></span> Thi</span>
          </div>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label>Tuần học</label>
          <input type="number" id="wizard-learning-weeks" min="10" max="20"
                 value="${term.structure?.learningWeeks || 15}"
                 onchange="window.wizardStructureChanged('learning', this.value)" />
        </div>
        <div class="form-group">
          <label>Tuần ôn</label>
          <input type="number" id="wizard-review-weeks" min="0" max="4"
                 value="${term.structure?.reviewWeeks || 2}"
                 onchange="window.wizardStructureChanged('review', this.value)" />
        </div>
        <div class="form-group">
          <label>Tuần thi</label>
          <input type="number" id="wizard-exam-weeks" min="1" max="4"
                 value="${term.structure?.examWeeks || 2}"
                 onchange="window.wizardStructureChanged('exam', this.value)" />
        </div>
      </div>

      <div class="form-divider"></div>

      <div class="form-group">
        <label>📝 Kỳ thi (tự động thêm vào tuần thi)</label>
        <div class="exam-list">
          <label class="checkbox-option">
            <input type="checkbox" ${term.exams?.find(e => e.type === 'midterm') ? 'checked' : ''}
                   onchange="window.wizardToggleExam('midterm', this.checked)" />
            <span>Giữa kỳ</span>
          </label>
          <label class="checkbox-option">
            <input type="checkbox" checked disabled />
            <span>Cuối kỳ (bắt buộc)</span>
          </label>
        </div>
      </div>
    </div>
  `;

  footer.innerHTML = `
    <button class="btn btn-secondary" onclick="window.wizardPrev()">◀ Quay lại</button>
    <button class="btn btn-primary" onclick="window.wizardNext()">Tiếp theo ▶</button>
  `;
}

// Step 3: Holidays & Events
function renderWizardStep3() {
  const body = document.getElementById('wizard-body');
  const footer = document.getElementById('wizard-footer');
  const { yearData } = wizardState;

  body.innerHTML = `
    <div class="wizard-form">
      <div class="form-group">
        <label>🎌 Ngày nghỉ lễ</label>
        <div class="holiday-list" id="holiday-list">
          ${(yearData.holidays || []).map((h, i) => `
            <div class="holiday-item">
              <input type="checkbox" checked onchange="window.wizardToggleHoliday(${i}, this.checked)" />
              <span class="holiday-name">${h.name}</span>
              <span class="holiday-date">${formatDateRange(h.startDate, h.endDate)}</span>
            </div>
          `).join('')}
        </div>
        <button class="btn btn-sm btn-outline" onclick="window.wizardAddHoliday()">
          + Thêm ngày nghỉ
        </button>
      </div>

      <div class="form-divider"></div>

      <div class="form-group">
        <label>📌 Sự kiện quan trọng</label>
        <div class="event-list" id="event-list">
          ${(yearData.events || []).map((e, i) => `
            <div class="event-item">
              <input type="checkbox" checked onchange="window.wizardToggleEvent(${i}, this.checked)" />
              <span class="event-name">${e.name}</span>
              <span class="event-date">${e.date}</span>
              <button class="btn-icon" onclick="window.wizardRemoveEvent(${i})">🗑</button>
            </div>
          `).join('')}
        </div>
        <button class="btn btn-sm btn-outline" onclick="window.wizardAddEvent()">
          + Thêm sự kiện
        </button>
      </div>
    </div>
  `;

  footer.innerHTML = `
    <button class="btn btn-secondary" onclick="window.wizardPrev()">◀ Quay lại</button>
    <button class="btn btn-primary" onclick="window.wizardNext()">Tiếp theo ▶</button>
  `;
}

// Step 4: Subject Assignment
function renderWizardStep4() {
  const body = document.getElementById('wizard-body');
  const footer = document.getElementById('wizard-footer');
  const { yearData, terms, currentTermIndex } = wizardState;

  const term = terms[currentTermIndex] || {};
  const level = getLevelFromGrade(yearData.studentGrade);
  const subjects = term.subjects || [];

  const totalHours = subjects.reduce((sum, s) => sum + (s.weeklyHours || 0), 0);
  const maxHours = level.defaults.maxStudyHoursPerDay * 6; // 6 days/week

  body.innerHTML = `
    <div class="wizard-form">
      <div class="term-tabs">
        ${terms.map((t, i) => `
          <button class="term-tab ${i === currentTermIndex ? 'active' : ''}"
                  onclick="window.wizardSelectTerm(${i})">
            ${i === 2 ? 'Hè' : `HK${i + 1}`}
          </button>
        `).join('')}
      </div>

      <h4>Môn học cho ${currentTermIndex === 2 ? 'Kỳ Hè' : `Học Kỳ ${currentTermIndex + 1}`}</h4>

      <div class="subject-table">
        <div class="subject-table-header">
          <span>Môn</span>
          <span>Giờ/tuần</span>
          <span>Ưu tiên</span>
          <span>Mục tiêu</span>
          <span></span>
        </div>
        <div class="subject-table-body" id="subject-table-body">
          ${subjects.map((s, i) => renderSubjectRow(s, i)).join('')}
        </div>
        <button class="btn btn-sm btn-outline full-width" onclick="window.wizardAddSubject()">
          + Thêm môn học
        </button>
      </div>

      <div class="form-divider"></div>

      <div class="summary-box ${totalHours > maxHours ? 'warning' : ''}">
        <div class="summary-item">
          <span>Tổng giờ/tuần:</span>
          <strong>${totalHours}h</strong>
        </div>
        <div class="summary-item">
          <span>Số môn:</span>
          <strong>${subjects.length}</strong>
        </div>
        ${totalHours > maxHours ? `
          <div class="warning-text">
            ⚠️ Vượt khuyến nghị (${maxHours}h/tuần cho ${level.name})
          </div>
        ` : ''}
      </div>
    </div>
  `;

  footer.innerHTML = `
    <button class="btn btn-secondary" onclick="window.wizardPrev()">◀ Quay lại</button>
    <button class="btn btn-primary" onclick="window.wizardFinish()">✅ Hoàn tất</button>
  `;
}

function renderSubjectRow(subject, index) {
  return `
    <div class="subject-row">
      <input type="text" value="${subject.name || ''}" placeholder="Tên môn"
             onchange="window.wizardUpdateSubject(${index}, 'name', this.value)" />
      <input type="number" value="${subject.weeklyHours || 3}" min="1" max="20"
             onchange="window.wizardUpdateSubject(${index}, 'weeklyHours', this.value)" />
      <select onchange="window.wizardUpdateSubject(${index}, 'priority', this.value)">
        <option value="high" ${subject.priority === 'high' ? 'selected' : ''}>Cao</option>
        <option value="medium" ${subject.priority === 'medium' ? 'selected' : ''}>TB</option>
        <option value="low" ${subject.priority === 'low' ? 'selected' : ''}>Thấp</option>
      </select>
      <input type="text" value="${subject.targetGrade || ''}" placeholder="8.0"
             onchange="window.wizardUpdateSubject(${index}, 'targetGrade', this.value)" />
      <button class="btn-icon" onclick="window.wizardRemoveSubject(${index})">🗑</button>
    </div>
  `;
}

// ============================================
// WIZARD ACTIONS
// ============================================

function calculateDefaultTerms() {
  const { yearData } = wizardState;
  const startDate = new Date(yearData.startDate);
  const endDate = new Date(yearData.endDate);

  wizardState.terms = [];

  if (yearData.termsCount >= 2) {
    // Term 1: September - January
    const term1End = new Date(startDate.getFullYear() + 1, 0, 15); // Jan 15
    wizardState.terms.push({
      name: 'Học kỳ 1',
      shortName: 'HK1',
      type: 'semester',
      order: 1,
      startDate: yearData.startDate,
      endDate: formatDateInput(term1End),
      totalWeeks: calculateWeeksBetween(startDate, term1End),
      structure: { learningWeeks: 15, reviewWeeks: 2, examWeeks: 2 },
      exams: [
        { name: 'Giữa kỳ 1', type: 'midterm' },
        { name: 'Cuối kỳ 1', type: 'final' }
      ],
      subjects: []
    });

    // Term 2: January - May
    const term2Start = new Date(startDate.getFullYear() + 1, 0, 16);
    wizardState.terms.push({
      name: 'Học kỳ 2',
      shortName: 'HK2',
      type: 'semester',
      order: 2,
      startDate: formatDateInput(term2Start),
      endDate: yearData.endDate,
      totalWeeks: calculateWeeksBetween(term2Start, endDate),
      structure: { learningWeeks: 15, reviewWeeks: 2, examWeeks: 2 },
      exams: [
        { name: 'Giữa kỳ 2', type: 'midterm' },
        { name: 'Cuối kỳ 2', type: 'final' }
      ],
      subjects: []
    });
  }

  if (yearData.termsCount >= 3) {
    // Summer term
    const summerStart = new Date(endDate);
    summerStart.setDate(summerStart.getDate() + 7);
    const summerEnd = new Date(summerStart.getFullYear(), 7, 31); // Aug 31

    wizardState.terms.push({
      name: 'Kỳ Hè',
      shortName: 'Hè',
      type: 'summer',
      order: 3,
      startDate: formatDateInput(summerStart),
      endDate: formatDateInput(summerEnd),
      totalWeeks: calculateWeeksBetween(summerStart, summerEnd),
      structure: { learningWeeks: 10, reviewWeeks: 0, examWeeks: 0 },
      exams: [],
      subjects: []
    });
  }
}

// Global handlers
window.closeAcademicWizard = closeAcademicWizard;

window.wizardNext = function() {
  saveCurrentStepData();
  if (wizardState.step < 4) {
    renderWizardStep(wizardState.step + 1);
  }
};

window.wizardPrev = function() {
  saveCurrentStepData();
  if (wizardState.step > 1) {
    renderWizardStep(wizardState.step - 1);
  }
};

window.wizardYearChanged = function(value) {
  const [startYear, endYear] = value.split('-').map(Number);
  wizardState.yearData.startDate = `${startYear}-09-05`;
  wizardState.yearData.endDate = `${endYear}-05-31`;
  wizardState.yearData.holidays = getVietnamHolidays(startYear);
  wizardState.terms = []; // Reset terms
};

window.wizardGradeChanged = function(value) {
  wizardState.yearData.studentGrade = parseInt(value);
  renderWizardStep(1); // Re-render to update level info
};

window.wizardTermsChanged = function(count) {
  wizardState.yearData.termsCount = count;
  wizardState.terms = []; // Reset terms
  document.querySelectorAll('.radio-option').forEach(opt => opt.classList.remove('selected'));
  document.querySelector(`input[value="${count}"]`).closest('.radio-option').classList.add('selected');
};

window.wizardSelectTerm = function(index) {
  saveCurrentStepData();
  wizardState.currentTermIndex = index;
  renderWizardStep(wizardState.step);
};

window.wizardTermDateChanged = function(field, value) {
  const term = wizardState.terms[wizardState.currentTermIndex];
  if (field === 'start') term.startDate = value;
  if (field === 'end') term.endDate = value;
  term.totalWeeks = calculateWeeksBetween(new Date(term.startDate), new Date(term.endDate));
  renderWizardStep(2);
};

window.wizardStructureChanged = function(field, value) {
  const term = wizardState.terms[wizardState.currentTermIndex];
  term.structure = term.structure || {};
  term.structure[field + 'Weeks'] = parseInt(value);
  renderWizardStep(2);
};

window.wizardToggleExam = function(type, checked) {
  const term = wizardState.terms[wizardState.currentTermIndex];
  term.exams = term.exams || [];
  if (checked) {
    if (!term.exams.find(e => e.type === type)) {
      term.exams.push({ name: type === 'midterm' ? 'Giữa kỳ' : 'Cuối kỳ', type });
    }
  } else {
    term.exams = term.exams.filter(e => e.type !== type);
  }
};

window.wizardToggleHoliday = function(index, checked) {
  if (!checked) {
    wizardState.yearData.holidays.splice(index, 1);
    renderWizardStep(3);
  }
};

window.wizardAddHoliday = function() {
  const name = prompt('Tên ngày nghỉ:');
  if (!name) return;
  const date = prompt('Ngày (YYYY-MM-DD):');
  if (!date) return;
  wizardState.yearData.holidays.push({
    name,
    startDate: date,
    endDate: date,
    type: 'custom'
  });
  renderWizardStep(3);
};

window.wizardToggleEvent = function(index, checked) {
  if (!checked) {
    wizardState.yearData.events.splice(index, 1);
    renderWizardStep(3);
  }
};

window.wizardAddEvent = function() {
  const name = prompt('Tên sự kiện:');
  if (!name) return;
  const date = prompt('Ngày (YYYY-MM-DD):');
  if (!date) return;
  wizardState.yearData.events.push({ name, date, type: 'custom' });
  renderWizardStep(3);
};

window.wizardRemoveEvent = function(index) {
  wizardState.yearData.events.splice(index, 1);
  renderWizardStep(3);
};

window.wizardAddSubject = function() {
  const term = wizardState.terms[wizardState.currentTermIndex];
  term.subjects = term.subjects || [];
  term.subjects.push({
    name: '',
    weeklyHours: 3,
    priority: 'medium',
    targetGrade: ''
  });
  renderWizardStep(4);
};

window.wizardUpdateSubject = function(index, field, value) {
  const term = wizardState.terms[wizardState.currentTermIndex];
  if (term.subjects[index]) {
    term.subjects[index][field] = field === 'weeklyHours' ? parseInt(value) : value;
  }
};

window.wizardRemoveSubject = function(index) {
  const term = wizardState.terms[wizardState.currentTermIndex];
  term.subjects.splice(index, 1);
  renderWizardStep(4);
};

window.wizardFinish = async function() {
  saveCurrentStepData();

  const { userId, childId, yearData, terms } = wizardState;

  try {
    // Create academic year
    const academicYear = await createAcademicYear(userId, childId, yearData);
    if (!academicYear) throw new Error('Failed to create academic year');

    // Create terms and generate weeks
    for (const termData of terms) {
      termData.academicYearId = academicYear.id;
      const term = await createTerm(userId, childId, termData);
      if (term) {
        await generateWeeksForTerm(userId, childId, term, academicYear);
      }
    }

    alert('✅ Đã tạo năm học thành công!');
    closeAcademicWizard();

    // Dispatch event for app to refresh
    window.dispatchEvent(new CustomEvent('academicYearCreated', { detail: academicYear }));

  } catch (error) {
    console.error('Error creating academic year:', error);
    alert('❌ Lỗi khi tạo năm học. Vui lòng thử lại.');
  }
};

function saveCurrentStepData() {
  if (wizardState.step === 1) {
    wizardState.yearData.startDate = document.getElementById('wizard-start')?.value || wizardState.yearData.startDate;
    wizardState.yearData.endDate = document.getElementById('wizard-end')?.value || wizardState.yearData.endDate;
    wizardState.yearData.school = document.getElementById('wizard-school')?.value || '';
    wizardState.yearData.studentGrade = parseInt(document.getElementById('wizard-grade')?.value) || 1;
  }
}

// ============================================
// CALENDAR OVERVIEW
// ============================================

export async function renderCalendarOverview(userId, childId, container) {
  const years = await getAcademicYears(userId, childId);

  if (years.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📅</div>
        <h3>Chưa có năm học</h3>
        <p>Thiết lập năm học để bắt đầu lên kế hoạch</p>
        <button class="btn btn-primary" onclick="window.showAcademicWizard()">
          + Thiết lập năm học
        </button>
      </div>
    `;
    return;
  }

  const activeYear = years.find(y => y.status === 'active') || years[0];
  const terms = await getTerms(userId, childId, activeYear.id);
  const currentWeek = await getCurrentWeek(userId, childId);

  container.innerHTML = `
    <div class="calendar-overview">
      <div class="calendar-overview-header">
        <h2>📅 ${activeYear.name}</h2>
        <div class="header-meta">
          <span>Lớp ${activeYear.studentGrade} - ${getLevelFromGrade(activeYear.studentGrade).name}</span>
          ${activeYear.school ? `<span>• ${activeYear.school}</span>` : ''}
        </div>
        <button class="btn btn-sm btn-outline" onclick="window.editAcademicYear('${activeYear.id}')">⚙️</button>
      </div>

      <div class="year-timeline">
        ${renderYearTimeline(activeYear, terms)}
      </div>

      <div class="terms-grid">
        ${terms.map(term => renderTermCard(term, currentWeek)).join('')}
      </div>

      ${currentWeek ? `
        <div class="current-week-highlight">
          <h4>📍 Tuần hiện tại: ${currentWeek.name}</h4>
          <p>${formatDateRange(currentWeek.startDate, currentWeek.endDate)}</p>
          <span class="week-type-badge ${currentWeek.type}">${getWeekTypeLabel(currentWeek.type)}</span>
        </div>
      ` : ''}
    </div>
  `;
}

function renderYearTimeline(year, terms) {
  const months = ['T9', 'T10', 'T11', 'T12', 'T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8'];

  return `
    <div class="timeline">
      <div class="timeline-months">
        ${months.map(m => `<div class="timeline-month">${m}</div>`).join('')}
      </div>
      <div class="timeline-bar">
        ${terms.map(term => {
          const startMonth = new Date(term.startDate).getMonth();
          const endMonth = new Date(term.endDate).getMonth();
          // Calculate position (simplified)
          return `<div class="timeline-term" data-term="${term.shortName}"></div>`;
        }).join('')}
      </div>
    </div>
  `;
}

function renderTermCard(term, currentWeek) {
  const totalWeeks = term.totalWeeks || 19;
  const completedWeeks = currentWeek && currentWeek.termId === term.id
    ? currentWeek.weekNumber - 1
    : term.status === 'completed' ? totalWeeks : 0;
  const progress = (completedWeeks / totalWeeks * 100).toFixed(0);

  return `
    <div class="term-card ${term.status === 'active' ? 'active' : ''}">
      <div class="term-card-header">
        <h3>${term.name}</h3>
        <span class="term-dates">${formatDateRange(term.startDate, term.endDate)}</span>
      </div>
      <div class="term-card-body">
        <div class="term-progress">
          <div class="progress-bar">
            <div class="progress-fill" style="width: ${progress}%"></div>
          </div>
          <span class="progress-text">${completedWeeks}/${totalWeeks} tuần</span>
        </div>
        <div class="term-subjects">
          ${(term.subjects || []).slice(0, 3).map(s =>
            `<span class="subject-badge">${s.name}</span>`
          ).join('')}
          ${(term.subjects || []).length > 3 ? `<span class="more">+${term.subjects.length - 3}</span>` : ''}
        </div>
      </div>
      <div class="term-card-footer">
        <button class="btn btn-sm" onclick="window.showTermDetail('${term.id}')">
          Xem chi tiết
        </button>
      </div>
    </div>
  `;
}

// ============================================
// TERM DETAIL VIEW
// ============================================

export async function renderTermDetail(userId, childId, termId, container) {
  const term = await getTerm(userId, childId, termId);
  if (!term) {
    container.innerHTML = '<p>Không tìm thấy kỳ học</p>';
    return;
  }

  const weeks = await getWeeks(userId, childId, termId);
  const today = new Date().toISOString().split('T')[0];

  container.innerHTML = `
    <div class="term-detail">
      <div class="term-detail-header">
        <button class="btn btn-sm btn-back" onclick="window.showCalendarOverview()">◀ Năm học</button>
        <h2>📚 ${term.name}</h2>
        <span>${formatDateRange(term.startDate, term.endDate)}</span>
      </div>

      <div class="weeks-table">
        <div class="weeks-table-header">
          <span>Tuần</span>
          <span>Ngày</span>
          <span>Loại</span>
          <span>Ghi chú</span>
          <span>Trạng thái</span>
        </div>
        <div class="weeks-table-body">
          ${weeks.sort((a, b) => a.weekNumber - b.weekNumber).map(week => {
            const isCurrent = week.startDate <= today && week.endDate >= today;
            const isPast = week.endDate < today;
            const status = isCurrent ? 'current' : (isPast ? 'done' : 'upcoming');

            return `
              <div class="week-row ${status}" onclick="window.showWeekDetail('${week.id}')">
                <span class="week-number">${week.weekNumber}</span>
                <span class="week-dates">${formatDateRange(week.startDate, week.endDate)}</span>
                <span class="week-type">
                  <span class="type-badge ${week.type}">${getWeekTypeLabel(week.type)}</span>
                </span>
                <span class="week-notes">${week.adjustments?.reason || week.goals?.focus || ''}</span>
                <span class="week-status">
                  ${status === 'current' ? '🔵 Hiện tại' :
                    status === 'done' ? '✅ Xong' : '⚪ Sắp tới'}
                </span>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <div class="term-stats">
        <h4>📊 Thống kê</h4>
        <div class="stats-grid">
          <div class="stat-item">
            <span class="stat-value">${weeks.filter(w => w.type === 'learning').length}</span>
            <span class="stat-label">Tuần học</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">${weeks.filter(w => w.type === 'review').length}</span>
            <span class="stat-label">Tuần ôn</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">${weeks.filter(w => w.type === 'exam').length}</span>
            <span class="stat-label">Tuần thi</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ============================================
// WEEK DETAIL VIEW
// ============================================

export async function renderWeekDetail(userId, childId, weekId, container) {
  const { getWeek, updateWeek } = await import('./academic-calendar.js');
  const week = await getWeek(userId, childId, weekId);

  if (!week) {
    container.innerHTML = '<p>Không tìm thấy tuần</p>';
    return;
  }

  const today = new Date().toISOString().split('T')[0];
  const isCurrent = week.startDate <= today && week.endDate >= today;
  const isPast = week.endDate < today;

  container.innerHTML = `
    <div class="week-detail">
      <div class="week-detail-header">
        <button class="btn btn-sm btn-back" onclick="window.showTermDetail('${week.termId}')">◀ Kỳ học</button>
        <div class="week-title">
          <h2>${week.name}</h2>
          <span class="week-type-badge ${week.type}">${getWeekTypeLabel(week.type)}</span>
        </div>
        <span class="week-dates-large">${formatDateRange(week.startDate, week.endDate)}</span>
      </div>

      ${isCurrent ? '<div class="current-badge">📍 Tuần hiện tại</div>' : ''}

      <div class="week-content">
        <div class="week-section">
          <h4>🎯 Mục tiêu tuần</h4>
          <div class="week-focus">
            <input type="text" id="week-focus-input"
                   value="${week.goals?.focus || ''}"
                   placeholder="VD: Tập trung ôn Toán chương 3"
                   onchange="window.updateWeekFocus('${weekId}', this.value)" />
          </div>
        </div>

        <div class="week-section">
          <h4>📋 Công việc trong tuần</h4>
          <div class="week-tasks" id="week-tasks-list">
            ${(week.goals?.tasks || []).map((task, i) => `
              <div class="task-item ${task.completed ? 'completed' : ''}">
                <input type="checkbox" ${task.completed ? 'checked' : ''}
                       onchange="window.toggleWeekTask('${weekId}', ${i}, this.checked)" />
                <span class="task-subject">${task.subject}</span>
                <span class="task-text">${task.task}</span>
              </div>
            `).join('') || '<p class="empty-text">Chưa có công việc</p>'}
          </div>
          <button class="btn btn-sm btn-outline" onclick="window.addWeekTask('${weekId}')">
            + Thêm công việc
          </button>
        </div>

        ${week.adjustments?.reason ? `
          <div class="week-section">
            <h4>📌 Ghi chú</h4>
            <p class="week-note">${week.adjustments.reason}</p>
            ${week.adjustments.skipDates?.length > 0 ? `
              <p class="skip-dates">Ngày nghỉ: ${week.adjustments.skipDates.join(', ')}</p>
            ` : ''}
          </div>
        ` : ''}

        ${isPast && week.result ? `
          <div class="week-section">
            <h4>📊 Kết quả tuần</h4>
            <div class="week-result">
              <div class="result-completion">
                <span class="result-value">${week.result.completionRate}%</span>
                <span class="result-label">Hoàn thành</span>
              </div>
              ${week.result.notes ? `<p class="result-notes">${week.result.notes}</p>` : ''}
            </div>
          </div>
        ` : ''}
      </div>

      <div class="week-actions">
        <button class="btn btn-primary" onclick="window.viewWeekSchedule('${week.startDate}')">
          📅 Xem lịch tuần này
        </button>
        ${isPast && !week.result ? `
          <button class="btn btn-secondary" onclick="window.reviewWeek('${weekId}')">
            ✍️ Đánh giá tuần
          </button>
        ` : ''}
      </div>
    </div>
  `;
}

// Week Detail Handlers
window.showWeekDetail = async function(weekId) {
  const childId = window.getCurrentUser ? window.getCurrentUser() : sessionStorage.getItem('sumSched_childId');
  const container = document.getElementById('academic-calendar-view');
  if (container) {
    const { authUserId } = await getAuthContext();
    await renderWeekDetail(authUserId, childId, weekId, container);
  }
};

window.updateWeekFocus = async function(weekId, focus) {
  const childId = window.getCurrentUser ? window.getCurrentUser() : sessionStorage.getItem('sumSched_childId');
  const { authUserId } = await getAuthContext();
  const { updateWeek, getWeek } = await import('./academic-calendar.js');

  const week = await getWeek(authUserId, childId, weekId);
  if (week) {
    week.goals = week.goals || {};
    week.goals.focus = focus;
    await updateWeek(authUserId, childId, weekId, { goals: week.goals });
  }
};

window.toggleWeekTask = async function(weekId, taskIndex, completed) {
  const childId = window.getCurrentUser ? window.getCurrentUser() : sessionStorage.getItem('sumSched_childId');
  const { authUserId } = await getAuthContext();
  const { updateWeek, getWeek } = await import('./academic-calendar.js');

  const week = await getWeek(authUserId, childId, weekId);
  if (week && week.goals?.tasks?.[taskIndex]) {
    week.goals.tasks[taskIndex].completed = completed;
    await updateWeek(authUserId, childId, weekId, { goals: week.goals });
  }
};

window.addWeekTask = async function(weekId) {
  const subject = prompt('Môn học:');
  if (!subject) return;
  const task = prompt('Công việc:');
  if (!task) return;

  const childId = window.getCurrentUser ? window.getCurrentUser() : sessionStorage.getItem('sumSched_childId');
  const { authUserId } = await getAuthContext();
  const { updateWeek, getWeek } = await import('./academic-calendar.js');

  const week = await getWeek(authUserId, childId, weekId);
  if (week) {
    week.goals = week.goals || {};
    week.goals.tasks = week.goals.tasks || [];
    week.goals.tasks.push({ subject, task, completed: false });
    await updateWeek(authUserId, childId, weekId, { goals: week.goals });
    window.showWeekDetail(weekId);
  }
};

window.viewWeekSchedule = function(startDate) {
  // Navigate to schedule view with this week
  window.dispatchEvent(new CustomEvent('navigateToWeek', { detail: { startDate } }));

  // Switch to schedule view
  const scheduleBtn = document.querySelector('[data-view="schedule"]');
  if (scheduleBtn) scheduleBtn.click();
};

window.reviewWeek = async function(weekId) {
  const completion = prompt('Tỷ lệ hoàn thành (%):', '80');
  if (!completion) return;
  const notes = prompt('Ghi chú:', '');

  const childId = window.getCurrentUser ? window.getCurrentUser() : sessionStorage.getItem('sumSched_childId');
  const { authUserId } = await getAuthContext();
  const { updateWeek } = await import('./academic-calendar.js');

  await updateWeek(authUserId, childId, weekId, {
    result: {
      completionRate: parseInt(completion),
      notes: notes || ''
    }
  });
  window.showWeekDetail(weekId);
};

// Helper to get auth context
async function getAuthContext() {
  // This is a workaround - ideally we'd pass this through
  const authUserId = window.authUserId || sessionStorage.getItem('authUserId') || 'demo';
  return { authUserId };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function generateYearOptions(selectedYear) {
  const currentYear = new Date().getFullYear();
  let options = '';
  for (let y = currentYear - 2; y <= currentYear + 2; y++) {
    const yearStr = `${y}-${y + 1}`;
    options += `<option value="${yearStr}" ${y === selectedYear ? 'selected' : ''}>${yearStr}</option>`;
  }
  return options;
}

function generateGradeOptions(selectedGrade) {
  let options = '';
  for (let g = 1; g <= 12; g++) {
    options += `<option value="${g}" ${g === selectedGrade ? 'selected' : ''}>Lớp ${g}</option>`;
  }
  return options;
}

function formatDateInput(date) {
  const d = new Date(date);
  return d.toISOString().split('T')[0];
}

function formatDateRange(start, end) {
  const s = new Date(start);
  const e = new Date(end);
  const opts = { day: '2-digit', month: '2-digit' };

  if (start === end) {
    return s.toLocaleDateString('vi-VN', opts);
  }
  return `${s.toLocaleDateString('vi-VN', opts)} - ${e.toLocaleDateString('vi-VN', opts)}`;
}

function calculateWeeksBetween(start, end) {
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.ceil(diffDays / 7);
}

function getWeekTypeLabel(type) {
  switch (type) {
    case 'learning': return '📚 Học';
    case 'review': return '📝 Ôn';
    case 'exam': return '📋 Thi';
    case 'break': return '🏖️ Nghỉ';
    default: return type;
  }
}

// ============================================
// EXPORTS
// ============================================

export default {
  showAcademicCalendarWizard,
  closeAcademicWizard,
  renderCalendarOverview,
  renderTermDetail,
  renderWeekDetail
};
