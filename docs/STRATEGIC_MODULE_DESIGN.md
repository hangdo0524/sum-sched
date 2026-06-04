# Module Định Hướng Chiến Lược - Thiết Kế Chi Tiết

## 1. Flow Tổng Quan

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        STRATEGIC PLANNING FLOW                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐                   │
│  │   STEP 1     │    │   STEP 2     │    │   STEP 3     │                   │
│  │   Thu thập   │───▶│   AI Phân    │───▶│   Trao đổi   │                   │
│  │   Thông tin  │    │   tích & Đề  │    │   & Tinh     │                   │
│  │              │    │   xuất       │    │   chỉnh      │                   │
│  └──────────────┘    └──────────────┘    └──────────────┘                   │
│         │                   │                   │                            │
│         ▼                   ▼                   ▼                            │
│  ┌──────────────────────────────────────────────────────┐                   │
│  │                      STEP 4                          │                   │
│  │              Tạo Lộ Trình 12 Năm                     │                   │
│  └──────────────────────────────────────────────────────┘                   │
│                            │                                                 │
│         ┌─────────────────┼─────────────────┐                               │
│         ▼                 ▼                 ▼                               │
│  ┌────────────┐    ┌────────────┐    ┌────────────┐                        │
│  │  Tiểu học  │    │   THCS     │    │   THPT     │                        │
│  │  (5 năm)   │    │  (4 năm)   │    │  (3 năm)   │                        │
│  └────────────┘    └────────────┘    └────────────┘                        │
│         │                 │                 │                               │
│         ▼                 ▼                 ▼                               │
│  ┌──────────────────────────────────────────────────────┐                   │
│  │                   STEP 5                              │                   │
│  │     Tạo Calendar Types & Schedules                    │                   │
│  │  (Năm → Kỳ → Tháng → Tuần → Ngày)                    │                   │
│  └──────────────────────────────────────────────────────┘                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 2. Step 1: Thu Thập Thông Tin (Input Form)

### 2.1. Thông Tin Học Sinh
```javascript
StudentContext = {
  // Cơ bản
  name: string,
  birthDate: date,
  currentGrade: number,        // Lớp mấy
  school: string,
  
  // Năng lực hiện tại
  currentAbilities: {
    academics: {
      math: { level: 1-10, notes: string },
      vietnamese: { level: 1-10, notes: string },
      english: { level: 1-10, notes: string },
      science: { level: 1-10, notes: string },
      // ...other subjects
    },
    skills: {
      problemSolving: 1-10,
      creativity: 1-10,
      communication: 1-10,
      teamwork: 1-10,
      selfStudy: 1-10,
      timeManagement: 1-10
    },
    talents: string[],         // Năng khiếu đặc biệt
    achievements: string[],    // Thành tích đã đạt
    challenges: string[]       // Khó khăn gặp phải
  },
  
  // Tính cách & Sở thích
  personality: {
    learningStyle: 'visual' | 'auditory' | 'kinesthetic' | 'mixed',
    motivation: 'intrinsic' | 'extrinsic' | 'mixed',
    interests: string[],
    hobbies: string[]
  }
}
```

### 2.2. Mong Muốn Gia Đình
```javascript
FamilyAspirations = {
  // Mục tiêu học tập
  academicGoals: {
    targetHighSchool: string,     // Trường THPT mục tiêu
    targetUniversity: string,     // Trường ĐH mục tiêu
    targetMajor: string,          // Ngành học mục tiêu
    targetCareer: string          // Nghề nghiệp mong muốn
  },
  
  // Định hướng phát triển
  developmentFocus: {
    academicPriority: 'balanced' | 'specialized' | 'olympiad',
    extracurricular: string[],    // Hoạt động ngoại khóa
    softSkills: string[],         // Kỹ năng mềm ưu tiên
    values: string[]              // Giá trị muốn rèn luyện
  },
  
  // Tài nguyên & Điều kiện
  resources: {
    studyTimePerDay: number,      // Giờ học/ngày
    budget: 'limited' | 'moderate' | 'flexible',
    parentInvolvement: 'high' | 'medium' | 'low',
    tutoringAvailable: boolean,
    onlineResourcesAccess: boolean
  },
  
  // Constraints
  constraints: {
    healthIssues: string[],
    familyCommitments: string[],
    otherResponsibilities: string[]
  }
}
```

