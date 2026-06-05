/**
 * Strategic Planning Module
 * Step 1-4: Thu thập thông tin → AI phân tích → Lộ trình 12 năm
 */

import { ref, get, set, push } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js';

let db = null;

export function initStrategicPlanning(database) {
  db = database;
}

// ============================================
// DATA MODELS
// ============================================

/**
 * Student Context - Năng lực học sinh
 */
export const SUBJECT_LEVELS = {
  1: 'Yếu - Cần hỗ trợ nhiều',
  2: 'Yếu - Cần cải thiện',
  3: 'Trung bình yếu',
  4: 'Trung bình',
  5: 'Trung bình khá',
  6: 'Khá',
  7: 'Khá giỏi',
  8: 'Giỏi',
  9: 'Xuất sắc',
  10: 'Xuất sắc - Năng khiếu'
};

export const SKILL_LEVELS = {
  1: 'Rất yếu',
  2: 'Yếu',
  3: 'Cần cải thiện',
  4: 'Trung bình',
  5: 'Khá',
  6: 'Tốt',
  7: 'Rất tốt',
  8: 'Xuất sắc',
  9: 'Nổi bật',
  10: 'Đặc biệt'
};

export const LEARNING_STYLES = {
  visual: { name: 'Nhìn (Visual)', desc: 'Học tốt qua hình ảnh, sơ đồ, video' },
  auditory: { name: 'Nghe (Auditory)', desc: 'Học tốt qua nghe giảng, thảo luận' },
  kinesthetic: { name: 'Vận động (Kinesthetic)', desc: 'Học tốt qua thực hành, làm' },
  mixed: { name: 'Kết hợp', desc: 'Phù hợp nhiều phương pháp' }
};

export const ACADEMIC_PRIORITIES = {
  balanced: { name: 'Cân bằng', desc: 'Phát triển đều các môn' },
  specialized: { name: 'Chuyên sâu', desc: 'Tập trung vào 1-2 môn mạnh' },
  olympiad: { name: 'Học sinh giỏi', desc: 'Hướng thi HSG, Olympic' }
};

// Default subjects by grade level
export const SUBJECTS_BY_LEVEL = {
  elementary: ['Toán', 'Tiếng Việt', 'Tiếng Anh', 'Khoa học', 'Lịch sử-Địa lý', 'Tin học', 'Mỹ thuật', 'Âm nhạc', 'Thể dục'],
  middle: ['Toán', 'Ngữ văn', 'Tiếng Anh', 'Vật lý', 'Hóa học', 'Sinh học', 'Lịch sử', 'Địa lý', 'GDCD', 'Tin học', 'Công nghệ'],
  high: ['Toán', 'Ngữ văn', 'Tiếng Anh', 'Vật lý', 'Hóa học', 'Sinh học', 'Lịch sử', 'Địa lý', 'GDCD', 'Tin học']
};

// School types
export const SCHOOL_TYPES = {
  public: { name: 'Công lập', desc: 'Trường công lập theo chương trình Bộ GD&ĐT' },
  private: { name: 'Tư thục', desc: 'Trường tư thục Việt Nam' },
  international: { name: 'Quốc tế', desc: 'Trường quốc tế, song ngữ' },
  specialized: { name: 'Chuyên', desc: 'Trường THPT chuyên, năng khiếu' }
};

// Family financial capability for study abroad
export const FINANCIAL_CAPACITY = {
  full_self: { name: 'Tự túc hoàn toàn', desc: 'Có khả năng tài chính du học không cần học bổng' },
  partial_scholarship: { name: 'Cần học bổng bán phần', desc: 'Cần 30-50% học bổng để du học' },
  high_scholarship: { name: 'Cần học bổng cao', desc: 'Cần 70-100% học bổng để du học' },
  full_scholarship: { name: 'Chỉ đi khi có học bổng toàn phần', desc: 'Bắt buộc có full scholarship' }
};

