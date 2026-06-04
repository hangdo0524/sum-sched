/**
 * One-time setup script to initialize family data in Firebase
 * Run this after logging in with ledobsn@gmail.com
 *
 * Usage: Call window.setupFamilyData() from browser console
 */

import { db } from './firebase-config.js';
import { ref, set, get } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js';

// Anna's data (Lớp 4)
const ANNA_DATA = {
  subjects: [
    {
      id: "subj_1",
      name: "Toán (hè)",
      category: "academic",
      type: "self-study",
      color: "#ef4444",
      slotDuration: 1.5,
      config: {
        duration: 1.5,
        sessionsPerWeek: 2,
        preferredSlots: ["early", "morning", "early-afternoon", "afternoon", "evening"]
      }
    },
    {
      id: "subj_2",
      name: "Việt (hè)",
      category: "academic",
      type: "self-study",
      color: "#f59e0b",
      slotDuration: 1.5,
      config: {
        duration: 1.5,
        sessionsPerWeek: 2,
        preferredSlots: ["early", "morning", "early-afternoon", "afternoon", "evening"]
      }
    },
    {
      id: "subj_3",
      name: "English (hè)",
      category: "academic",
      type: "self-study",
      color: "#10b981",
      slotDuration: 1.5,
      config: {
        duration: 1.5,
        sessionsPerWeek: 2,
        preferredSlots: ["early", "morning", "early-afternoon", "afternoon", "evening"]
      }
    },
    {
      id: "subj_4",
      name: "English 1:1",
      category: "academic",
      type: "fixed",
      color: "#3b82f6",
      slotDuration: 0.5,
      schedule: [
        { day: 2, startTime: "19:10", endTime: "19:40", selected: true },
        { day: 3, startTime: "19:10", endTime: "19:40", selected: true }
      ],
      extraSelfStudy: { enabled: false }
    },
    {
      id: "subj_5",
      name: "MathX",
      category: "academic",
      type: "fixed",
      color: "#8b5cf6",
      slotDuration: 1.5,
      schedule: [
        { day: 3, startTime: "09:00", endTime: "10:30", selected: true }
      ],
      extraSelfStudy: {
        enabled: true,
        duration: 1.5,
        sessionsPerWeek: 3,
        preferredSlots: ["early", "morning", "early-afternoon", "afternoon", "evening"]
      }
    },
    {
      id: "subj_6",
      name: "Bơi",
      category: "physical",
      type: "fixed",
      color: "#06b6d4",
      slotDuration: 2,
      schedule: [
        { day: 1, startTime: "14:00", endTime: "16:00", selected: true },
        { day: 3, startTime: "14:00", endTime: "16:00", selected: true },
        { day: 5, startTime: "14:00", endTime: "16:00", selected: true }
      ],
      extraSelfStudy: { enabled: false }
    },
    {
      id: "subj_7",
      name: "Vẽ",
      category: "art",
      type: "weekly-pick",
      color: "#ec4899",
      slotDuration: 1.5,
      config: { requiredSessions: 0, targetSessions: 2 },
      schedule: [
        { day: 4, startTime: "17:30", endTime: "19:00", selected: false },
        { day: 5, startTime: "17:30", endTime: "19:00", selected: false },
        { day: 6, startTime: "09:00", endTime: "10:30", selected: false },
        { day: 6, startTime: "17:00", endTime: "18:30", selected: true },
        { day: 0, startTime: "17:00", endTime: "18:30", selected: false }
      ],
      extraSelfStudy: { enabled: false }
    },
    {
      id: "subj_8",
      name: "Taekwondo",
      category: "physical",
      type: "fixed-plus",
      color: "#f97316",
      slotDuration: 1.375,
      config: { requiredSessions: 2, targetSessions: 3 },
      schedule: [
        { day: 2, startTime: "17:45", endTime: "19:00", selected: true },
        { day: 4, startTime: "17:45", endTime: "19:00", selected: true },
        { day: 5, startTime: "17:45", endTime: "19:00", selected: false },
        { day: 6, startTime: "09:30", endTime: "11:00", selected: true },
        { day: 6, startTime: "18:00", endTime: "19:30", selected: false },
        { day: 0, startTime: "15:30", endTime: "17:00", selected: false }
      ],
      extraSelfStudy: { enabled: false }
    },
    {
      id: "subj_9",
      name: "Viết",
      category: "academic",
      type: "fixed",
      color: "#4f46e5",
      slotDuration: 1.5,
      schedule: [
        { day: 3, startTime: "20:00", endTime: "21:30", selected: true },
        { day: 5, startTime: "20:00", endTime: "21:30", selected: true }
      ],
      extraSelfStudy: { enabled: false }
    }
  ],
  sessions: [],
  events: [],
  settings: {
    dailyStartTime: "08:30",
    dailyEndTime: "21:30",
    breakDuration: 30,
    preferredSlots: ["morning", "afternoon"]
  }
};

