/**
 * Curriculum Generator - AI-powered curriculum creation
 */

import { aiProvider } from '../ai/index.js';

// ============================================
// CURRICULUM GENERATION
// ============================================

/**
 * Generate complete curriculum from roadmap and sources
 */
export async function generateCurriculum(options) {
  const {
    roadmap,
    subject,
    grade,
    semester,
    sources = [],
    customPrompt = null
  } = options;

  // Build context from sources
  const sourceContext = buildSourceContext(sources, subject, grade);

  // Build prompt
  const prompt = buildCurriculumPrompt({
    roadmap,
    subject,
    grade,
    semester,
    sourceContext,
    customPrompt
  });

  try {
    const response = await aiProvider.chat({
      task: 'roadmap_analysis',
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 8000,
      temperature: 0.5
    });

    if (!response.success) {
      return { error: response.error?.message || 'AI generation failed' };
    }

    // Parse JSON from response
    const curriculum = parseAIResponse(response.content);
    if (!curriculum) {
      return { error: 'Failed to parse AI response', rawText: response.content };
    }

    // Enrich with metadata
    return {
      ...curriculum,
      subject: { id: subject, name: getSubjectName(subject) },
      grade,
      semester,
      sourceIds: sources.map(s => s._metadata?.id || 'custom'),
      generatedAt: new Date().toISOString(),
      generatedBy: response.provider
    };

  } catch (error) {
    console.error('Curriculum generation error:', error);
    return { error: error.message || 'Generation failed' };
  }
}

/**
 * Generate detailed lesson content
 */
export async function generateLessonDetail(options) {
  const {
    curriculum,
    unit,
    lesson,
    sources = []
  } = options;

  const prompt = buildLessonDetailPrompt({
    curriculum,
    unit,
    lesson,
    sources
  });

  try {
    const response = await aiProvider.chat({
      task: 'deep_explanation',
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 4000,
      temperature: 0.6
    });

    if (!response.success) {
      return { error: response.error?.message || 'AI generation failed' };
    }

    const detailedLesson = parseAIResponse(response.content);
    if (!detailedLesson) {
      return { error: 'Failed to parse lesson detail' };
    }

    return {
      ...lesson,
      ...detailedLesson,
      detailGeneratedAt: new Date().toISOString()
    };

  } catch (error) {
    console.error('Lesson detail generation error:', error);
    return { error: error.message };
  }
}

// ============================================
// PROMPT BUILDERS
// ============================================

function buildCurriculumPrompt(options) {
  const { roadmap, subject, grade, semester, sourceContext, customPrompt } = options;

  const subjectName = getSubjectName(subject);
  const level = grade <= 5 ? 'elementary' : grade <= 9 ? 'middle' : 'high';

  // Extract relevant roadmap info
  const phaseKey = level;
  const phase = roadmap?.phases?.[phaseKey] || {};
  const relevantFocus = phase.subjects?.filter(s =>
    s.toLowerCase().includes(subjectName.toLowerCase())
  ) || [];

  return `
Bạn là chuyên gia giáo dục, hãy tạo GIÁO TRÌNH CHI TIẾT cho:

## THÔNG TIN CƠ BẢN
- Môn học: ${subjectName}
- Lớp: ${grade}
- Học kỳ: ${semester}
- Cấp độ: ${level === 'elementary' ? 'Tiểu học' : level === 'middle' ? 'THCS' : 'THPT'}

## MỤC TIÊU TỪ LỘ TRÌNH
${roadmap?.ultimateGoal || 'Phát triển toàn diện'}

### Focus cho giai đoạn này:
${phase.focus || 'Xây dựng nền tảng vững chắc'}

### Môn học liên quan trong roadmap:
${relevantFocus.join(', ') || 'Theo chương trình chuẩn'}

${sourceContext ? `
## CHƯƠNG TRÌNH THAM KHẢO
${sourceContext}
` : ''}

${customPrompt ? `
## YÊU CẦU BỔ SUNG
${customPrompt}
` : ''}

## YÊU CẦU OUTPUT
Tạo giáo trình với cấu trúc JSON sau:

{
  "title": "Tên giáo trình",
  "description": "Mô tả ngắn",
  "totalWeeks": number,
  "totalLessons": number,
  "objectives": ["Mục tiêu 1", "Mục tiêu 2", ...],
  "units": [
    {
      "id": "unit_1",
      "title": "Tên chương/unit",
      "duration": "2 tuần",
      "objectives": ["Mục tiêu unit"],
      "lessons": [
        {
          "id": "lesson_1_1",
          "title": "Tên bài học",
          "duration": 45,
          "type": "concept|practice|review|assessment",
          "objectives": ["Mục tiêu bài học"],
          "content": "Nội dung chính cần dạy",
          "materials": ["Tài liệu cần thiết"],
          "teachingScript": "Hướng dẫn giảng dạy ngắn gọn cho AI Tutor",
          "exercises": [
            {
              "type": "practice|quiz|homework",
              "description": "Mô tả bài tập",
              "difficulty": "easy|medium|hard"
            }
          ],
          "assessmentQuestions": [
            {
              "question": "Câu hỏi kiểm tra",
              "type": "multiple_choice|short_answer|problem_solving",
              "answer": "Đáp án hoặc gợi ý"
            }
          ],
          "assessmentCriteria": "Tiêu chí đánh giá đạt/không đạt"
        }
      ]
    }
  ],
  "weeklyPlan": [
    {
      "week": 1,
      "lessonIds": ["lesson_1_1", "lesson_1_2"],
      "focus": "Trọng tâm tuần này"
    }
  ],
  "assessmentPlan": {
    "formative": ["Đánh giá thường xuyên"],
    "summative": ["Đánh giá cuối kỳ"]
  }
}

Lưu ý:
- Tạo đủ lessons cho cả học kỳ (khoảng 15-18 tuần)
- Mỗi unit có 3-6 lessons
- teachingScript phải đủ chi tiết để AI Tutor có thể dạy
- exercises đa dạng về hình thức và độ khó
- assessmentQuestions cover đủ mục tiêu bài học

Chỉ trả về JSON, không giải thích thêm.
`;
}