// Stage-based development priorities (Australia scholarship profile building)
export const DEVELOPMENT_STAGES = {
  elementary: {
    name: 'Tiểu học (Lớp 1-5)',
    academic: { weight: 30, focus: 'Nền tảng Toán-Anh, yêu thích học tập' },
    softSkills: { weight: 40, focus: 'Giao tiếp, sáng tạo, tò mò, tự tin' },
    character: { weight: 30, focus: 'Kỷ luật tự giác, trung thực, empathy' }
  },
  middle: {
    name: 'THCS (Lớp 6-9)',
    academic: { weight: 40, focus: 'Academic excellence, IELTS 6.0+, competitions' },
    softSkills: { weight: 35, focus: 'Leadership, teamwork, public speaking, critical thinking' },
    character: { weight: 25, focus: 'Resilience, goal-setting, social responsibility' }
  },
  high: {
    name: 'THPT (Lớp 10-12)',
    academic: { weight: 50, focus: 'GPA 8.5+, IELTS 7.5+, SAT/IB/A-Level, research' },
    softSkills: { weight: 30, focus: 'Project management, entrepreneurship, mentoring' },
    character: { weight: 20, focus: 'Global citizenship, unique story, impact' }
  }
};

// Top 5 Australian universities requirements
export const TOP_5_AUSTRALIA_UNIS = {
  melbourne: { name: 'University of Melbourne', ielts: 6.5, gpa: 'Top 10%', extras: 'Leadership, community service' },
  sydney: { name: 'University of Sydney', ielts: 6.5, gpa: 'Top 10%', extras: 'Academic achievements, extracurriculars' },
  unsw: { name: 'UNSW Sydney', ielts: 6.5, gpa: 'Top 15%', extras: 'STEM focus, innovation' },
  anu: { name: 'Australian National University', ielts: 6.5, gpa: 'Top 10%', extras: 'Research potential' },
  monash: { name: 'Monash University', ielts: 6.5, gpa: 'Top 15%', extras: 'Global experience' }
};

export const SKILLS = [
  { id: 'problemSolving', name: 'Giải quyết vấn đề' },
  { id: 'creativity', name: 'Sáng tạo' },
  { id: 'communication', name: 'Giao tiếp' },
  { id: 'teamwork', name: 'Làm việc nhóm' },
  { id: 'selfStudy', name: 'Tự học' },
  { id: 'timeManagement', name: 'Quản lý thời gian' },
  { id: 'focus', name: 'Tập trung' },
  { id: 'resilience', name: 'Kiên trì' }
];

// English proficiency levels with IELTS equivalent
export const ENGLISH_LEVELS = {
  beginner: { name: 'Beginner', ielts: '< 3.0', desc: 'Mới bắt đầu học' },
  elementary: { name: 'Elementary', ielts: '3.0-4.0', desc: 'Giao tiếp cơ bản' },
  pre_intermediate: { name: 'Pre-Intermediate', ielts: '4.0-5.0', desc: 'Hiểu nội dung đơn giản' },
  intermediate: { name: 'Intermediate', ielts: '5.0-6.0', desc: 'Giao tiếp tốt trong nhiều tình huống' },
  upper_intermediate: { name: 'Upper-Intermediate', ielts: '6.0-7.0', desc: 'Sử dụng thành thạo học thuật' },
  advanced: { name: 'Advanced', ielts: '7.0+', desc: 'Gần như native speaker' }
};

// Achievement/Competition categories
export const ACHIEVEMENT_CATEGORIES = {
  academic_olympiad: { name: 'Olympic/HSG', weight: 5, examples: ['Olympic Toán', 'HSG Quốc gia', 'Khoa học kỹ thuật'] },
  stem_competition: { name: 'STEM', weight: 4, examples: ['Robotics', 'Coding', 'Science Fair'] },
  arts_culture: { name: 'Nghệ thuật', weight: 3, examples: ['Âm nhạc', 'Mỹ thuật', 'Viết văn'] },
  sports: { name: 'Thể thao', weight: 3, examples: ['Giải vô địch', 'Đại hội TDTT'] },
  leadership: { name: 'Lãnh đạo', weight: 4, examples: ['MUN', 'Student Council', 'Club President'] },
  community_service: { name: 'Cộng đồng', weight: 4, examples: ['Volunteer', 'Social project', 'Charity'] },
  entrepreneurship: { name: 'Khởi nghiệp', weight: 4, examples: ['Startup', 'Business competition'] }
};