### 2.3. Bối Cảnh
```javascript
Context = {
  // Bối cảnh giáo dục
  educationSystem: 'vietnam_public' | 'vietnam_private' | 'international',
  location: string,               // Tỉnh/thành phố
  competitionLevel: 'high' | 'medium' | 'low',
  
  // Thị trường lao động (AI sẽ bổ sung)
  careerTrends: [],
  inDemandSkills: [],
  
  // Timeline
  yearsUntilHighSchool: number,
  yearsUntilUniversity: number
}
```

## 3. Step 2: AI Analysis & Suggestion

### 3.1. AI Agents Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     AI ORCHESTRATOR                              │
│              (Điều phối các AI specialists)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │  EDUCATION AI   │  │   CAREER AI     │  │  PSYCHOLOGY AI  │  │
│  │  (Gemini Pro)   │  │  (Claude/GPT)   │  │  (Specialized)  │  │
│  ├─────────────────┤  ├─────────────────┤  ├─────────────────┤  │
│  │ • Curriculum    │  │ • Job market    │  │ • Learning      │  │
│  │ • School info   │  │ • Skills demand │  │   psychology    │  │
│  │ • Exam patterns │  │ • Career paths  │  │ • Motivation    │  │
│  │ • Competition   │  │ • Future trends │  │ • Development   │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
│           │                   │                   │              │
│           └───────────────────┼───────────────────┘              │
│                               ▼                                  │
│                    ┌─────────────────┐                          │
│                    │   SYNTHESIZER   │                          │
│                    │   (Main Agent)  │                          │
│                    └─────────────────┘                          │
│                               │                                  │
│                               ▼                                  │
│                    ┌─────────────────┐                          │
│                    │  RECOMMENDATION │                          │
│                    │     ENGINE      │                          │
│                    └─────────────────┘                          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2. AI Prompts (System)

**Education AI Prompt:**
```
Bạn là chuyên gia giáo dục Việt Nam với 20 năm kinh nghiệm. 
Nhiệm vụ: Phân tích năng lực học sinh và đề xuất định hướng.

Dựa trên:
- Thông tin học sinh: {studentContext}
- Mong muốn gia đình: {familyAspirations}
- Bối cảnh: {context}

Hãy phân tích và trả lời:
1. Đánh giá năng lực hiện tại (điểm mạnh, điểm cần cải thiện)
2. Độ phù hợp giữa mục tiêu và năng lực
3. Các lộ trình khả thi (2-3 options)
4. Rủi ro và cách giảm thiểu
5. Các cột mốc quan trọng cần đạt được

Format output: JSON structured
```

**Career AI Prompt:**
```
Bạn là chuyên gia tư vấn hướng nghiệp, am hiểu thị trường lao động 
và xu hướng nghề nghiệp toàn cầu.

Dựa trên mục tiêu nghề nghiệp: {targetCareer}
Và năng lực học sinh: {currentAbilities}

Hãy phân tích:
1. Yêu cầu của nghề nghiệp này (kỹ năng, bằng cấp, kinh nghiệm)
2. Con đường học tập phù hợp
3. Các kỹ năng cần phát triển từ bây giờ
4. Xu hướng nghề nghiệp trong 10-15 năm tới
5. Các nghề nghiệp thay thế nếu mục tiêu thay đổi

Format output: JSON structured
```

### 3.3. Recommendation Output

