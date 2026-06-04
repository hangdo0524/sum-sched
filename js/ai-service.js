/**
 * AI Service - Gemini Integration
 * Handles AI-powered features: motivation, analysis, suggestions
 */

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

// Get API key from localStorage or environment
function getApiKey() {
  return localStorage.getItem('sumSched_geminiApiKey') || '';
}

export function setApiKey(key) {
  localStorage.setItem('sumSched_geminiApiKey', key);
}

export function hasApiKey() {
  return !!getApiKey();
}

/**
 * Call Gemini API
 */
async function callGemini(prompt, options = {}) {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn('Gemini API key not set');
    return null;
  }

  try {
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: options.temperature || 0.7,
          maxOutputTokens: options.maxTokens || 500,
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch (error) {
    console.error('Gemini API error:', error);
    return null;
  }
}

/**
 * Generate personalized greeting based on context
 */
export async function generateGreeting(context) {
  const { studentName, age, timeOfDay, streak, recentProgress } = context;

  const prompt = `
Bạn là trợ lý học tập thân thiện cho trẻ em Việt Nam.
Hãy tạo một lời chào cá nhân hóa ngắn gọn (1-2 câu) cho học sinh.

Thông tin:
- Tên: ${studentName}
- Tuổi: ${age} tuổi
- Thời điểm: ${timeOfDay}
- Chuỗi ngày học liên tục: ${streak} ngày
- Tiến độ gần đây: ${recentProgress}

Yêu cầu:
- Thân thiện, ấm áp
- Phù hợp lứa tuổi ${age}
- Có emoji phù hợp
- Khích lệ nhẹ nhàng
- Chỉ trả lời lời chào, không giải thích

Ví dụ output: "🌟 Chào buổi sáng Anna! 5 ngày kiên trì rồi đó, con thật tuyệt vời!"
`;

  const result = await callGemini(prompt, { temperature: 0.8, maxTokens: 100 });
  return result || getDefaultGreeting(context);
}

/**
 * Generate motivational quote based on context
 */
export async function generateQuote(context) {
  const { age, mood, recentPerformance, subjectFocus } = context;

  const prompt = `
Bạn là chuyên gia tâm lý giáo dục, am hiểu miên thích liệu pháp (hypnotherapy).
Hãy tạo một câu châm ngôn/lời khích lệ phù hợp với học sinh.

Thông tin:
- Tuổi: ${age} tuổi
- Tâm trạng hiện tại: ${mood}
- Kết quả gần đây: ${recentPerformance}
- Môn đang học: ${subjectFocus}

Yêu cầu:
- Áp dụng nguyên tắc tâm lý học tích cực
- Ngôn ngữ phù hợp độ tuổi ${age}
- Có tác dụng "neo" cảm xúc tích cực
- Hướng về tương lai (future pacing)
- Ngắn gọn, dễ nhớ (1-2 câu)
- Bắt đầu bằng emoji phù hợp

Phong cách theo độ tuổi:
- 6-8: Vui vẻ, hình ảnh, so sánh với siêu anh hùng
- 9-11: Khích lệ, thử thách, "con làm được"
- 12-15: Tôn trọng, mục tiêu, "bạn đang trưởng thành"
- 16-18: Trưởng thành, định hướng tương lai

Chỉ trả lời câu châm ngôn, không giải thích.
`;

  const result = await callGemini(prompt, { temperature: 0.9, maxTokens: 150 });
  return result || getDefaultQuote(context);
}

/**
 * Generate encouragement after completing a session
 */
export async function generateEncouragement(context) {
  const { studentName, age, subject, performance, effortLevel } = context;

  const prompt = `
Bạn là coach học tập sử dụng tâm lý học tích cực và miên thích liệu pháp.
Hãy tạo lời khen/khích lệ sau khi học sinh hoàn thành buổi học.

Thông tin:
- Tên: ${studentName}
- Tuổi: ${age} tuổi
- Môn vừa học: ${subject}
- Mức độ hoàn thành: ${performance}
- Mức độ cố gắng: ${effortLevel}

Yêu cầu:
- Khen cụ thể về nỗ lực, không chỉ kết quả
- Sử dụng kỹ thuật "reframing" nếu kết quả chưa tốt
- Gợi ý nhẹ nhàng cho lần sau
- Ngắn gọn (2-3 câu)
- Có emoji

Chỉ trả lời lời khích lệ, không giải thích.
`;

  const result = await callGemini(prompt, { temperature: 0.8, maxTokens: 150 });
  return result || getDefaultEncouragement(context);
}