export const ACHIEVEMENT_LEVELS = {
  international: { name: 'Quốc tế', points: 100 },
  national: { name: 'Quốc gia', points: 80 },
  regional: { name: 'Vùng/Tỉnh', points: 50 },
  city: { name: 'Thành phố', points: 30 },
  school: { name: 'Trường', points: 10 }
};

// Extracurricular depth levels
export const ACTIVITY_DEPTH = {
  explorer: { name: 'Khám phá', years: '< 1 năm', level: 'Thử nghiệm' },
  committed: { name: 'Cam kết', years: '1-2 năm', level: 'Tham gia đều đặn' },
  dedicated: { name: 'Chuyên tâm', years: '2-4 năm', level: 'Vai trò quan trọng' },
  expert: { name: 'Chuyên sâu', years: '4+ năm', level: 'Thành tích nổi bật' },
  spike: { name: 'SPIKE', years: '3+ năm', level: 'Xuất sắc, độc đáo, có impact' }
};

// ============================================
// STUDENT CONTEXT (Step 1a)
// ============================================

export function createEmptyStudentContext(grade) {
  const level = grade <= 5 ? 'elementary' : grade <= 9 ? 'middle' : 'high';
  const subjects = {};
  SUBJECTS_BY_LEVEL[level].forEach(subj => {
    subjects[subj] = { level: 5, notes: '' };
  });

  const skills = {};
  SKILLS.forEach(s => {
    skills[s.id] = 5;
  });

  return {
    currentGrade: grade,
    academics: subjects,
    skills: skills,
    talents: [],
    challenges: [],
    learningStyle: 'mixed',
    interests: [],
    hobbies: [],

    // Enhanced: English proficiency details
    englishProfile: {
      currentLevel: 'elementary',
      ieltsScore: null, // null if not tested
      yearsLearning: 0,
      learningMethod: [], // ['school', 'center', 'online', 'native_teacher', 'self_study']
      dailyExposure: 'low' // 'low', 'medium', 'high'
    },

    // Enhanced: Achievement history with categories and levels
    achievements: [], // [{category, level, title, year, description, impact}]

    // Enhanced: Extracurricular activities with depth
    extracurriculars: [], // [{activity, category, yearsInvolved, depth, role, achievements}]

    // Enhanced: Leadership evidence
    leadershipHistory: [], // [{role, organization, duration, impact, description}]

    // Enhanced: Potential "spike" - the unique strength
    potentialSpike: {
      area: '', // What area could be their spike?
      evidence: [], // What evidence supports this?
      developmentPlan: '' // How to develop further?
    }
  };
}

export async function saveStudentContext(userId, childId, context) {
  const data = {
    ...context,
    updatedAt: new Date().toISOString()
  };

  if (!db || !userId) {
    localStorage.setItem(`sumSched_${childId}_studentContext`, JSON.stringify(data));
    return true;
  }

  try {
    await set(ref(db, `studentContext/${userId}/${childId}`), data);
    return true;
  } catch (error) {
    console.error('Error saving student context:', error);
    return false;
  }
}

export async function getStudentContext(userId, childId) {
  if (!db || !userId) {
    const stored = localStorage.getItem(`sumSched_${childId}_studentContext`);
    return stored ? JSON.parse(stored) : null;
  }

  try {
    const snapshot = await get(ref(db, `studentContext/${userId}/${childId}`));
    return snapshot.exists() ? snapshot.val() : null;
  } catch (error) {
    console.error('Error getting student context:', error);
    return null;
  }
}

// ============================================
// FAMILY ASPIRATIONS (Step 1b)
// ============================================