```javascript
AIRecommendation = {
  // Đánh giá tổng quan
  assessment: {
    currentLevel: 'above_average' | 'average' | 'below_average',
    goalFeasibility: 'highly_achievable' | 'achievable' | 'challenging' | 'very_challenging',
    keyStrengths: string[],
    areasToImprove: string[],
    risks: string[]
  },
  
  // Đề xuất định hướng (2-3 options)
  pathOptions: [{
    id: string,
    name: string,
    description: string,
    targetOutcome: string,
    suitabilityScore: number,  // 0-100
    pros: string[],
    cons: string[],
    requirements: string[],
    timeline: string
  }],
  
  // Đề xuất chi tiết cho option được chọn
  detailedPlan: {
    milestones: [{
      grade: number,
      year: string,
      academicFocus: string[],
      skillsFocus: string[],
      activities: string[],
      targets: string[]
    }],
    criticalDecisionPoints: [{
      grade: number,
      decision: string,
      options: string[],
      deadline: string
    }]
  },
  
  // Gợi ý thảo luận
  discussionTopics: string[],
  questionsForFamily: string[]
}
```

## 4. Step 3: Interactive Discussion

### 4.1. Conversation Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                   CHAT INTERFACE                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  AI: Dựa trên thông tin đã cung cấp, tôi đề xuất 3 lộ trình:    │
│                                                                  │
│  🎯 Option A: Chuyên Toán - THPT Chuyên                         │
│     Phù hợp 85% | Yêu cầu: Tăng cường Toán từ lớp 4            │
│                                                                  │
│  🎯 Option B: Song ngữ - Trường Quốc tế                         │
│     Phù hợp 75% | Yêu cầu: Tập trung tiếng Anh                 │
│                                                                  │
│  🎯 Option C: Cân bằng - THPT Top công lập                      │
│     Phù hợp 90% | Phù hợp nhất với năng lực hiện tại           │
│                                                                  │
│  Anh/chị muốn thảo luận sâu hơn về option nào?                  │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│  User: Tôi quan tâm Option A nhưng lo con áp lực...             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  AI: Tôi hiểu lo ngại của anh/chị. Về áp lực học chuyên:       │
│                                                                  │
│  📊 Phân tích:                                                   │
│  - Con có nền tảng Toán tốt (8/10), đây là lợi thế              │
│  - Tuy nhiên cần chuẩn bị tâm lý từ lớp 4-5                     │
│                                                                  │
│  💡 Đề xuất:                                                     │
│  1. Giai đoạn 1 (lớp 4-5): Làm quen dần, không ép buộc         │
│  2. Giai đoạn 2 (lớp 6-7): Đánh giá lại, quyết định chính thức │
│  3. Luôn có Plan B nếu con không phù hợp                        │
│                                                                  │
│  Anh/chị muốn tôi chi tiết hóa giai đoạn 1 không?               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2. Discussion Topics Generator

```javascript
DiscussionTopics = {
  goalClarity: [
    "Mục tiêu này của gia đình hay của con?",
    "Con đã biết về mục tiêu này chưa?",
    "Nếu con muốn thay đổi, gia đình phản ứng thế nào?"
  ],
  
  feasibility: [
    "Thời gian học mỗi ngày có thực tế không?",
    "Nguồn lực tài chính có đủ không?",
    "Ai sẽ hỗ trợ con học?"
  ],
  
  riskMitigation: [
    "Nếu con không đạt mục tiêu thì sao?",
    "Plan B là gì?",
    "Làm thế nào để con không bị áp lực?"
  ],
  
  implementation: [
    "Khi nào bắt đầu?",
    "Ai theo dõi tiến độ?",
    "Tần suất review như thế nào?"
  ]
}
```

## 5. Step 4: Generate 12-Year Roadmap

### 5.1. Roadmap Structure

