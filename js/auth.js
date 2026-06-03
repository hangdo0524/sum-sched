/**
 * Authentication Module
 * Firebase Auth with Google Sign-In only
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import {
  getAuth,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getDatabase, ref, set, get } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js';

const firebaseConfig = {
  apiKey: "AIzaSyDTmNGAnainIY9I_FUTVFco_JXGil_bcWo",
  authDomain: "sum-sched.firebaseapp.com",
  databaseURL: "https://sum-sched-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "sum-sched",
  storageBucket: "sum-sched.firebasestorage.app",
  messagingSenderId: "286594886319",
  appId: "1:286594886319:web:483c952e7eefe8d90e425a"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const googleProvider = new GoogleAuthProvider();

let currentUser = null;
let userProfile = null;
let onAuthChangeCallback = null;

// Get database instance for other modules
export function getDb() {
  return db;
}

// Listen for auth state changes
export function initAuth(callback) {
  onAuthChangeCallback = callback;

  onAuthStateChanged(auth, async (user) => {
    currentUser = user;

    if (user) {
      userProfile = await loadOrCreateUserProfile(user);
      console.log('✅ Logged in:', user.email);
    } else {
      userProfile = null;
      console.log('❌ Logged out');
    }

    if (onAuthChangeCallback) {
      onAuthChangeCallback(user, userProfile);
    }
  });
}

// Load or create user profile in database
async function loadOrCreateUserProfile(user) {
  const userRef = ref(db, `users/${user.uid}`);

  try {
    const snapshot = await get(userRef);

    if (snapshot.exists()) {
      return { uid: user.uid, ...snapshot.val() };
    }

    // Create new profile for first-time user
    const newProfile = {
      email: user.email,
      displayName: user.displayName || user.email.split('@')[0],
      photoURL: user.photoURL || null,
      role: 'user',
      notificationPrefs: {
        emailEnabled: true,
        pushEnabled: false,
        dailyReminderTime: '07:00',
        sessionReminderMins: 15
      },
      createdAt: new Date().toISOString()
    };

    await set(userRef, newProfile);
    return { uid: user.uid, ...newProfile };
  } catch (error) {
    console.error('Error loading user profile:', error);
    return null;
  }
}

// Google Sign-In
export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return { success: true, user: result.user };
  } catch (error) {
    console.error('Google sign-in error:', error);
    return { success: false, error: error.message };
  }
}

// Sign out
export async function logOut() {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    console.error('Sign-out error:', error);
    return { success: false, error: error.message };
  }
}

// Get current user
export function getCurrentUser() {
  return currentUser;
}

// Get current user profile
export function getUserProfile() {
  return userProfile;
}

// Check if user is admin
export function isAdmin() {
  return userProfile?.role === 'admin';
}

// Update user profile
export async function updateUserProfile(updates) {
  if (!currentUser) return false;

  const userRef = ref(db, `users/${currentUser.uid}`);
  try {
    const snapshot = await get(userRef);
    if (snapshot.exists()) {
      const current = snapshot.val();
      await set(userRef, { ...current, ...updates, updatedAt: new Date().toISOString() });
      userProfile = { uid: currentUser.uid, ...current, ...updates };
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error updating profile:', error);
    return false;
  }
}

// Update notification preferences
export async function updateNotificationPrefs(prefs) {
  return updateUserProfile({
    notificationPrefs: { ...userProfile?.notificationPrefs, ...prefs }
  });
}

// Get all users (admin only)
export async function getAllUsers() {
  if (!isAdmin()) return [];

  const usersRef = ref(db, 'users');
  try {
    const snapshot = await get(usersRef);
    if (snapshot.exists()) {
      return Object.entries(snapshot.val()).map(([uid, data]) => ({ uid, ...data }));
    }
    return [];
  } catch (error) {
    console.error('Error fetching users:', error);
    return [];
  }
}

export default {
  getDb,
  initAuth,
  signInWithGoogle,
  logOut,
  getCurrentUser,
  getUserProfile,
  isAdmin,
  updateUserProfile,
  updateNotificationPrefs,
  getAllUsers
};