export function createEmptyFamilyAspirations() {
  return {
    // Current context
    currentContext: {
      schoolName: '',
      schoolType: 'public',
      currentPerformance: 'average', // top5, top10, top20, average, below_average
      recentGrades: [], // [{term: 'HK1-2024', subjects: {}, gpa: 8.5}]
      englishLevel: 'basic' // basic, elementary, intermediate, upper_intermediate, advanced
    },
    // Academic goals
    academicGoals: {
      targetHighSchool: '',
      targetUniversity: '',
      targetMajor: '',
      targetCareer: '',
      studyAbroadIntent: true,
      targetCountry: 'australia',
      targetUniRank: 'top5', // top5, top20, top50, any
      scholarshipRequirement: 'full_scholarship' // full_self, partial_scholarship, high_scholarship, full_scholarship
    },
    // Development focus
    developmentFocus: {
      academicPriority: 'balanced',
      extracurricular: [],
      softSkills: [],
      values: [],
      uniqueStrengths: [], // What makes this child unique?
      passions: [] // Deep interests that could become unique story
    },
    // Family resources
    resources: {
      studyTimePerDay: 3,
      budget: 'moderate',
      parentInvolvement: 'medium',
      tutoringAvailable: false,
      onlineResourcesAccess: true,
      networkConnections: [], // Alumni, mentors, references
      studyAbroadBudget: 'scholarship_dependent' // self_funded, partial_support, scholarship_dependent
    },
    // Constraints
    constraints: {
      healthIssues: [],
      familyCommitments: [],
      otherResponsibilities: []
    },

    // Enhanced: Application timeline
    applicationTimeline: {
      targetApplyYear: null, // Year planning to apply (e.g., 2030)
      gapYearConsidered: false,
      preferredPathway: 'direct_entry', // 'direct_entry', 'foundation', 'pathway'
      earlyDecision: false,
      backupCountries: [] // ['uk', 'usa', 'singapore', 'japan']
    }
  };
}

export async function saveFamilyAspirations(userId, childId, aspirations) {
  const data = {
    ...aspirations,
    updatedAt: new Date().toISOString()
  };

  if (!db || !userId) {
    localStorage.setItem(`sumSched_${childId}_familyAspirations`, JSON.stringify(data));
    return true;
  }

  try {
    await set(ref(db, `familyAspirations/${userId}/${childId}`), data);
    return true;
  } catch (error) {
    console.error('Error saving family aspirations:', error);
    return false;
  }
}

export async function getFamilyAspirations(userId, childId) {
  if (!db || !userId) {
    const stored = localStorage.getItem(`sumSched_${childId}_familyAspirations`);
    return stored ? JSON.parse(stored) : null;
  }

  try {
    const snapshot = await get(ref(db, `familyAspirations/${userId}/${childId}`));
    return snapshot.exists() ? snapshot.val() : null;
  } catch (error) {
    console.error('Error getting family aspirations:', error);
    return null;
  }
}

// ============================================
// AI ANALYSIS (Step 2)
// ============================================

/**
 * Generate AI analysis prompt from collected data
 * 5 Expert Perspectives:
 * 1. Australian Study Abroad Specialist (scholarship pathway to top 5)
 * 2. Holistic Development Expert (academic + soft skills + character by stage)
 * 3. Current Context Analyst (school, performance, family capability)
 * 4. Human Potential Development Specialist (psychology, IKIGAI)
 * 5. Scholarship Profile Builder (admission requirements)
 */