```javascript
TwelveYearRoadmap = {
  id: string,
  studentId: string,
  createdAt: date,
  version: number,
  
  // Meta
  selectedPath: string,       // ID của option được chọn
  ultimateGoal: string,
  
  // Chia theo cấp học
  phases: {
    elementary: {             // Tiểu học (còn lại)
      grades: [1, 2, 3, 4, 5],
      focus: string,
      keyMilestones: string[],
      yearlyPlans: YearPlan[]
    },
    middleSchool: {           // THCS
      grades: [6, 7, 8, 9],
      focus: string,
      keyMilestones: string[],
      yearlyPlans: YearPlan[]
    },
    highSchool: {             // THPT
      grades: [10, 11, 12],
      focus: string,
      keyMilestones: string[],
      yearlyPlans: YearPlan[]
    }
  },
  
  // Decision points
  criticalDecisions: [{
    grade: number,
    decision: string,
    deadline: date,
    options: string[],
    resolved: boolean,
    chosenOption: string
  }]
}
```

### 5.2. Year Plan Structure

```javascript
YearPlan = {
  grade: number,
  academicYear: string,       // "2024-2025"
  
  // Mục tiêu năm
  yearGoals: {
    academic: string[],
    skills: string[],
    activities: string[],
    character: string[]
  },
  
  // Chia theo học kỳ
  terms: [{
    term: 1 | 2,
    focus: string[],
    subjects: [{
      name: string,
      weeklyHours: number,
      targetGrade: string,
      priority: 'high' | 'medium' | 'low'
    }],
    activities: string[],
    assessments: [{
      type: string,
      targetScore: number,
      date: date
    }]
  }],
  
  // Events & Deadlines
  keyDates: [{
    date: date,
    event: string,
    importance: 'critical' | 'important' | 'normal'
  }]
}
```

## 6. Step 5: Generate Calendars & Schedules

### 6.1. Calendar Types

```javascript
CalendarTypes = {
  // Lịch năm học
  academic_year: {
    name: "Năm học 2024-2025",
    type: "academic_year",
    startDate: "2024-09-05",
    endDate: "2025-05-31",
    contains: ["term_1", "term_2"]
  },
  
  // Lịch học kỳ
  term: {
    name: "Học kỳ 1",
    type: "term",
    startDate: "2024-09-05",
    endDate: "2025-01-15",
    parent: "academic_year_2024",
    contains: ["month_09", "month_10", ...]
  },
  
  // Lịch tháng
  month: {
    name: "Tháng 9/2024",
    type: "month",
    startDate: "2024-09-01",
    endDate: "2024-09-30",
    parent: "term_1_2024",
    contains: ["week_1", "week_2", ...]
  },
  
  // Lịch tuần (đang làm)
  week: {
    name: "Tuần 1 tháng 9",
    type: "week",
    startDate: "2024-09-02",
    endDate: "2024-09-08",
    parent: "month_09_2024"
  },
  
  // Lịch đặc biệt
  summer: {
    name: "Lịch hè 2024",
    type: "summer",
    startDate: "2024-06-01",
    endDate: "2024-08-31"
  },
  
  exam_prep: {
    name: "Ôn thi cuối kỳ 1",
    type: "exam_prep",
    startDate: "2024-12-15",
    endDate: "2025-01-10"
  }
}
```

### 6.2. Auto-Generate Schedule from Roadmap

