# Module Quản Lý Lịch Học Thuật (Academic Calendar Management)

## 1. Tổng Quan

Module này là **lớp trung gian** kết nối:
- **Trên**: Strategic Roadmap (lộ trình 12 năm)
- **Dưới**: Weekly Schedule (lịch tuần)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        ACADEMIC CALENDAR HIERARCHY                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐                                                           │
│  │  CẤP HỌC     │  Tiểu học (1-5) | THCS (6-9) | THPT (10-12)              │
│  │  (Level)     │  → Định nghĩa phạm vi lớp, đặc thù từng cấp              │
│  └──────┬───────┘                                                           │
│         │                                                                    │
│         ▼                                                                    │
│  ┌──────────────┐                                                           │
│  │  NĂM HỌC     │  2024-2025, 2025-2026, ...                               │
│  │  (Year)      │  → Ngày bắt đầu/kết thúc, danh sách nghỉ lễ              │
│  └──────┬───────┘                                                           │
│         │                                                                    │
│         ▼                                                                    │
│  ┌──────────────┐                                                           │
│  │  KỲ HỌC      │  HK1 | HK2 | Hè                                          │
│  │  (Term)      │  → Tuần học, tuần ôn thi, tuần thi, tuần nghỉ            │
│  └──────┬───────┘                                                           │
│         │                                                                    │
│         ▼                                                                    │
│  ┌──────────────┐                                                           │
│  │  TUẦN HỌC    │  Tuần 1, Tuần 2, ... Tuần 18                             │
│  │  (Week)      │  → Loại tuần (học/ôn/thi/nghỉ), mục tiêu tuần            │
│  └──────┬───────┘                                                           │
│         │                                                                    │
│         ▼                                                                    │
│  ┌──────────────┐                                                           │
│  │  LỊCH TUẦN   │  Sessions theo ngày                                       │
│  │  (Schedule)  │  → Ca học cụ thể (đã implement)                          │
│  └──────────────┘                                                           │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 2. Data Models

### 2.1. Academic Level (Cấp học)

```javascript
AcademicLevel = {
  id: string,                    // "elementary", "middle", "high"
  name: string,                  // "Tiểu học", "THCS", "THPT"
  gradeRange: {
    from: number,                // 1, 6, 10
    to: number                   // 5, 9, 12
  },
  
  // Cấu hình mặc định cho cấp học này
  defaults: {
    maxStudyHoursPerDay: number, // 4, 5, 6
    sessionDuration: number,     // 45, 60, 90 phút
    breakBetweenSessions: number,// 15, 15, 10 phút
    recommendedSubjectsPerDay: number, // 3, 4, 5
    
    // Tỷ lệ phân bổ thời gian
    timeAllocation: {
      academic: number,          // 60%, 70%, 75%
      physical: number,          // 25%, 20%, 15%
      creative: number,          // 10%, 7%, 7%
      free: number               // 5%, 3%, 3%
    }
  },
  
  // Các môn học bắt buộc/tự chọn
  subjects: {
    required: string[],          // ["Toán", "Tiếng Việt", "Tiếng Anh"]
    elective: string[]           // ["Tin học", "Mỹ thuật", "Âm nhạc"]
  }
}
```

### 2.2. Academic Year (Năm học)

