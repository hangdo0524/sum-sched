# User & Family Model

## 1. Tổng Quan

Hệ thống sử dụng **Family Account** - 1 tài khoản Google cho cả gia đình, quản lý nhiều con.

```
┌─────────────────────────────────────────────────────────────────┐
│                        FAMILY ACCOUNT                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                    GOOGLE AUTH                            │   │
│  │                  (parent@gmail.com)                       │   │
│  └──────────────────────────────────────────────────────────┘   │
│                              │                                   │
│                              ▼                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                   CHILDREN PROFILES                       │   │
│  │                                                           │   │
│  │    ┌─────────┐    ┌─────────┐    ┌─────────┐            │   │
│  │    │  👧    │    │  👶    │    │   ➕    │            │   │
│  │    │  Anna   │    │  Ivy    │    │  Thêm   │            │   │
│  │    │ Lớp 4   │    │ Lớp 1   │    │         │            │   │
│  │    └─────────┘    └─────────┘    └─────────┘            │   │
│  │                                                           │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 2. User Flow

### 2.1. Đăng nhập lần đầu

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Login Page    │────▶│  Google Auth    │────▶│  Thêm con đầu   │
│                 │     │                 │     │  tiên           │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
                                                ┌─────────────────┐
                                                │   Dashboard     │
                                                │   (của con)     │
                                                └─────────────────┘
```

### 2.2. Đăng nhập lần sau

```
┌─────────────────┐     ┌─────────────────┐
│   Login Page    │────▶│   Dashboard     │
│  (auto-login)   │     │ (con cuối cùng) │
└─────────────────┘     └─────────────────┘
```

### 2.3. Chuyển đổi giữa các con

```
┌─────────────────────────────────────────────────────────────────┐
│  [👧 Anna ▼]        Lịch Học Hè 2024            [⚙️] [🔔]      │
├─────────────────────────────────────────────────────────────────┤
│  ┌────────────────────┐                                         │
│  │ 👧 Anna        ✓   │  ← Đang xem                            │
│  │ 👶 Ivy             │  ← Click để chuyển                     │
│  │ ──────────────     │                                         │
│  │ 📊 Tổng hợp cả nhà │  ← Xem báo cáo tất cả con              │
│  │ ➕ Thêm con        │                                         │
│  │ ──────────────     │                                         │
│  │ ⚙️ Cài đặt         │                                         │
│  │ 🚪 Đăng xuất       │                                         │
│  └────────────────────┘                                         │
│                                                                  │
│  ... Dashboard content ...                                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 3. Data Model

### 3.1. Firebase Realtime Database Structure

```javascript
{
  // User profile (từ Google Auth)
  "users": {
    "{uid}": {
      "email": "parent@gmail.com",
      "displayName": "Mẹ Hằng",
      "photoURL": "https://...",
      "createdAt": "2024-06-01T...",
      "updatedAt": "2024-06-03T...",
      
      // Settings
      "settings": {
        "defaultChildId": "child_1",    // Con hiển thị mặc định
        "notificationEnabled": true,
        "reminderTime": "07:00"
      }
    }
  },
  
  // Children profiles
  "children": {
    "{uid}": {
      "{childId}": {
        "name": "Anna",
        "avatar": "👧",                 // Emoji hoặc preset avatar
        "grade": 4,
        "birthDate": "2016-03-15",
        "school": "Tiểu học Nguyễn Du",
        "createdAt": "2024-06-01T...",
        "updatedAt": "2024-06-03T..."
      }
    }
  },
  
  // Subjects - theo từng con
  "subjects": {
    "{uid}": {
      "{childId}": {
        "{subjectId}": {
          "name": "Toán",
          "color": "#4CAF50",
          "icon": "calculate",
          "defaultDuration": 90,
          "isActive": true
        }
      }
    }
  },
  
  // Sessions - theo từng con
  "sessions": {
    "{uid}": {
      "{childId}": {
        "{sessionId}": {
          "subjectId": "subj_1",
          "date": "2024-06-15",
          "startTime": "08:00",
          "endTime": "09:30",
          "status": "done",
          "notes": "..."
        }
      }
    }
  },
  
  // Academic Years - theo từng con
  "academicYears": {
    "{uid}": {
      "{childId}": {
        "{yearId}": {
          "name": "2024-2025",
          "startDate": "2024-09-05",
          "endDate": "2025-05-31",
          // ...
        }
      }
    }
  },
  
  // Terms - theo từng con
  "terms": {
    "{uid}": {
      "{childId}": {
        "{termId}": {
          // ...
        }
      }
    }
  }
}
```

### 3.2. TypeScript Interfaces

```typescript
interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  settings: UserSettings;
  createdAt: string;
  updatedAt: string;
}