```
ROADMAP → YEAR PLAN → TERM PLAN → MONTHLY GOALS → WEEKLY SCHEDULE → DAILY SESSIONS

Example:
┌─────────────────────────────────────────────────────────────────┐
│ Roadmap: Chuyên Toán - THPT Chuyên                              │
│ ├── Năm: Lớp 4 (2024-2025)                                      │
│ │   ├── Mục tiêu: Xây dựng nền tảng Toán nâng cao               │
│ │   ├── HK1:                                                     │
│ │   │   ├── Toán: 6h/tuần (ưu tiên cao)                         │
│ │   │   ├── Tiếng Việt: 4h/tuần                                 │
│ │   │   ├── Tiếng Anh: 4h/tuần                                  │
│ │   │   └── ...                                                  │
│ │   └── HK2:                                                     │
│ │       └── ...                                                  │
│ └── ...                                                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Auto-Generated Weekly Schedule (Tuần 1 tháng 9):                │
│                                                                  │
│ Thứ 2: Toán (1.5h sáng) + Tiếng Việt (1.5h chiều)               │
│ Thứ 3: Tiếng Anh (1.5h sáng) + Toán MathX (1.5h chiều)          │
│ Thứ 4: Toán (1.5h sáng) + Khoa học (1h chiều)                   │
│ Thứ 5: Tiếng Việt (1.5h sáng) + Tiếng Anh (1.5h chiều)          │
│ Thứ 6: Toán (1.5h sáng) + Tự học (1.5h chiều)                   │
│ Thứ 7: Bơi (1h sáng) + Vẽ (1.5h chiều)                          │
│ CN: Nghỉ / Hoạt động gia đình                                   │
│                                                                  │
│ Tổng: Toán 6h | TV 3h | TA 3h | Khoa 1h | Bơi 1h | Vẽ 1.5h     │
└─────────────────────────────────────────────────────────────────┘
```

## 7. Tech Implementation

### 7.1. AI Integration Options

| AI Service | Tốt cho | Chi phí | Latency |
|------------|---------|---------|---------|
| **Gemini Pro** | Education, Vietnamese | Free tier có | Nhanh |
| **Claude 3** | Analysis, Planning | $$ | Trung bình |
| **GPT-4** | General, Career | $$$ | Chậm |
| **Groq (Llama)** | Quick responses | Free | Rất nhanh |

**Đề xuất:**
- **Primary**: Gemini Pro (miễn phí, hỗ trợ tiếng Việt tốt)
- **Backup**: Groq/Llama (nhanh, miễn phí)
- **Premium features**: Claude/GPT-4

### 7.2. Integration Architecture

```javascript
// AI Service Abstraction
class AIService {
  async analyze(context) {
    // Try primary (Gemini)
    try {
      return await this.gemini.analyze(context);
    } catch (e) {
      // Fallback to backup
      return await this.groq.analyze(context);
    }
  }
  
  async chat(message, history) {
    return await this.gemini.chat(message, history);
  }
  
  async generatePlan(roadmap) {
    return await this.gemini.generatePlan(roadmap);
  }
}

// API Routes
POST /api/strategy/analyze     → AI phân tích
POST /api/strategy/chat        → Trao đổi với AI
POST /api/strategy/generate    → Tạo lộ trình
POST /api/strategy/schedule    → Tạo lịch từ lộ trình
```

### 7.3. Database Updates

```sql
-- New tables
CREATE TABLE roadmaps (
  id UUID PRIMARY KEY,
  student_id UUID REFERENCES students(id),
  selected_path TEXT,
  ultimate_goal TEXT,
  phases JSONB,
  critical_decisions JSONB,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE year_plans (
  id UUID PRIMARY KEY,
  roadmap_id UUID REFERENCES roadmaps(id),
  grade INT,
  academic_year TEXT,
  year_goals JSONB,
  terms JSONB,
  key_dates JSONB
);

CREATE TABLE strategy_conversations (
  id UUID PRIMARY KEY,
  student_id UUID REFERENCES students(id),
  messages JSONB,
  ai_recommendations JSONB,
  created_at TIMESTAMP
);
```

## 8. UI/UX Design

### 8.1. Strategic Planning Wizard