/**
 * Analyze learning progress and give suggestions
 */
export async function analyzeProgress(context) {
  const { studentName, age, weeklyStats, monthlyTrend, strengths, weaknesses } = context;

  const prompt = `
Bạn là chuyên gia giáo dục phân tích tiến độ học tập.

Thông tin học sinh:
- Tên: ${studentName}, ${age} tuổi
- Thống kê tuần: ${JSON.stringify(weeklyStats)}
- Xu hướng tháng: ${monthlyTrend}
- Điểm mạnh: ${strengths.join(', ')}
- Cần cải thiện: ${weaknesses.join(', ')}

Hãy phân tích và đưa ra:
1. Đánh giá ngắn gọn (2 câu)
2. 2 điểm khen
3. 1 gợi ý cải thiện (xây dựng, không chỉ trích)

Format JSON:
{
  "summary": "...",
  "praises": ["...", "..."],
  "suggestion": "..."
}
`;

  const result = await callGemini(prompt, { temperature: 0.6, maxTokens: 300 });

  try {
    // Try to parse JSON from response
    const jsonMatch = result?.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.warn('Failed to parse AI response as JSON');
  }

  return getDefaultAnalysis(context);
}

// Default fallbacks when API is unavailable
function getDefaultGreeting(context) {
  const { studentName, timeOfDay, streak } = context;
  const greetings = {
    morning: `🌅 Chào buổi sáng ${studentName}! Sẵn sàng cho ngày học mới chưa?`,
    afternoon: `☀️ Chào ${studentName}! Buổi chiều năng động nhé!`,
    evening: `🌙 Chào ${studentName}! Cùng ôn bài buổi tối nào!`
  };

  let greeting = greetings[timeOfDay] || greetings.morning;
  if (streak >= 3) {
    greeting += ` 🔥 ${streak} ngày liên tục!`;
  }
  return greeting;
}

function getDefaultQuote(context) {
  const quotes = [
    "🌟 Mỗi bước nhỏ hôm nay là nền tảng cho thành công ngày mai!",
    "💪 Kiên trì là siêu năng lực của người thành công!",
    "🚀 Con đang tiến bộ mỗi ngày, hãy tin vào bản thân!",
    "🌈 Khó khăn hôm nay là bài học quý giá cho tương lai!",
    "⭐ Không ai giỏi ngay từ đầu, quan trọng là không bỏ cuộc!",
    "🎯 Tập trung vào tiến bộ, không phải hoàn hảo!",
    "🌻 Học tập như trồng cây - kiên nhẫn sẽ thấy hoa nở!",
    "💡 Mỗi câu hỏi là cơ hội để thông minh hơn!"
  ];
  return quotes[Math.floor(Math.random() * quotes.length)];
}

function getDefaultEncouragement(context) {
  const { subject, performance } = context;
  if (performance === 'good') {
    return `🎉 Tuyệt vời! ${subject} hôm nay con làm rất tốt! Tiếp tục phát huy nhé!`;
  } else if (performance === 'average') {
    return `👍 Cố gắng tốt rồi! ${subject} cần thêm thời gian, và con đang đi đúng hướng!`;
  } else {
    return `💪 Bài khó nhưng con không bỏ cuộc - đó là tinh thần tuyệt vời! Ngày mai sẽ tốt hơn!`;
  }
}

function getDefaultAnalysis(context) {
  return {
    summary: "Con đang học tập đều đặn. Tiếp tục duy trì nhé!",
    praises: ["Kiên trì học mỗi ngày", "Hoàn thành đúng tiến độ"],
    suggestion: "Thử thêm 15 phút ôn bài trước khi ngủ sẽ nhớ lâu hơn!"
  };
}

// Utility function to determine time of day
export function getTimeOfDay() {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

// Calculate age from birthdate
export function calculateAge(birthDate) {
  if (!birthDate) return 10; // default
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

export default {
  setApiKey,
  hasApiKey,
  generateGreeting,
  generateQuote,
  generateEncouragement,
  analyzeProgress,
  getTimeOfDay,
  calculateAge
};