```javascript
AcademicYear = {
  id: string,                    // "2024-2025"
  name: string,                  // "Năm học 2024-2025"
  studentId: string,             // Thuộc về học sinh nào
  
  // Thời gian
  startDate: date,               // "2024-09-05"
  endDate: date,                 // "2025-05-31"
  
  // Thông tin học sinh trong năm này
  studentGrade: number,          // Lớp mấy (3, 4, 5...)
  academicLevel: string,         // "elementary" | "middle" | "high"
  school: string,                // Tên trường
  
  // Cấu hình năm học
  config: {
    termsCount: number,          // 2 (HK1 + HK2) hoặc 3 (+ Hè)
    weeksPerTerm: number,        // 18-20 tuần/kỳ
    examWeeksPerTerm: number,    // 2-3 tuần thi/kỳ
  },
  
  // Ngày nghỉ lễ
  holidays: [{
    name: string,                // "Tết Nguyên Đán"
    startDate: date,
    endDate: date,
    type: "national" | "school" | "family"
  }],
  
  // Sự kiện quan trọng
  events: [{
    name: string,                // "Khai giảng", "Họp phụ huynh"
    date: date,
    type: "academic" | "exam" | "activity" | "meeting"
  }],
  
  // Trạng thái
  status: "planning" | "active" | "completed",
  createdAt: date,
  updatedAt: date
}
```

### 2.3. Term (Kỳ học)

```javascript
Term = {
  id: string,                    // "2024-2025-hk1"
  academicYearId: string,        // "2024-2025"
  studentId: string,
  
  // Thông tin kỳ
  name: string,                  // "Học kỳ 1"
  shortName: string,             // "HK1"
  type: "semester" | "summer",   // Kỳ chính hoặc kỳ hè
  order: number,                 // 1, 2, 3
  
  // Thời gian
  startDate: date,               // "2024-09-05"
  endDate: date,                 // "2025-01-15"
  totalWeeks: number,            // 19
  
  // Cấu trúc kỳ học
  structure: {
    learningWeeks: number,       // 15 tuần học
    reviewWeeks: number,         // 2 tuần ôn
    examWeeks: number,           // 2 tuần thi
  },
  
  // Mục tiêu kỳ học (từ Year Plan)
  goals: {
    academic: string[],          // ["Đạt 8.0 Toán", "Hoàn thành sách TA"]
    skills: string[],            // ["Tự học 30 phút/ngày"]
    activities: string[]         // ["Tham gia CLB Toán"]
  },
  
  // Môn học trong kỳ
  subjects: [{
    subjectId: string,
    name: string,
    weeklyHours: number,         // Số giờ/tuần
    priority: "high" | "medium" | "low",
    targetGrade: string,         // "8.0", "A"
    teacher: string              // Tên giáo viên/trung tâm
  }],
  
  // Các tuần trong kỳ (auto-generated)
  weeks: Week[],
  
  // Kỳ thi
  exams: [{
    name: string,                // "Giữa kỳ 1", "Cuối kỳ 1"
    type: "midterm" | "final",
    startDate: date,
    endDate: date,
    subjects: string[]           // Môn thi
  }],
  
  status: "planning" | "active" | "completed"
}
```

### 2.4. Week (Tuần học)

```javascript
Week = {
  id: string,                    // "2024-2025-hk1-w01"
  termId: string,
  studentId: string,
  
  // Thông tin tuần
  weekNumber: number,            // 1, 2, 3...
  name: string,                  // "Tuần 1" hoặc "Tuần ôn thi 1"
  
  // Thời gian
  startDate: date,               // Thứ 2
  endDate: date,                 // Chủ nhật
  
  // Loại tuần
  type: "learning" | "review" | "exam" | "break",
  
  // Mục tiêu tuần (từ Term goals breakdown)
  goals: {
    focus: string,               // "Tập trung ôn Toán chương 3"
    tasks: [{
      subject: string,
      task: string,
      completed: boolean
    }]
  },
  
  // Điều chỉnh cho tuần này
  adjustments: {
    reason: string,              // "Nghỉ lễ 2/9"
    skipDates: date[],           // Ngày nghỉ trong tuần
    extraHours: {                // Bù giờ
      [subjectId]: number
    }
  },
  
  // Kết quả tuần (sau khi hoàn thành)
  result: {
    completionRate: number,      // 85%
    notes: string,
    highlights: string[],
    improvements: string[]
  }
}
```

## 3. UI Flows

### 3.1. Setup Wizard (Lần đầu)

