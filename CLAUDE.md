# CLAUDE.md — Summer Schedule (sum-sched)

## Project Overview
- **Name:** sum-sched
- **Type:** Personal Tool
- **Description:** Website lịch học mùa hè cho con - quản lý môn học, tự động sắp lịch, tracking tiến độ

## Tech Stack
- Frontend: HTML/CSS/JS thuần (Vanilla)
- Storage: LocalStorage (browser)
- Deployment: GitHub Pages
- No build step required

## Features
| Module | Mô tả |
|--------|-------|
| Quản lý môn học | Thêm/sửa/xóa môn (cố định/linh hoạt, slot 1.5h/2h) |
| Lịch cố định | Nhập lịch các môn có giờ cố định |
| Sự kiện đặc biệt | Đánh dấu ngày nghỉ, đi chơi |
| Auto-schedule | Tự động phân bổ môn linh hoạt vào slot trống |
| View lịch | Xem theo ngày/tuần, responsive mobile |
| Tracking | Đánh dấu hoàn thành, ghi chú |
| Báo cáo | Ngày/Tuần/Tháng: tiến độ %, tổng giờ, tổng môn |

## File Structure
```
sum-sched/
├── index.html          # Main app
├── css/
│   └── style.css       # Styles (mobile-first)
├── js/
│   ├── app.js          # Main app logic
│   ├── data.js         # Data management (LocalStorage)
│   ├── scheduler.js    # Auto-schedule algorithm
│   ├── ui.js           # UI rendering
│   └── reports.js      # Reports & statistics
├── assets/
│   └── icons/          # App icons
├── CLAUDE.md           # AI context
└── README.md           # User guide
```

## Development Guidelines

### Code Style
- Use ES6+ features (const, let, arrow functions, modules)
- Mobile-first CSS (min-width media queries)
- BEM naming for CSS classes
- JSDoc comments for functions

### Data Model
```javascript
// Subject (Môn học)
{
  id: "uuid",
  name: "Toán MathX",
  type: "fixed" | "flexible",
  slotDuration: 1.5 | 2,  // hours
  hasTeacher: true | false,
  color: "#hex",
  schedule: [  // for fixed type
    { day: 1, startTime: "08:00", endTime: "09:30" }
  ]
}

// Event (Sự kiện đặc biệt)
{
  id: "uuid",
  date: "2024-06-15",
  type: "holiday" | "trip" | "other",
  description: "Đi biển"
}

// Session (Buổi học)
{
  id: "uuid",
  subjectId: "uuid",
  date: "2024-06-15",
  startTime: "08:00",
  endTime: "10:00",
  status: "pending" | "completed" | "skipped",
  notes: "Làm xong bài 1-5"
}
```

## AI Instructions
- Responsive design: test trên cả desktop và mobile
- LocalStorage: handle quota exceeded gracefully
- No external dependencies (pure vanilla JS)
- Accessibility: semantic HTML, ARIA labels
- AI autonomy: Full Auto (commit, push, PR allowed)

## Quick Commands
```bash
# Start local server
python -m http.server 8000
# or
npx serve .

# Deploy to GitHub Pages
git push origin main
```

## Links
- Repository: https://github.com/hangdo/sum-sched
- Live: https://hangdo.github.io/sum-sched/
- Brain2: [[projects/sum-sched/index]]