```
┌─────────────────────────────────────────────────────────────────┐
│  🎯 Định Hướng Chiến Lược                              [1/5]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Bước 1: Thông tin học sinh                                     │
│  ════════════════════════════                                    │
│                                                                  │
│  Họ tên: [________________]                                      │
│                                                                  │
│  Ngày sinh: [__/__/____]     Lớp hiện tại: [▼ Lớp 3]           │
│                                                                  │
│  Trường: [________________]                                      │
│                                                                  │
│  ─────────────────────────────────────────────────              │
│                                                                  │
│  Năng lực học tập:                                               │
│                                                                  │
│  Toán      ○○○○○○○●○○  7/10   [Ghi chú: ________]              │
│  Tiếng Việt ○○○○○○●○○○  6/10   [Ghi chú: ________]              │
│  Tiếng Anh  ○○○○●○○○○○  4/10   [Ghi chú: ________]              │
│                                                                  │
│                                                                  │
│                               [◀ Quay lại]  [Tiếp theo ▶]       │
└─────────────────────────────────────────────────────────────────┘
```

### 8.2. AI Conversation Interface

```
┌─────────────────────────────────────────────────────────────────┐
│  🤖 Tư vấn định hướng                                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 🤖 AI Advisor                                            │    │
│  │                                                          │    │
│  │ Dựa trên thông tin đã cung cấp, tôi thấy bé có nền      │    │
│  │ tảng Toán tốt (7/10) và tiềm năng phát triển.           │    │
│  │                                                          │    │
│  │ Tôi đề xuất 3 hướng đi:                                  │    │
│  │                                                          │    │
│  │ 🎯 A: Chuyên Toán (85% phù hợp)                         │    │
│  │ 🎯 B: Song ngữ (70% phù hợp)                            │    │
│  │ 🎯 C: Cân bằng (90% phù hợp)                            │    │
│  │                                                          │    │
│  │ Anh/chị muốn tìm hiểu thêm về hướng nào?                │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 👤 Bạn                                                   │    │
│  │                                                          │    │
│  │ Tôi muốn tìm hiểu thêm về hướng A - Chuyên Toán.        │    │
│  │ Con gái tôi thích Toán nhưng tôi lo ngại áp lực...      │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 🤖 AI Advisor                                            │    │
│  │                                                          │    │
│  │ Tôi hiểu lo ngại của anh/chị. Để giảm áp lực, tôi đề   │    │
│  │ xuất chia thành 2 giai đoạn:                            │    │
│  │                                                          │    │
│  │ 📌 Giai đoạn 1 (Lớp 3-5): Khám phá                      │    │
│  │ • Làm quen Toán nâng cao qua trò chơi                   │    │
│  │ • Không áp lực điểm số                                   │    │
│  │ • Đánh giá phản ứng của con                             │    │
│  │                                                          │    │
│  │ 📌 Giai đoạn 2 (Lớp 6-7): Quyết định                    │    │
│  │ • Nếu con vẫn yêu thích → đẩy mạnh                      │    │
│  │ • Nếu không → chuyển hướng C (cân bằng)                 │    │
│  │                                                          │    │
│  │ Anh/chị thấy cách tiếp cận này phù hợp không?           │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Nhập tin nhắn...                              [Gửi ➤]   │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  [💾 Lưu bản nháp]  [📋 Tạo lộ trình]  [🔄 Bắt đầu lại]        │
└─────────────────────────────────────────────────────────────────┘
```

## 9. Implementation Phases

### Phase 1: Foundation (2 tuần)
- [ ] Student Profile form
- [ ] Family Aspirations form
- [ ] Basic data storage

### Phase 2: AI Integration (2 tuần)
- [ ] Gemini API integration
- [ ] Analysis prompt engineering
- [ ] Chat interface

### Phase 3: Roadmap Generator (2 tuần)
- [ ] 12-year roadmap structure
- [ ] Year plan breakdown
- [ ] Visualization

### Phase 4: Calendar Integration (1 tuần)
- [ ] Connect roadmap to existing calendar
- [ ] Auto-generate term/month plans
- [ ] Schedule optimization

### Phase 5: Review & Feedback Loop (1 tuần)
- [ ] Annual review workflow
- [ ] Roadmap adjustment
- [ ] Progress tracking

---

*Tài liệu này định nghĩa module Định Hướng Chiến Lược.*
*Review và confirm trước khi triển khai.*