export function generateAnalysisPrompt(studentContext, familyAspirations, childInfo) {
  const grade = studentContext.currentGrade;
  const level = grade <= 5 ? 'Tiểu học' : grade <= 9 ? 'THCS' : 'THPT';
  const yearsToGrad12 = 12 - grade;

  // Calculate average academic level
  const academicLevels = Object.values(studentContext.academics).map(a => a.level);
  const avgAcademic = (academicLevels.reduce((a, b) => a + b, 0) / academicLevels.length).toFixed(1);

  // Find strengths and weaknesses
  const strengths = Object.entries(studentContext.academics)
    .filter(([_, v]) => v.level >= 7)
    .map(([k, _]) => k);
  const weaknesses = Object.entries(studentContext.academics)
    .filter(([_, v]) => v.level <= 4)
    .map(([k, _]) => k);

  // Current context from family aspirations
  const currentContext = familyAspirations.currentContext || {};
  const schoolType = SCHOOL_TYPES[currentContext.schoolType]?.name || 'Chưa xác định';
  const financialCapacity = FINANCIAL_CAPACITY[familyAspirations.academicGoals?.scholarshipRequirement]?.name || 'Chưa xác định';

  const prompt = `
Bạn là HỘI ĐỒNG CHUYÊN GIA gồm 5 vai trò, cùng phân tích và đề xuất LỘ TRÌNH HỌC BỔNG TOÀN PHẦN DU HỌC ÚC cho học sinh.

═══════════════════════════════════════════════════════════════════
📋 THÔNG TIN HỌC SINH
═══════════════════════════════════════════════════════════════════

## 1. Thông tin cơ bản
- Tên: ${childInfo.name}
- Lớp hiện tại: ${grade} (${level})
- Số năm đến lớp 12: ${yearsToGrad12} năm
- Trường đang học: ${currentContext.schoolName || 'Chưa cung cấp'}
- Loại trường: ${schoolType}
- Xếp loại hiện tại: ${currentContext.currentPerformance || 'Chưa xác định'}

## 2. Năng lực học thuật
- Điểm năng lực trung bình: ${avgAcademic}/10
- Môn mạnh (≥7/10): ${strengths.join(', ') || 'Chưa xác định'}
- Môn cần cải thiện (≤4/10): ${weaknesses.join(', ') || 'Không có'}
- Trình độ tiếng Anh: ${currentContext.englishLevel || 'Chưa đánh giá'}
- Phong cách học: ${LEARNING_STYLES[studentContext.learningStyle]?.name}

## 3. Điểm nổi bật & Thách thức
- Năng khiếu: ${studentContext.talents?.join(', ') || 'Chưa xác định'}
- Thành tích: ${studentContext.achievements?.join(', ') || 'Chưa có'}
- Sở thích/Đam mê: ${studentContext.interests?.join(', ') || 'Chưa xác định'}
- Khó khăn: ${studentContext.challenges?.join(', ') || 'Không có'}
- Điểm độc đáo: ${familyAspirations.developmentFocus?.uniqueStrengths?.join(', ') || 'Chưa xác định'}

## 4. Mục tiêu gia đình
- Mục tiêu cuối cùng: HỌC BỔNG TOÀN PHẦN đại học TOP 5 ÚC
- Trường ĐH mục tiêu: ${familyAspirations.academicGoals?.targetUniversity || 'Top 5 Australia'}
- Ngành học: ${familyAspirations.academicGoals?.targetMajor || 'Chưa xác định'}
- Nghề nghiệp: ${familyAspirations.academicGoals?.targetCareer || 'Chưa xác định'}
- Yêu cầu học bổng: ${financialCapacity}

## 5. Nguồn lực gia đình
- Thời gian học/ngày: ${familyAspirations.resources?.studyTimePerDay || 3}h
- Mức độ hỗ trợ phụ huynh: ${familyAspirations.resources?.parentInvolvement || 'medium'}
- Khả năng tài chính du học: ${familyAspirations.resources?.studyAbroadBudget || 'Phụ thuộc học bổng'}

═══════════════════════════════════════════════════════════════════
🎯 YÊU CẦU PHÂN TÍCH (5 GÓC NHÌN CHUYÊN GIA)
═══════════════════════════════════════════════════════════════════

### 👨‍🎓 GÓC NHÌN 1: CHUYÊN GIA DU HỌC ÚC (Australian Education Consultant)
Đánh giá từ góc độ chuyên gia tư vấn du học Úc với 15+ năm kinh nghiệm:
- Yêu cầu thực tế của Top 5 Úc (Melbourne, Sydney, UNSW, ANU, Monash)
- Học bổng khả dụng: chính phủ Úc, chính phủ VN, scholarship từ trường
- Timeline apply học bổng (khi nào bắt đầu, deadline quan trọng)
- Hồ sơ cạnh tranh cần những gì? (GPA, IELTS, extracurriculars, essays)
- So sánh con đường: Direct entry vs Foundation/Pathway

### 👨‍🏫 GÓC NHÌN 2: CHUYÊN GIA PHÁT TRIỂN TOÀN DIỆN (Holistic Development)
Đánh giá phát triển 3 trụ cột theo giai đoạn:

**Tiểu học (Lớp 1-5):** Trọng số: Học thuật 30% | Kỹ năng mềm 40% | Nhân cách 30%
- Focus: Nền tảng Toán-Anh, yêu thích học tập, tò mò khám phá

**THCS (Lớp 6-9):** Trọng số: Học thuật 40% | Kỹ năng mềm 35% | Nhân cách 25%
- Focus: Academic excellence, IELTS 6.0+, leadership, critical thinking

**THPT (Lớp 10-12):** Trọng số: Học thuật 50% | Kỹ năng mềm 30% | Nhân cách 20%
- Focus: GPA 8.5+, IELTS 7.5+, research, unique story, impact

### 👨‍👩‍👧 GÓC NHÌN 3: PHÂN TÍCH BỐI CẢNH THỰC TẾ (Current Context)
Đánh giá dựa trên:
- Trường đang học có phù hợp với mục tiêu không?
- Khoảng cách giữa năng lực hiện tại và yêu cầu top 5 Úc
- Khả năng tài chính của gia đình - chiến lược học bổng phù hợp
- Nguồn lực có sẵn (thời gian, người hỗ trợ, mạng lưới)
- Rủi ro và cách giảm thiểu

### 👨‍🔬 GÓC NHÌN 4: CHUYÊN GIA TIỀM NĂNG CON NGƯỜI (Human Potential)
Đánh giá từ góc độ tâm lý học phát triển và IKIGAI:
- Điểm mạnh bẩm sinh (What you're good at)
- Đam mê thực sự (What you love)
- Thế giới cần gì từ con? (What the world needs)
- Con có thể làm nghề gì? (What you can be paid for)
- Động lực nội tại vs áp lực bên ngoài
- Stress tolerance và resilience
- Unique story tiềm năng cho application

### 📝 GÓC NHÌN 5: PROFILE BUILDER (Scholarship Application)
Đánh giá hồ sơ theo chuẩn admission top 5 Úc:

**Academic Profile:**
- GPA requirement: 8.5+/10 (thực tế 9.0+ để cạnh tranh)
- English: IELTS 7.0-7.5+ hoặc PTE 65+
- Standardized tests: SAT (nếu cần)

**Extracurricular Profile (SPIKE approach):**
- Một lĩnh vực XUẤT SẮC (spike) quan trọng hơn giỏi đều
- Leadership evidence (không chỉ title, mà impact)
- Community service (sustained commitment, measurable impact)
- Awards & Recognition (Olympic, competitions)

**Personal Story:**
- Unique angle - điều gì làm con khác biệt?
- Growth narrative - con đã vượt qua khó khăn gì?
- Vision & Goals - con muốn đóng góp gì cho thế giới?

═══════════════════════════════════════════════════════════════════
📊 OUTPUT FORMAT (JSON)
═══════════════════════════════════════════════════════════════════

{
  "expertAssessment": {
    "australiaExpert": {
      "scholarshipReadiness": "not_ready|early_stage|developing|competitive|highly_competitive",
      "feasibilityPercent": number,
      "primaryPathway": "direct_entry|foundation|pathway_program",
      "targetScholarships": ["string"],
      "criticalGaps": ["string"],
      "timelineAlert": "string"
    },
    "holisticDevelopment": {
      "academicScore": number,
      "softSkillsScore": number,
      "characterScore": number,
      "currentStageBalance": "balanced|academic_heavy|soft_skills_heavy|needs_rebalance",
      "stagePriorities": {
        "immediate": { "academic": number, "softSkills": number, "character": number },
        "nextStage": { "academic": number, "softSkills": number, "character": number }
      }
    },
    "contextAnalysis": {
      "schoolFit": "excellent|good|adequate|poor",
      "resourceAdequacy": "sufficient|needs_supplement|insufficient",
      "financialStrategy": "string",
      "riskLevel": "low|medium|high",
      "riskFactors": ["string"]
    },
    "humanPotential": {
      "innateStrengths": ["string"],
      "passionAlignment": "clear|emerging|unclear",
      "ikigaiInsight": "string",
      "motivationType": "intrinsic|extrinsic|mixed",
      "uniqueAngle": "string",
      "burnoutRisk": "low|medium|high"
    },
    "profileGaps": {
      "academicGaps": ["string"],
      "extracurricularGaps": ["string"],
      "storyGaps": ["string"],
      "overallReadiness": number
    }
  },
  "pathOptions": [
    {
      "id": "path_1",
      "name": "string",
      "targetUni": "melbourne|sydney|unsw|anu|monash",
      "scholarshipType": "government|university|foundation",
      "description": "string",
      "suitabilityPercent": number,
      "pros": ["string"],
      "cons": ["string"],
      "requirements": ["string"],
      "timeline": "string"
    }
  ],
  "developmentRoadmap": {
    "elementary": {
      "academicFocus": ["string"],
      "softSkillsFocus": ["string"],
      "characterFocus": ["string"],
      "activities": ["string"],
      "milestones": ["string"],
      "parentRole": "string"
    },
    "middle": {
      "academicFocus": ["string"],
      "softSkillsFocus": ["string"],
      "characterFocus": ["string"],
      "activities": ["string"],
      "milestones": ["string"],
      "englishTarget": "string",
      "competitionsTarget": ["string"]
    },
    "high": {
      "academicFocus": ["string"],
      "softSkillsFocus": ["string"],
      "characterFocus": ["string"],
      "activities": ["string"],
      "milestones": ["string"],
      "applicationTimeline": {
        "grade10": ["string"],
        "grade11": ["string"],
        "grade12": ["string"]
      }
    }
  },
  "immediateActions": {
    "next30days": ["string"],
    "next3months": ["string"],
    "next6months": ["string"],
    "parentActions": ["string"]
  },
  "warningsAndRisks": {
    "criticalWarnings": ["string"],
    "commonMistakes": ["string"],
    "planBOptions": ["string"]
  }
}

Trả lời bằng tiếng Việt, format JSON theo cấu trúc trên.
`;

  return prompt;
}

