/**
 * Firebase Integration for Sum-Sched
 * Real-time sync across devices
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getDatabase, ref, set, get, onValue } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js';

const firebaseConfig = {
  apiKey: "AIzaSyDTmNGAnainIY9I_FUTVFco_JXGil_bcWo",
  authDomain: "sum-sched.firebaseapp.com",
  databaseURL: "https://sum-sched-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "sum-sched",
  storageBucket: "sum-sched.firebasestorage.app",
  messagingSenderId: "286594886319",
  appId: "1:286594886319:web:483c952e7eefe8d90e425a",
  measurementId: "G-2S9Z19T7VP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

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
  const userRef = ref(db, `users/${userId}`);
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
  const userRef = ref(db, `users/${userId}`);
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
  const userRef = ref(db, `users/${userId}`);

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
  const usersListRef = ref(db, 'usersList');
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
  const usersListRef = ref(db, 'usersList');
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