```
┌─────────────────────────────────────────────────────────────────┐
│  📅 Thiết Lập Năm Học                                    [1/4]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Năm học: [▼ 2024-2025        ]                                 │
│                                                                  │
│  Con đang học lớp: [▼ Lớp 4   ]  → Cấp: Tiểu học               │
│                                                                  │
│  Trường: [Tiểu học Nguyễn Du_______________________]            │
│                                                                  │
│  ─────────────────────────────────────────────────              │
│                                                                  │
│  📆 Thời gian năm học:                                          │
│                                                                  │
│  Ngày khai giảng:  [05/09/2024]                                 │
│  Ngày bế giảng:    [31/05/2025]                                 │
│                                                                  │
│  ─────────────────────────────────────────────────              │
│                                                                  │
│  📚 Số kỳ học:                                                   │
│                                                                  │
│  ○ 2 kỳ (HK1 + HK2)                                             │
│  ● 3 kỳ (HK1 + HK2 + Hè)                                        │
│                                                                  │
│                                                                  │
│                               [◀ Quay lại]  [Tiếp theo ▶]       │
└─────────────────────────────────────────────────────────────────┘
```

```
┌─────────────────────────────────────────────────────────────────┐
│  📅 Thiết Lập Học Kỳ 1                                   [2/4]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Học kỳ 1: Từ [05/09/2024] đến [15/01/2025]                    │
│                                                                  │
│  Tổng: 19 tuần                                                  │
│                                                                  │
│  ─────────────────────────────────────────────────              │
│                                                                  │
│  Cấu trúc kỳ học:                                               │
│                                                                  │
│  ┌──────────────────────────────────────────────────────┐       │
│  │ ████████████████████░░░░░░ │  15 tuần học            │       │
│  │ ░░░░░░░░░░░░░░░░░░██░░░░░░ │  2 tuần ôn thi          │       │
│  │ ░░░░░░░░░░░░░░░░░░░░██░░░░ │  2 tuần thi             │       │
│  └──────────────────────────────────────────────────────┘       │
│                                                                  │
│  Tuần học:    [15] tuần  ───●─────────── 10-18                  │
│  Tuần ôn:     [2 ] tuần  ─────●───────── 1-3                    │
│  Tuần thi:    [2 ] tuần  ─────●───────── 1-3                    │
│                                                                  │
│  ─────────────────────────────────────────────────              │
│                                                                  │
│  📝 Kỳ thi:                                                      │
│                                                                  │
│  ☑ Giữa kỳ 1:  [01/11/2024] - [08/11/2024]                     │
│  ☑ Cuối kỳ 1:  [06/01/2025] - [15/01/2025]                     │
│                                                                  │
│                               [◀ Quay lại]  [Tiếp theo ▶]       │
└─────────────────────────────────────────────────────────────────┘
```

```
┌─────────────────────────────────────────────────────────────────┐
│  📅 Ngày Nghỉ & Sự Kiện                                  [3/4]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  🎌 Ngày nghỉ lễ (tự động thêm):                                │
│                                                                  │
│  ☑ Quốc khánh 2/9        02/09/2024                             │
│  ☑ Tết Dương lịch        01/01/2025                             │
│  ☑ Tết Nguyên Đán        25/01 - 02/02/2025                     │
│  ☑ Giỗ Tổ Hùng Vương     07/04/2025                             │
│  ☑ 30/4 - 1/5            30/04 - 01/05/2025                     │
│                                                                  │
│  [+ Thêm ngày nghỉ khác]                                        │
│                                                                  │
│  ─────────────────────────────────────────────────              │
│                                                                  │
│  📌 Sự kiện quan trọng:                                         │
│                                                                  │
│  ☑ Khai giảng            05/09/2024                             │
│  ☑ Họp phụ huynh HK1     15/10/2024                             │
│  ☑ Họp phụ huynh HK2     15/03/2025                             │
│  ☑ Bế giảng              31/05/2025                             │
│                                                                  │
│  [+ Thêm sự kiện]                                               │
│                                                                  │
│                               [◀ Quay lại]  [Tiếp theo ▶]       │
└─────────────────────────────────────────────────────────────────┘
```