/**
 * Call AI service for analysis
 */
export async function analyzeWithAI(prompt) {
  // Get API key from settings
  const apiKey = localStorage.getItem('sumSched_apiKey');
  if (!apiKey) {
    return {
      error: 'Chưa cấu hình API key. Vào Cài đặt → API Key để thêm.'
    };
  }

  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + apiKey, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4096
        }
      })
    });

    const data = await response.json();

    if (data.error) {
      return { error: data.error.message };
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      return { error: 'Không nhận được phản hồi từ AI' };
    }

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }

    return { error: 'Không thể parse phản hồi AI', rawText: text };

  } catch (error) {
    console.error('AI analysis error:', error);
    return { error: error.message };
  }
}

// ============================================
// AI RECOMMENDATION (Save/Load)
// ============================================

export async function saveAIRecommendation(userId, childId, recommendation) {
  const data = {
    ...recommendation,
    createdAt: new Date().toISOString()
  };

  if (!db || !userId) {
    localStorage.setItem(`sumSched_${childId}_aiRecommendation`, JSON.stringify(data));
    return true;
  }

  try {
    await set(ref(db, `aiRecommendations/${userId}/${childId}`), data);
    return true;
  } catch (error) {
    console.error('Error saving AI recommendation:', error);
    return false;
  }
}

