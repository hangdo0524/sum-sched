/**
 * Family Account System
 * Parent-Child account management with PIN-based child access
 */

import { ref, get, set, push, remove, onValue } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js';

let db = null;
let currentRole = 'parent'; // 'parent' or 'child'
let currentChildId = null;
let familyCache = null;

// Initialize with Firebase database reference
export function initFamily(database) {
  db = database;
}

// Hash PIN for storage (simple hash for demo - use bcrypt in production)
async function hashPin(pin) {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin + 'sumSched_salt');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Verify PIN against stored hash
async function verifyPin(pin, storedHash) {
  const inputHash = await hashPin(pin);
  return inputHash === storedHash;
}

/**
 * Get family data for a user
 */
export async function getFamily(userId) {
  if (!db || !userId || userId === 'demo') {
    return getFamilyFromLocal();
  }

  try {
    const familyRef = ref(db, `families/${userId}`);
    const snapshot = await get(familyRef);
    if (snapshot.exists()) {
      familyCache = snapshot.val();
      return familyCache;
    }
    return null;
  } catch (error) {
    console.error('Error getting family:', error);
    return getFamilyFromLocal();
  }
}

function getFamilyFromLocal() {
  const stored = localStorage.getItem('sumSched_family');
  return stored ? JSON.parse(stored) : null;
}

function saveFamilyToLocal(family) {
  localStorage.setItem('sumSched_family', JSON.stringify(family));
}

/**
 * Create or update parent profile
 */
export async function saveParentProfile(userId, profile) {
  const parent = {
    email: profile.email,
    name: profile.name || 'Phụ huynh',
    settings: profile.settings || {}
  };

  if (!db || !userId || userId === 'demo') {
    const family = getFamilyFromLocal() || { children: {} };
    family.parent = parent;
    saveFamilyToLocal(family);
    familyCache = family;
    return true;
  }

  try {
    const parentRef = ref(db, `families/${userId}/parent`);
    await set(parentRef, parent);
    return true;
  } catch (error) {
    console.error('Error saving parent profile:', error);
    return false;
  }
}

/**
 * Add a new child to the family
 */
export async function addChild(userId, childData) {
  const pinHash = await hashPin(childData.pin);

  const child = {
    name: childData.name,
    birthDate: childData.birthDate || null,
    avatar: childData.avatar || '🧒',
    pinHash: pinHash,
    createdAt: new Date().toISOString()
  };

  if (!db || !userId || userId === 'demo') {
    const family = getFamilyFromLocal() || { parent: {}, children: {} };
    const childId = 'child_' + Date.now().toString(36);
    family.children[childId] = child;
    saveFamilyToLocal(family);
    familyCache = family;
    return { id: childId, ...child };
  }

  try {
    const childrenRef = ref(db, `families/${userId}/children`);
    const newChildRef = push(childrenRef);
    await set(newChildRef, child);
    return { id: newChildRef.key, ...child };
  } catch (error) {
    console.error('Error adding child:', error);
    return null;
  }
}

/**
 * Update child profile
 */
export async function updateChild(userId, childId, updates) {
  // Don't update pinHash unless PIN is changed
  if (updates.pin) {
    updates.pinHash = await hashPin(updates.pin);
    delete updates.pin;
  }

  if (!db || !userId || userId === 'demo') {
    const family = getFamilyFromLocal();
    if (family && family.children[childId]) {
      family.children[childId] = { ...family.children[childId], ...updates };
      saveFamilyToLocal(family);
      familyCache = family;
      return true;
    }
    return false;
  }

  try {
    const childRef = ref(db, `families/${userId}/children/${childId}`);
    const snapshot = await get(childRef);
    if (snapshot.exists()) {
      await set(childRef, { ...snapshot.val(), ...updates });
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error updating child:', error);
    return false;
  }
}

/**
 * Remove a child from the family
 */
export async function removeChild(userId, childId) {
  if (!db || !userId || userId === 'demo') {
    const family = getFamilyFromLocal();
    if (family && family.children[childId]) {
      delete family.children[childId];
      saveFamilyToLocal(family);
      familyCache = family;
      return true;
    }
    return false;
  }

  try {
    await remove(ref(db, `families/${userId}/children/${childId}`));
    return true;
  } catch (error) {
    console.error('Error removing child:', error);
    return false;
  }
}

/**
 * Get all children for display
 */
export function getChildren(family) {
  if (!family || !family.children) return [];
  return Object.entries(family.children).map(([id, child]) => ({
    id,
    ...child
  }));
}

/**
 * Verify child PIN and set current session
 */
export async function loginAsChild(userId, childId, pin) {
  const family = await getFamily(userId);
  if (!family || !family.children || !family.children[childId]) {
    return { success: false, error: 'Không tìm thấy hồ sơ' };
  }

  const child = family.children[childId];
  const isValid = await verifyPin(pin, child.pinHash);

  if (isValid) {
    currentRole = 'child';
    currentChildId = childId;
    sessionStorage.setItem('sumSched_role', 'child');
    sessionStorage.setItem('sumSched_childId', childId);
    return { success: true, child: { id: childId, ...child } };
  }

  return { success: false, error: 'PIN không đúng' };
}

/**
 * Login as parent (after Google auth)
 */
export function loginAsParent() {
  currentRole = 'parent';
  currentChildId = null;
  sessionStorage.setItem('sumSched_role', 'parent');
  sessionStorage.removeItem('sumSched_childId');
}

/**
 * Get current session role
 */
export function getCurrentRole() {
  return sessionStorage.getItem('sumSched_role') || 'parent';
}

/**
 * Get current child ID (if logged in as child)
 */
export function getCurrentChildId() {
  return sessionStorage.getItem('sumSched_childId');
}

/**
 * Check if current user is parent
 */
export function isParent() {
  return getCurrentRole() === 'parent';
}

/**
 * Logout (clear session, return to profile selection)
 */
export function logout() {
  currentRole = 'parent';
  currentChildId = null;
  sessionStorage.removeItem('sumSched_role');
  sessionStorage.removeItem('sumSched_childId');
}

/**
 * Get UI permissions for current role
 */
export function getPermissions() {
  const role = getCurrentRole();

  if (role === 'parent') {
    return {
      canEditSubjects: true,
      canEditSchedule: true,
      canManageChildren: true,
      canViewAllChildren: true,
      canAccessSettings: true,
      canViewReports: true,
      canMarkCompleted: true
    };
  }

  // Child permissions
  return {
    canEditSubjects: false,
    canEditSchedule: false,
    canManageChildren: false,
    canViewAllChildren: false,
    canAccessSettings: false,
    canViewReports: true, // Own reports only
    canMarkCompleted: true // Can mark own sessions
  };
}

/**
 * Available avatars for children
 */
export const CHILD_AVATARS = [
  '🧒', '👦', '👧', '🧒🏻', '👦🏻', '👧🏻',
  '🦊', '🐰', '🐻', '🐼', '🐨', '🦁',
  '🐸', '🐵', '🦄', '🐯', '🐮', '🐷'
];

export default {
  initFamily,
  getFamily,
  saveParentProfile,
  addChild,
  updateChild,
  removeChild,
  getChildren,
  loginAsChild,
  loginAsParent,
  getCurrentRole,
  getCurrentChildId,
  isParent,
  logout,
  getPermissions,
  CHILD_AVATARS
};