```
┌─────────────────────────────────────────────────────────────────┐
│  📅 Môn Học Trong Kỳ                                     [4/4]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Thêm môn học cho Học kỳ 1:                                     │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐     │
│  │ Môn          │ Giờ/tuần │ Ưu tiên  │ Mục tiêu │ Xóa   │     │
│  ├────────────────────────────────────────────────────────┤     │
│  │ Toán         │ [6]      │ [▼Cao  ] │ [8.5   ] │  🗑   │     │
│  │ Tiếng Việt   │ [4]      │ [▼TB   ] │ [8.0   ] │  🗑   │     │
│  │ Tiếng Anh    │ [4]      │ [▼Cao  ] │ [8.0   ] │  🗑   │     │
│  │ Khoa học     │ [2]      │ [▼TB   ] │ [8.0   ] │  🗑   │     │
│  │ Lịch sử-ĐL   │ [2]      │ [▼Thấp ] │ [7.5   ] │  🗑   │     │
│  └────────────────────────────────────────────────────────┘     │
│                                                                  │
│  [+ Thêm môn học]                                               │
│                                                                  │
│  ─────────────────────────────────────────────────              │
│                                                                  │
│  📊 Tổng kết:                                                    │
│  • Tổng giờ học/tuần: 18 giờ                                    │
│  • Số môn: 5 môn                                                │
│  • Ưu tiên cao: Toán, Tiếng Anh                                 │
│                                                                  │
│  ⚠️ Gợi ý: Tiểu học nên học tối đa 20 giờ/tuần                 │
│                                                                  │
│                               [◀ Quay lại]  [✅ Hoàn tất]       │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2. Calendar Overview (Sau khi setup)

```
┌─────────────────────────────────────────────────────────────────┐
│  📅 Năm Học 2024-2025                           [⚙️] [📤]      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  👧 Anna - Lớp 4 - Tiểu học Nguyễn Du                           │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                                                          │    │
│  │   T9    T10   T11   T12   T1    T2    T3    T4    T5    │    │
│  │  ┌────┬────┬────┬────┬────┬────┬────┬────┬────┐        │    │
│  │  │████│████│████│████│░░░░│████│████│████│████│        │    │
│  │  │HK1 │    │ GK │    │Tết │HK2 │    │ GK │    │        │    │
│  │  │    │    │    │ CK │    │    │    │    │ CK │        │    │
│  │  └────┴────┴────┴────┴────┴────┴────┴────┴────┘        │    │
│  │                                                          │    │
│  │  ████ Học   ░░░░ Nghỉ   GK Giữa kỳ   CK Cuối kỳ        │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ─────────────────────────────────────────────────              │
│                                                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   HỌC KỲ 1  │  │   HỌC KỲ 2  │  │    KỲ HÈ   │              │
│  ├─────────────┤  ├─────────────┤  ├─────────────┤              │
│  │ 05/09-15/01 │  │ 16/01-31/05 │  │ 01/06-31/08 │              │
│  │ 19 tuần     │  │ 19 tuần     │  │ 13 tuần     │              │
│  │             │  │             │  │             │              │
│  │ ●●●●●●○○○○○ │  │ ○○○○○○○○○○○ │  │ ○○○○○○○○○○○ │              │
│  │ Tuần 6/19   │  │ Chưa bắt đầu│  │ Chưa bắt đầu│              │
│  │             │  │             │  │             │              │
│  │ [Xem chi tiết]│ │ [Xem chi tiết]│ │ [Thiết lập] │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.3. Term Detail View