interface UserSettings {
  defaultChildId: string;
  notificationEnabled: boolean;
  reminderTime: string;
}

interface Child {
  id: string;
  name: string;
  avatar: string;          // Emoji: "👧", "👦", "🧒", etc.
  grade: number;           // 1-12
  birthDate?: string;      // YYYY-MM-DD
  school?: string;
  createdAt: string;
  updatedAt: string;
}

// Computed
interface ChildWithStats extends Child {
  todaySessions: number;
  completedToday: number;
  totalSubjects: number;
}
```

## 4. UI Components

### 4.1. Profile Selector (Header)

```
Component: ProfileSelector
Location: Header, bên trái

Props:
- children: Child[]
- activeChildId: string
- onSelectChild: (childId) => void
- onAddChild: () => void

States:
- isOpen: boolean (dropdown)
```

### 4.2. Add Child Modal

```
┌─────────────────────────────────────────────────────────────────┐
│  ➕ Thêm Con                                            [✕]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Tên con: [________________________]                            │
│                                                                  │
│  Lớp:     [▼ Chọn lớp             ]                            │
│           ┌─────────────────────┐                               │
│           │ Lớp 1               │                               │
│           │ Lớp 2               │                               │
│           │ ...                 │                               │
│           │ Lớp 12              │                               │
│           └─────────────────────┘                               │
│                                                                  │
│  Avatar:                                                        │
│  ┌───┬───┬───┬───┬───┬───┬───┬───┐                             │
│  │👧│👦│🧒│👶│😊│🌟│🎨│🎵│                             │
│  └───┴───┴───┴───┴───┴───┴───┴───┘                             │
│   [●] [ ] [ ] [ ] [ ] [ ] [ ] [ ]                               │
│                                                                  │
│  Trường (tùy chọn): [________________________]                  │
│                                                                  │
│                                                                  │
│                               [Hủy]    [✅ Thêm con]            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 4.3. Family Overview (Tổng hợp cả nhà)

```
┌─────────────────────────────────────────────────────────────────┐
│  📊 Tổng Hợp Cả Nhà                              Hôm nay 4/6   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 👧 Anna (Lớp 4)                                          │    │
│  │ ████████████████░░░░  4/5 ca (80%)                      │    │
│  │ Tiếp theo: Tiếng Anh 14:00                              │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 👶 Ivy (Lớp 1)                                           │    │
│  │ ██████████░░░░░░░░░░  2/4 ca (50%)                      │    │
│  │ Tiếp theo: Tập đọc 15:00                                │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ─────────────────────────────────────────────────              │
│                                                                  │
│  📈 Tuần này:                                                   │
│  • Anna: 18/20 ca hoàn thành                                   │
│  • Ivy: 12/15 ca hoàn thành                                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 5. API Functions

```javascript
// children.js

import { db } from './firebase-config.js';
import { ref, get, set, push, remove, update } from 'firebase-database';

// Get all children for current user
export async function getChildren(uid) {
  const childrenRef = ref(db, `children/${uid}`);
  const snapshot = await get(childrenRef);
  
  if (!snapshot.exists()) return [];
  
  return Object.entries(snapshot.val()).map(([id, data]) => ({
    id,
    ...data
  }));
}

