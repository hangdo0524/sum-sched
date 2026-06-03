/**
 * Firebase Integration for Sum-Sched
 * Real-time sync across devices
 */

import { ref, set, get, onValue } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js';
import { getDb } from './auth.js';

// Get database from auth module (single source of truth)
let db = null;
function getDatabase() {
  if (!db) db = getDb();
  return db;
}

let currentUserId = null;
let onDataChangeCallback = null;

/**
 * Set current user for Firebase operations
 */
export function setFirebaseUser(userId) {
  currentUserId = userId;
}

/**
 * Save user data to Firebase
 */
export async function saveToFirebase(userId, data) {
  const userRef = ref(getDatabase(), `users/${userId}`);
  try {
    await set(userRef, {
      ...data,
      updatedAt: new Date().toISOString()
    });
    console.log('✅ Saved to Firebase:', userId);
    return true;
  } catch (error) {
    console.error('❌ Firebase save error:', error);
    return false;
  }
}

/**
 * Load user data from Firebase
 */
export async function loadFromFirebase(userId) {
  const userRef = ref(getDatabase(), `users/${userId}`);
  try {
    const snapshot = await get(userRef);
    if (snapshot.exists()) {
      console.log('✅ Loaded from Firebase:', userId);
      return snapshot.val();
    }
    console.log('ℹ️ No data in Firebase for:', userId);
    return null;
  } catch (error) {
    console.error('❌ Firebase load error:', error);
    return null;
  }
}

/**
 * Subscribe to real-time updates for a user
 */
export function subscribeToUser(userId, callback) {
  const userRef = ref(getDatabase(), `users/${userId}`);

  const unsubscribe = onValue(userRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      console.log('🔄 Firebase real-time update:', userId);
      callback(data);
    }
  }, (error) => {
    console.error('❌ Firebase subscription error:', error);
  });

  return unsubscribe;
}

/**
 * Save all users list to Firebase
 */
export async function saveUsersListToFirebase(users) {
  const usersListRef = ref(getDatabase(), 'usersList');
  try {
    await set(usersListRef, users);
    return true;
  } catch (error) {
    console.error('❌ Firebase save users list error:', error);
    return false;
  }
}

/**
 * Load users list from Firebase
 */
export async function loadUsersListFromFirebase() {
  const usersListRef = ref(getDatabase(), 'usersList');
  try {
    const snapshot = await get(usersListRef);
    if (snapshot.exists()) {
      return snapshot.val();
    }
    return null;
  } catch (error) {
    console.error('❌ Firebase load users list error:', error);
    return null;
  }
}

export default {
  setFirebaseUser,
  saveToFirebase,
  loadFromFirebase,
  subscribeToUser,
  saveUsersListToFirebase,
  loadUsersListFromFirebase
};