```
┌─────────────────────────────────────────────────────────────────┐
│  📚 Học Kỳ 1 - Chi Tiết                         [◀ Năm học]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ TUẦN │ NGÀY          │ LOẠI   │ GHI CHÚ      │ TRẠNG THÁI│   │
│  ├─────────────────────────────────────────────────────────┤    │
│  │  1   │ 02/09 - 08/09 │ 📚 Học │ Khai giảng   │ ✅ Xong   │   │
│  │  2   │ 09/09 - 15/09 │ 📚 Học │              │ ✅ Xong   │   │
│  │  3   │ 16/09 - 22/09 │ 📚 Học │              │ ✅ Xong   │   │
│  │  4   │ 23/09 - 29/09 │ 📚 Học │              │ ✅ Xong   │   │
│  │  5   │ 30/09 - 06/10 │ 📚 Học │              │ ✅ Xong   │   │
│  │  6   │ 07/10 - 13/10 │ 📚 Học │              │ 🔵 Hiện tại│   │
│  │  7   │ 14/10 - 20/10 │ 📚 Học │ Họp PH 15/10 │ ⚪ Sắp tới │   │
│  │  8   │ 21/10 - 27/10 │ 📚 Học │              │ ⚪ Sắp tới │   │
│  │  9   │ 28/10 - 03/11 │ 📝 Ôn  │ Ôn giữa kỳ   │ ⚪ Sắp tới │   │
│  │ 10   │ 04/11 - 10/11 │ 📋 Thi │ THI GIỮA KỲ  │ ⚪ Sắp tới │   │
│  │ ...  │ ...           │ ...    │ ...          │ ...       │   │
│  │ 18   │ 30/12 - 05/01 │ 📝 Ôn  │ Ôn cuối kỳ   │ ⚪ Sắp tới │   │
│  │ 19   │ 06/01 - 15/01 │ 📋 Thi │ THI CUỐI KỲ  │ ⚪ Sắp tới │   │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ─────────────────────────────────────────────────              │
│                                                                  │
│  📊 Thống kê HK1:                                               │
│                                                                  │
│  Hoàn thành: 5/19 tuần (26%)  ████████░░░░░░░░░░░░░░░░░░░░     │
│                                                                  │
│  Môn học:                                                       │
│  • Toán:       12/90 giờ  ██░░░░░░░░ 13%  Đúng tiến độ ✓       │
│  • Tiếng Anh:   8/60 giờ  ██░░░░░░░░ 13%  Đúng tiến độ ✓       │
│  • Tiếng Việt:  8/60 giờ  ██░░░░░░░░ 13%  Đúng tiến độ ✓       │
│                                                                  │
│  [📅 Xem lịch tuần hiện tại]  [⚙️ Chỉnh sửa kỳ]                │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 4. Auto-Generation Logic

### 4.1. Generate Weeks from Term

```javascript
function generateWeeksForTerm(term) {
  const weeks = [];
  let currentDate = new Date(term.startDate);
  let weekNumber = 1;
  
  // Phase 1: Learning weeks
  for (let i = 0; i < term.structure.learningWeeks; i++) {
    weeks.push(createWeek(term, weekNumber++, currentDate, 'learning'));
    currentDate = addDays(currentDate, 7);
  }
  
  // Phase 2: Review weeks
  for (let i = 0; i < term.structure.reviewWeeks; i++) {
    weeks.push(createWeek(term, weekNumber++, currentDate, 'review'));
    currentDate = addDays(currentDate, 7);
  }
  
  // Phase 3: Exam weeks
  for (let i = 0; i < term.structure.examWeeks; i++) {
    weeks.push(createWeek(term, weekNumber++, currentDate, 'exam'));
    currentDate = addDays(currentDate, 7);
  }
  
  // Mark holiday weeks
  weeks.forEach(week => {
    const holidays = getHolidaysInRange(term.academicYearId, week.startDate, week.endDate);
    if (holidays.length > 0) {
      week.adjustments.skipDates = holidays.map(h => h.date);
      week.adjustments.reason = holidays.map(h => h.name).join(', ');
    }
  });
  
  return weeks;
}

