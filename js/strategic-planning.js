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
    achievements: [],
    challenges: [],
    learningStyle: 'mixed',
    interests: [],
    hobbies: []
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
    academicGoals: {
      targetHighSchool: '',
      targetUniversity: '',
      targetMajor: '',
      targetCareer: ''
    },
    developmentFocus: {
      academicPriority: 'balanced',
      extracurricular: [],
      softSkills: [],
      values: []
    },
    resources: {
      studyTimePerDay: 3,
      budget: 'moderate',
      parentInvolvement: 'medium',
      tutoringAvailable: false,
      onlineResourcesAccess: true
    },
    constraints: {
      healthIssues: [],
      familyCommitments: [],
      otherResponsibilities: []
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
 */
export function generateAnalysisPrompt(studentContext, familyAspirations, childInfo) {
  const grade = studentContext.currentGrade;
  const level = grade <= 5 ? 'Tiểu học' : grade <= 9 ? 'THCS' : 'THPT';

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

  const prompt = `
Bạn là chuyên gia giáo dục Việt Nam với 20 năm kinh nghiệm tư vấn định hướng học tập.

## THÔNG TIN HỌC SINH
- Tên: ${childInfo.name}
- Lớp: ${grade} (${level})
- Điểm năng lực trung bình: ${avgAcademic}/10
- Môn mạnh (≥7): ${strengths.join(', ') || 'Chưa xác định'}
- Môn yếu (≤4): ${weaknesses.join(', ') || 'Không có'}
- Năng khiếu: ${studentContext.talents.join(', ') || 'Chưa xác định'}
- Thành tích: ${studentContext.achievements.join(', ') || 'Chưa có'}
- Khó khăn: ${studentContext.challenges.join(', ') || 'Không có'}
- Phong cách học: ${LEARNING_STYLES[studentContext.learningStyle]?.name}
- Sở thích: ${studentContext.interests.join(', ') || 'Chưa xác định'}

## MỤC TIÊU GIA ĐÌNH
- Trường THPT mục tiêu: ${familyAspirations.academicGoals.targetHighSchool || 'Chưa xác định'}
- Trường ĐH mục tiêu: ${familyAspirations.academicGoals.targetUniversity || 'Chưa xác định'}
- Ngành học: ${familyAspirations.academicGoals.targetMajor || 'Chưa xác định'}
- Nghề nghiệp: ${familyAspirations.academicGoals.targetCareer || 'Chưa xác định'}
- Định hướng: ${ACADEMIC_PRIORITIES[familyAspirations.developmentFocus.academicPriority]?.name}
- Thời gian học/ngày: ${familyAspirations.resources.studyTimePerDay}h
- Ngân sách: ${familyAspirations.resources.budget === 'limited' ? 'Hạn chế' : familyAspirations.resources.budget === 'moderate' ? 'Vừa phải' : 'Linh hoạt'}

## YÊU CẦU
Hãy phân tích và đề xuất:

1. **ĐÁNH GIÁ TỔNG QUAN** (200 từ)
   - Năng lực hiện tại so với mục tiêu
   - Điểm mạnh cần phát huy
   - Điểm yếu cần cải thiện
   - Khả năng đạt mục tiêu (%)

2. **ĐỀ XUẤT 3 LỘ TRÌNH** (mỗi option 100 từ)
   Mỗi lộ trình gồm:
   - Tên lộ trình
   - Mô tả ngắn
   - Độ phù hợp (%)
   - Ưu điểm
   - Nhược điểm
   - Yêu cầu

3. **CÁC MỐC QUAN TRỌNG** từ lớp ${grade} đến lớp 12
   Mỗi cấp học (Tiểu học/THCS/THPT) cần:
   - Mục tiêu chính
   - Môn cần tập trung
   - Kỹ năng cần phát triển
   - Hoạt động ngoại khóa

4. **KHUYẾN NGHỊ HÀNH ĐỘNG NGAY** (3-5 items)
   Những việc cần làm trong 3 tháng tới

Trả lời bằng tiếng Việt, format JSON theo cấu trúc sau:
{
  "assessment": {
    "currentLevel": "above_average|average|below_average",
    "goalFeasibility": "highly_achievable|achievable|challenging|very_challenging",
    "feasibilityPercent": number,
    "summary": "string",
    "strengths": ["string"],
    "weaknesses": ["string"],
    "risks": ["string"]
  },
  "pathOptions": [
    {
      "id": "path_1",
      "name": "string",
      "description": "string",
      "suitabilityPercent": number,
      "pros": ["string"],
      "cons": ["string"],
      "requirements": ["string"]
    }
  ],
  "milestones": {
    "elementary": { "focus": "string", "subjects": ["string"], "skills": ["string"], "activities": ["string"] },
    "middle": { "focus": "string", "subjects": ["string"], "skills": ["string"], "activities": ["string"] },
    "high": { "focus": "string", "subjects": ["string"], "skills": ["string"], "activities": ["string"] }
  },
  "immediateActions": ["string"]
}
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
  SUBJECT_LEVELS,
  SKILL_LEVELS,
  LEARNING_STYLES,
  ACADEMIC_PRIORITIES,
  SUBJECTS_BY_LEVEL,
  SKILLS,
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