// Ivy's data (Lớp 1)
const IVY_DATA = {
  subjects: [
    {
      id: "ivy_subj_1",
      name: "Tập đọc",
      category: "academic",
      type: "self-study",
      slotDuration: 1,
      color: "#f59e0b",
      config: {
        duration: 1,
        sessionsPerWeek: 5,
        preferredSlots: ["early", "morning"]
      }
    },
    {
      id: "ivy_subj_2",
      name: "Tập viết",
      category: "academic",
      type: "self-study",
      slotDuration: 1,
      color: "#10b981",
      config: {
        duration: 1,
        sessionsPerWeek: 5,
        preferredSlots: ["morning"]
      }
    },
    {
      id: "ivy_subj_3",
      name: "Học Bơi",
      category: "physical",
      type: "fixed",
      slotDuration: 1,
      color: "#06b6d4",
      schedule: [
        { day: 2, startTime: "09:00", endTime: "10:00", selected: true },
        { day: 4, startTime: "09:00", endTime: "10:00", selected: true },
        { day: 6, startTime: "09:00", endTime: "10:00", selected: true }
      ]
    }
  ],
  sessions: [],
  events: [],
  settings: {
    dailyStartTime: "08:30",
    dailyEndTime: "18:00",
    breakDuration: 30,
    preferredSlots: ["morning", "early-afternoon"]
  }
};

/**
 * Setup family data in Firebase
 * @param {string} parentUid - Firebase Auth UID of parent (ledobsn@gmail.com)
 */
export async function setupFamilyData(parentUid) {
  if (!parentUid) {
    console.error('❌ Cần parentUid để setup data');
    return false;
  }

  console.log('🚀 Bắt đầu setup family data cho:', parentUid);

  try {
    // 1. Create family structure with children profiles
    const familyData = {
      parent: {
        email: 'ledobsn@gmail.com',
        name: 'Phụ huynh',
        settings: {
          defaultChildId: 'anna'
        }
      },
      children: {
        anna: {
          name: 'Anna',
          avatar: '👧',
          grade: 4,
          school: '',
          createdAt: new Date().toISOString()
        },
        ivy: {
          name: 'Ivy',
          avatar: '👶',
          grade: 1,
          school: '',
          createdAt: new Date().toISOString()
        }
      }
    };

    console.log('📁 Đang tạo family structure...');
    await set(ref(db, `families/${parentUid}`), familyData);
    console.log('✅ Family structure đã tạo');

    // 2. Upload Anna's data
    console.log('📁 Đang upload data của Anna...');
    await set(ref(db, `userData/anna`), {
      ...ANNA_DATA,
      updatedAt: new Date().toISOString()
    });
    console.log('✅ Anna data đã upload');

    // 3. Upload Ivy's data
    console.log('📁 Đang upload data của Ivy...');
    await set(ref(db, `userData/ivy`), {
      ...IVY_DATA,
      updatedAt: new Date().toISOString()
    });
    console.log('✅ Ivy data đã upload');

    console.log('');
    console.log('🎉 SETUP HOÀN TẤT!');
    console.log('');
    console.log('Firebase structure:');
    console.log(`  families/${parentUid}/`);
    console.log('    ├── parent: { email, name, settings }');
    console.log('    └── children/');
    console.log('        ├── anna: { name, avatar, grade }');
    console.log('        └── ivy: { name, avatar, grade }');
    console.log('');
    console.log('  userData/anna/ → subjects, sessions của Anna');
    console.log('  userData/ivy/  → subjects, sessions của Ivy');
    console.log('');
    console.log('Refresh trang để thấy thay đổi!');

    return true;
  } catch (error) {
    console.error('❌ Lỗi setup:', error);
    return false;
  }
}

/**
 * Verify the setup
 */
export async function verifySetup(parentUid) {
  console.log('🔍 Đang kiểm tra setup...');

  try {
    // Check family
    const familySnap = await get(ref(db, `families/${parentUid}`));
    if (familySnap.exists()) {
      const family = familySnap.val();
      console.log('✅ Family:', family.parent?.email);
      console.log('   Children:', Object.keys(family.children || {}).join(', '));
    } else {
      console.log('❌ Family chưa được tạo');
    }

    // Check Anna
    const annaSnap = await get(ref(db, 'userData/anna'));
    if (annaSnap.exists()) {
      const anna = annaSnap.val();
      console.log('✅ Anna:', anna.subjects?.length, 'môn học');
    } else {
      console.log('❌ Anna data chưa có');
    }

    // Check Ivy
    const ivySnap = await get(ref(db, 'userData/ivy'));
    if (ivySnap.exists()) {
      const ivy = ivySnap.val();
      console.log('✅ Ivy:', ivy.subjects?.length, 'môn học');
    } else {
      console.log('❌ Ivy data chưa có');
    }
  } catch (error) {
    console.error('❌ Lỗi kiểm tra:', error);
  }
}

// Export to window for console access
if (typeof window !== 'undefined') {
  window.setupFamilyData = setupFamilyData;
  window.verifySetup = verifySetup;
}

export default { setupFamilyData, verifySetup };