function createWeek(term, weekNumber, startDate, type) {
  const endDate = addDays(startDate, 6);
  
  return {
    id: `${term.id}-w${String(weekNumber).padStart(2, '0')}`,
    termId: term.id,
    studentId: term.studentId,
    weekNumber,
    name: getWeekName(weekNumber, type),
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
    type,
    goals: generateWeekGoals(term, weekNumber, type),
    adjustments: { skipDates: [], extraHours: {} },
    result: null
  };
}

function getWeekName(weekNumber, type) {
  switch (type) {
    case 'learning': return `Tuần ${weekNumber}`;
    case 'review': return `Tuần ôn thi ${weekNumber}`;
    case 'exam': return `Tuần thi ${weekNumber}`;
    case 'break': return `Tuần nghỉ`;
    default: return `Tuần ${weekNumber}`;
  }
}
```

### 4.2. Generate Weekly Schedule from Week

```javascript
function generateWeeklySchedule(week, term) {
  const schedule = [];
  const subjects = term.subjects;
  
  // Adjust hours based on week type
  const hourMultiplier = {
    'learning': 1.0,
    'review': 1.2,    // Tăng giờ ôn
    'exam': 0.3,      // Giảm giờ học, chỉ thi
    'break': 0
  };
  
  // Skip holiday dates
  const skipDates = new Set(week.adjustments.skipDates);
  
  // Get available days (Mon-Sat, excluding holidays)
  const availableDays = getWeekDays(week.startDate, week.endDate)
    .filter(day => !skipDates.has(day) && !isSunday(day));
  
  // Distribute subjects across days
  subjects.forEach(subject => {
    const adjustedHours = subject.weeklyHours * hourMultiplier[week.type];
    const sessionsNeeded = Math.ceil(adjustedHours / 1.5); // 1.5h per session
    
    // Prioritize based on subject priority
    const preferredSlots = getPreferredSlots(subject, week.type);
    
    for (let i = 0; i < sessionsNeeded; i++) {
      const day = availableDays[i % availableDays.length];
      const slot = preferredSlots[i % preferredSlots.length];
      
      schedule.push({
        date: day,
        subjectId: subject.subjectId,
        subjectName: subject.name,
        startTime: slot.start,
        endTime: slot.end,
        duration: 90,
        type: week.type === 'exam' ? 'exam' : 'regular'
      });
    }
  });
  
  return schedule;
}

function getPreferredSlots(subject, weekType) {
  // High priority subjects → morning slots
  // Review weeks → longer sessions
  // Exam weeks → exam time slots
  
  const morningSlots = [
    { start: '08:00', end: '09:30' },
    { start: '09:45', end: '11:15' }
  ];
  
  const afternoonSlots = [
    { start: '14:00', end: '15:30' },
    { start: '15:45', end: '17:15' }
  ];
  
  if (weekType === 'exam') {
    return [{ start: '07:30', end: '09:30' }]; // Exam morning
  }
  
  if (subject.priority === 'high') {
    return [...morningSlots, ...afternoonSlots];
  }
  
  return [...afternoonSlots, ...morningSlots];
}
```

## 5. Database Schema

```
┌─────────────────────┐
│   academic_years    │
├─────────────────────┤
│ id                  │
│ student_id          │──────┐
│ name                │      │
│ start_date          │      │
│ end_date            │      │
│ student_grade       │      │
│ academic_level      │      │
│ config (JSON)       │      │
│ holidays (JSON)     │      │
│ events (JSON)       │      │
│ status              │      │
│ created_at          │      │
└─────────────────────┘      │
         │                   │
         ▼                   │