export async function getAIRecommendation(userId, childId) {
  if (!db || !userId) {
    const stored = localStorage.getItem(`sumSched_${childId}_aiRecommendation`);
    return stored ? JSON.parse(stored) : null;
  }

  try {
    const snapshot = await get(ref(db, `aiRecommendations/${userId}/${childId}`));
    return snapshot.exists() ? snapshot.val() : null;
  } catch (error) {
    console.error('Error getting AI recommendation:', error);
    return null;
  }
}

// ============================================
// 12-YEAR ROADMAP (Step 4)
// ============================================

export async function saveRoadmap(userId, childId, roadmap) {
  const data = {
    ...roadmap,
    updatedAt: new Date().toISOString()
  };

  if (!db || !userId) {
    localStorage.setItem(`sumSched_${childId}_roadmap`, JSON.stringify(data));
    return true;
  }

  try {
    await set(ref(db, `roadmaps/${userId}/${childId}`), data);
    return true;
  } catch (error) {
    console.error('Error saving roadmap:', error);
    return false;
  }
}

export async function getRoadmap(userId, childId) {
  if (!db || !userId) {
    const stored = localStorage.getItem(`sumSched_${childId}_roadmap`);
    return stored ? JSON.parse(stored) : null;
  }

  try {
    const snapshot = await get(ref(db, `roadmaps/${userId}/${childId}`));
    return snapshot.exists() ? snapshot.val() : null;
  } catch (error) {
    console.error('Error getting roadmap:', error);
    return null;
  }
}