// Add new child
export async function addChild(uid, childData) {
  const childrenRef = ref(db, `children/${uid}`);
  const newChildRef = push(childrenRef);
  
  const child = {
    ...childData,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  
  await set(newChildRef, child);
  
  // If first child, set as default
  const children = await getChildren(uid);
  if (children.length === 1) {
    await updateUserSettings(uid, { defaultChildId: newChildRef.key });
  }
  
  return { id: newChildRef.key, ...child };
}

// Update child
export async function updateChild(uid, childId, updates) {
  const childRef = ref(db, `children/${uid}/${childId}`);
  await update(childRef, {
    ...updates,
    updatedAt: new Date().toISOString()
  });
}

// Delete child (và tất cả data liên quan)
export async function deleteChild(uid, childId) {
  // Delete child profile
  await remove(ref(db, `children/${uid}/${childId}`));
  
  // Delete related data
  await remove(ref(db, `subjects/${uid}/${childId}`));
  await remove(ref(db, `sessions/${uid}/${childId}`));
  await remove(ref(db, `academicYears/${uid}/${childId}`));
  await remove(ref(db, `terms/${uid}/${childId}`));
}

// Get/Set active child
export async function setActiveChild(uid, childId) {
  await updateUserSettings(uid, { defaultChildId: childId });
  localStorage.setItem('activeChildId', childId);
}

export function getActiveChildId(uid) {
  return localStorage.getItem('activeChildId');
}
```

## 6. First-Time User Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     CHÀO MỪNG! 👋                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Cảm ơn bạn đã sử dụng Lịch Học Hè!                            │
│                                                                  │
│  Để bắt đầu, hãy thêm thông tin con của bạn:                   │
│                                                                  │
│  ─────────────────────────────────────────────────              │
│                                                                  │
│  Tên con: [________________________]                            │
│                                                                  │
│  Lớp:     [▼ Chọn lớp             ]                            │
│                                                                  │
│  Avatar:  👧 👦 🧒 👶 😊 🌟 🎨 🎵                               │
│          [●] [ ] [ ] [ ] [ ] [ ] [ ] [ ]                        │
│                                                                  │
│                                                                  │
│                                    [✅ Bắt đầu]                 │
│                                                                  │
│  💡 Bạn có thể thêm nhiều con sau trong phần Cài đặt           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## 7. Migration từ Data hiện có

Nếu user đã có data cũ (không có childId):

```javascript
// Migration script
async function migrateToMultiChild(uid) {
  // 1. Tạo child mặc định
  const defaultChild = await addChild(uid, {
    name: "Con",
    avatar: "🧒",
    grade: 1
  });
  
  // 2. Move sessions cũ vào child mới
  const oldSessionsRef = ref(db, `sessions/${uid}`);
  const snapshot = await get(oldSessionsRef);
  
  if (snapshot.exists()) {
    const sessions = snapshot.val();
    
    // Check if already migrated (has childId structure)
    const firstKey = Object.keys(sessions)[0];
    if (sessions[firstKey].subjectId) {
      // Old format - need migration
      const newSessionsRef = ref(db, `sessions/${uid}/${defaultChild.id}`);
      await set(newSessionsRef, sessions);
      // Don't delete old data yet - keep for safety
    }
  }
  
  // 3. Same for subjects
  // ...
}
```

## 8. Security Rules (Firebase)

```javascript
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid"
      }
    },
    "children": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid"
      }
    },
    "subjects": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid"
      }
    },
    "sessions": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid"
      }
    },
    "academicYears": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid"
      }
    },
    "terms": {
      "$uid": {
        ".read": "$uid === auth.uid",
        ".write": "$uid === auth.uid"
      }
    }
  }
}
```

---

*Tài liệu định nghĩa User & Family Model*
*Cập nhật: 2024-06-04*
