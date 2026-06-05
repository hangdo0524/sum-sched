/**
 * Key Manager - Encrypt/Decrypt API keys using user's PIN
 */

import { ref, get, set } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js';

let db = null;

export function initKeyManager(database) {
  db = database;
}

/**
 * Encrypt API key using PIN as password
 * Uses Web Crypto API for secure encryption
 */
export async function encryptKey(apiKey, pin) {
  if (!apiKey || !pin) return null;

  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(apiKey);

    // Derive key from PIN
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(pin),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );

    // Generate salt
    const salt = crypto.getRandomValues(new Uint8Array(16));

    // Derive AES key
    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    );

    // Generate IV
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Encrypt
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );

    // Combine salt + iv + encrypted data
    const combined = new Uint8Array(salt.length + iv.length + encrypted.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(encrypted), salt.length + iv.length);

    // Return as base64
    return btoa(String.fromCharCode(...combined));

  } catch (error) {
    console.error('Encryption error:', error);
    return null;
  }
}

/**
 * Decrypt API key using PIN
 */
export async function decryptKey(encryptedKey, pin) {
  if (!encryptedKey || !pin) return null;

  try {
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    // Decode base64
    const combined = new Uint8Array(
      atob(encryptedKey).split('').map(c => c.charCodeAt(0))
    );

    // Extract salt, iv, and encrypted data
    const salt = combined.slice(0, 16);
    const iv = combined.slice(16, 28);
    const encrypted = combined.slice(28);

    // Derive key from PIN
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(pin),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );

    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );

    // Decrypt
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encrypted
    );

    return decoder.decode(decrypted);

  } catch (error) {
    console.error('Decryption error:', error);
    return null;
  }
}

/**
 * Save encrypted keys to Firebase
 */
export async function saveEncryptedKeys(userId, keys) {
  if (!db || !userId) return false;

  try {
    await set(ref(db, `users/${userId}/aiSettings/keys`), keys);
    return true;
  } catch (error) {
    console.error('Error saving keys:', error);
    return false;
  }
}

/**
 * Load encrypted keys from Firebase
 */
export async function loadEncryptedKeys(userId) {
  if (!db || !userId) return null;

  try {
    const snapshot = await get(ref(db, `users/${userId}/aiSettings/keys`));
    return snapshot.exists() ? snapshot.val() : null;
  } catch (error) {
    console.error('Error loading keys:', error);
    return null;
  }
}

/**
 * Save AI settings (mode, preferred provider)
 */
export async function saveAISettings(userId, settings) {
  if (!db || !userId) return false;

  try {
    const { mode, preferredProvider } = settings;
    await set(ref(db, `users/${userId}/aiSettings/preferences`), {
      mode,
      preferredProvider,
      updatedAt: new Date().toISOString()
    });
    return true;
  } catch (error) {
    console.error('Error saving AI settings:', error);
    return false;
  }
}

/**
 * Load AI settings
 */
export async function loadAISettings(userId) {
  if (!db || !userId) return null;

  try {
    const snapshot = await get(ref(db, `users/${userId}/aiSettings/preferences`));
    return snapshot.exists() ? snapshot.val() : {
      mode: 'demo',
      preferredProvider: 'auto'
    };
  } catch (error) {
    console.error('Error loading AI settings:', error);
    return { mode: 'demo', preferredProvider: 'auto' };
  }
}

/**
 * Delete all AI keys for user
 */
export async function deleteAllKeys(userId) {
  if (!db || !userId) return false;

  try {
    await set(ref(db, `users/${userId}/aiSettings/keys`), null);
    return true;
  } catch (error) {
    console.error('Error deleting keys:', error);
    return false;
  }
}

export default {
  initKeyManager,
  encryptKey,
  decryptKey,
  saveEncryptedKeys,
  loadEncryptedKeys,
  saveAISettings,
  loadAISettings,
  deleteAllKeys
};