/**
 * Generate roadmap from AI recommendation
 */
export function generateRoadmapFromRecommendation(recommendation, selectedPathId, currentGrade) {
  const selectedPath = recommendation.pathOptions.find(p => p.id === selectedPathId);
  if (!selectedPath) return null;

  const roadmap = {
    id: `roadmap_${Date.now()}`,
    selectedPathId,
    selectedPathName: selectedPath.name,
    ultimateGoal: selectedPath.description,
    createdAt: new Date().toISOString(),

    phases: {
      elementary: {
        grades: [1, 2, 3, 4, 5].filter(g => g >= currentGrade && g <= 5),
        focus: recommendation.milestones?.elementary?.focus || '',
        subjects: recommendation.milestones?.elementary?.subjects || [],
        skills: recommendation.milestones?.elementary?.skills || [],
        activities: recommendation.milestones?.elementary?.activities || []
      },
      middle: {
        grades: [6, 7, 8, 9],
        focus: recommendation.milestones?.middle?.focus || '',
        subjects: recommendation.milestones?.middle?.subjects || [],
        skills: recommendation.milestones?.middle?.skills || [],
        activities: recommendation.milestones?.middle?.activities || []
      },
      high: {
        grades: [10, 11, 12],
        focus: recommendation.milestones?.high?.focus || '',
        subjects: recommendation.milestones?.high?.subjects || [],
        skills: recommendation.milestones?.high?.skills || [],
        activities: recommendation.milestones?.high?.activities || []
      }
    },

    immediateActions: recommendation.immediateActions || [],
    assessment: recommendation.assessment
  };

  return roadmap;
}

// ============================================
// EXPORTS
// ============================================

export default {
  initStrategicPlanning,
  // Constants - Basic
  SUBJECT_LEVELS,
  SKILL_LEVELS,
  LEARNING_STYLES,
  ACADEMIC_PRIORITIES,
  SUBJECTS_BY_LEVEL,
  SKILLS,
  // Constants - Enhanced for Australia Scholarship
  SCHOOL_TYPES,
  FINANCIAL_CAPACITY,
  DEVELOPMENT_STAGES,
  TOP_5_AUSTRALIA_UNIS,
  ENGLISH_LEVELS,
  ACHIEVEMENT_CATEGORIES,
  ACHIEVEMENT_LEVELS,
  ACTIVITY_DEPTH,
  // Student Context
  createEmptyStudentContext,
  saveStudentContext,
  getStudentContext,
  // Family Aspirations
  createEmptyFamilyAspirations,
  saveFamilyAspirations,
  getFamilyAspirations,
  // AI Analysis
  generateAnalysisPrompt,
  analyzeWithAI,
  saveAIRecommendation,
  getAIRecommendation,
  // Roadmap
  saveRoadmap,
  getRoadmap,
  generateRoadmapFromRecommendation
};