function buildLessonDetailPrompt(options) {
  const { curriculum, unit, lesson, sources } = options;

  return `
Bạn là gia sư chuyên môn, hãy tạo NỘI DUNG CHI TIẾT cho bài học:

## CONTEXT
- Giáo trình: ${curriculum.title}
- Chương: ${unit.title}
- Bài: ${lesson.title}
- Thời lượng: ${lesson.duration} phút
- Loại bài: ${lesson.type}

## MỤC TIÊU BÀI HỌC
${lesson.objectives?.join('\n') || 'Theo nội dung'}

## NỘI DUNG HIỆN TẠI
${lesson.content || 'Chưa có'}

## YÊU CẦU OUTPUT
Tạo nội dung chi tiết với JSON sau:

{
  "teachingScript": {
    "opening": {
      "duration": 5,
      "activities": ["Hoạt động khởi động"],
      "script": "Script cho AI Tutor nói"
    },
    "main": {
      "duration": 30,
      "sections": [
        {
          "title": "Phần 1",
          "content": "Nội dung giảng",
          "examples": ["Ví dụ minh họa"],
          "checkQuestions": ["Câu hỏi kiểm tra hiểu"],
          "script": "Script chi tiết"
        }
      ]
    },
    "practice": {
      "duration": 8,
      "exercises": [
        {
          "instruction": "Hướng dẫn",
          "problems": ["Bài 1", "Bài 2"],
          "hints": ["Gợi ý nếu học sinh stuck"]
        }
      ]
    },
    "closing": {
      "duration": 2,
      "summary": ["Điểm chính cần nhớ"],
      "preview": "Giới thiệu bài sau"
    }
  },
  "interactiveElements": [
    {
      "type": "question|exercise|game|discussion",
      "trigger": "Khi nào hiển thị",
      "content": "Nội dung",
      "expectedResponse": "Câu trả lời mong đợi"
    }
  ],
  "adaptiveHints": {
    "ifStruggling": ["Gợi ý nếu khó hiểu"],
    "ifAdvanced": ["Thử thách thêm nếu giỏi"]
  },
  "vocabulary": [
    {
      "term": "Thuật ngữ",
      "definition": "Định nghĩa",
      "example": "Ví dụ"
    }
  ],
  "homework": {
    "required": ["Bài bắt buộc"],
    "optional": ["Bài nâng cao (tùy chọn)"]
  }
}

Chỉ trả về JSON.
`;
}

// ============================================
// HELPERS
// ============================================

function buildSourceContext(sources, subject, grade) {
  if (!sources || sources.length === 0) return '';

  const parts = [];
  const level = grade <= 5 ? 'elementary' : grade <= 9 ? 'middle' : 'high';

  for (const source of sources) {
    const levelData = source[level] || source.primary || source.secondary1;
    if (!levelData) continue;

    const subjectData = levelData.subjects?.[subject];
    if (subjectData) {
      parts.push(`### ${source._metadata?.name || 'Source'}:`);
      parts.push(`- Tên môn: ${subjectData.name}`);

      if (subjectData.outline) {
        const gradeOutline = subjectData.outline[grade] || subjectData.outline[`${grade}`];
        if (gradeOutline) {
          parts.push(`- Nội dung lớp ${grade}: ${JSON.stringify(gradeOutline)}`);
        }
      }

      if (subjectData.weeklyHours) {
        parts.push(`- Số tiết/tuần: ${subjectData.weeklyHours}`);
      }
    }
  }

  return parts.join('\n');
}

function parseAIResponse(text) {
  if (!text) return null;

  try {
    // Try to extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return null;
  } catch (error) {
    console.error('JSON parse error:', error);
    return null;
  }
}

function getSubjectName(subjectId) {
  const names = {
    math: 'Toán',
    vietnamese: 'Tiếng Việt',
    literature: 'Ngữ văn',
    english: 'Tiếng Anh',
    physics: 'Vật lý',
    chemistry: 'Hóa học',
    biology: 'Sinh học',
    history: 'Lịch sử',
    geography: 'Địa lý',
    science: 'Khoa học',
    informatics: 'Tin học'
  };
  return names[subjectId] || subjectId;
}

export default {
  generateCurriculum,
  generateLessonDetail
};