┌─────────────────────┐      │
│       terms         │      │
├─────────────────────┤      │
│ id                  │      │
│ academic_year_id    │──────┤
│ student_id          │──────┤
│ name                │      │
│ type                │      │
│ order               │      │
│ start_date          │      │
│ end_date            │      │
│ structure (JSON)    │      │
│ goals (JSON)        │      │
│ subjects (JSON)     │      │
│ exams (JSON)        │      │
│ status              │      │
└─────────────────────┘      │
         │                   │
         ▼                   │
┌─────────────────────┐      │
│       weeks         │      │
├─────────────────────┤      │
│ id                  │      │
│ term_id             │──────┤
│ student_id          │──────┘
│ week_number         │
│ name                │
│ start_date          │
│ end_date            │
│ type                │
│ goals (JSON)        │
│ adjustments (JSON)  │
│ result (JSON)       │
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│     sessions        │  (existing)
├─────────────────────┤
│ id                  │
│ week_id             │  ← NEW: link to week
│ student_id          │
│ subject_id          │
│ date                │
│ start_time          │
│ end_time            │
│ status              │
│ ...                 │
└─────────────────────┘
```

## 6. Firebase Realtime Database Structure

```javascript
{
  "academic_years": {
    "{userId}": {
      "{yearId}": {
        "name": "Năm học 2024-2025",
        "startDate": "2024-09-05",
        "endDate": "2025-05-31",
        "studentGrade": 4,
        "academicLevel": "elementary",
        "school": "Tiểu học Nguyễn Du",
        "config": {
          "termsCount": 3,
          "weeksPerTerm": 19
        },
        "holidays": [...],
        "events": [...],
        "status": "active"
      }
    }
  },
  
  "terms": {
    "{userId}": {
      "{termId}": {
        "academicYearId": "2024-2025",
        "name": "Học kỳ 1",
        "type": "semester",
        "order": 1,
        "startDate": "2024-09-05",
        "endDate": "2025-01-15",
        "structure": {
          "learningWeeks": 15,
          "reviewWeeks": 2,
          "examWeeks": 2
        },
        "goals": {...},
        "subjects": [...],
        "exams": [...],
        "status": "active"
      }
    }
  },
  
  "weeks": {
    "{userId}": {
      "{weekId}": {
        "termId": "2024-2025-hk1",
        "weekNumber": 6,
        "name": "Tuần 6",
        "startDate": "2024-10-07",
        "endDate": "2024-10-13",
        "type": "learning",
        "goals": {...},
        "adjustments": {...},
        "result": null
      }
    }
  },
  
  // Existing sessions structure - add weekId reference
  "sessions": {
    "{userId}": {
      "{sessionId}": {
        "weekId": "2024-2025-hk1-w06",  // NEW
        // ... existing fields
      }
    }
  }
}
```

## 7. Implementation Phases

### Phase 1: Data Models & Storage (3 ngày)
- [ ] Định nghĩa Firebase structure
- [ ] CRUD functions cho academic_years
- [ ] CRUD functions cho terms
- [ ] CRUD functions cho weeks

### Phase 2: Setup Wizard UI (4 ngày)
- [ ] Step 1: Year setup form
- [ ] Step 2: Term setup form
- [ ] Step 3: Holidays & events form
- [ ] Step 4: Subjects form
- [ ] Auto-generate weeks on save

### Phase 3: Calendar Views (3 ngày)
- [ ] Year overview component
- [ ] Term detail component
- [ ] Week list component
- [ ] Integration với existing schedule view

### Phase 4: Auto-Generation (2 ngày)
- [ ] generateWeeksForTerm()
- [ ] generateWeeklySchedule()
- [ ] Handle holidays & adjustments

### Phase 5: Integration (2 ngày)
- [ ] Link sessions to weeks
- [ ] Update reports to use term/week data
- [ ] Navigation between calendar levels

---

*Tài liệu thiết kế Module Quản Lý Lịch Học Thuật*
*Cần review và confirm trước khi triển khai.*
