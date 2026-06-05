/**
 * Family Account System
 * Single Google account with multiple children profiles
 */

import { ref, get, set, push, remove, onValue } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js';

let db = null;
let currentChildId = null;
let familyCache = null;

// Initialize with Firebase database reference
export function initFamily(database) {
  db = database;
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
  const child = {
    name: childData.name,
    grade: childData.grade || null,
    birthDate: childData.birthDate || null,
    avatar: childData.avatar || '🧒',
    school: childData.school || null,
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
 * Select a child profile to view
 */
export async function selectChild(userId, childId) {
  const family = await getFamily(userId);
  if (!family || !family.children || !family.children[childId]) {
    return { success: false, error: 'Không tìm thấy hồ sơ' };
  }

  const child = family.children[childId];
  currentChildId = childId;
  sessionStorage.setItem('sumSched_childId', childId);
  localStorage.setItem('sumSched_defaultChildId', childId);

  return { success: true, child: { id: childId, ...child } };
}

// Alias for backward compatibility
export const loginAsChild = selectChild;

/**
 * Clear child selection (show all children / family view)
 */
export function clearChildSelection() {
  currentChildId = null;
  sessionStorage.removeItem('sumSched_childId');
}

// Alias for backward compatibility
export const loginAsParent = clearChildSelection;

/**
 * Get default child ID (last selected)
 */
export function getDefaultChildId() {
  return localStorage.getItem('sumSched_defaultChildId');
}

/**
 * Get current child ID (if logged in as child)
 */
export function getCurrentChildId() {
  return sessionStorage.getItem('sumSched_childId');
}

/**
 * Logout (clear session)
 */
export function logout() {
  currentChildId = null;
  sessionStorage.removeItem('sumSched_childId');
}

// Legacy function - always returns true since no role-based access
export function isParent() {
  return true;
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
  selectChild,
  loginAsChild,        // alias for selectChild
  loginAsParent,       // alias for clearChildSelection
  clearChildSelection,
  getCurrentChildId,
  getDefaultChildId,
  isParent,
  logout,
  CHILD_AVATARS
};
