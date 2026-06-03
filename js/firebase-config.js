/**
 * Firebase Configuration - Shared across modules
 * Single source of truth for Firebase initialization
 */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getDatabase } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

const firebaseConfig = {
  apiKey: "AIzaSyDTmNGAnainIY9I_FUTVFco_JXGil_bcWo",
  authDomain: "sum-sched.firebaseapp.com",
  databaseURL: "https://sum-sched-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "sum-sched",
  storageBucket: "sum-sched.firebasestorage.app",
  messagingSenderId: "286594886319",
  appId: "1:286594886319:web:483c952e7eefe8d90e425a"
};

// Initialize Firebase once
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

export { app, db, auth, firebaseConfig };
