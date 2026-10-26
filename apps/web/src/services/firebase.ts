import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'studio-8773521461-fa390';
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'studio-8773521461-fa390.firebaseapp.com',
  projectId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Object.values(config).every((value) => typeof value === 'string' && value.length > 0);
export const app = isFirebaseConfigured
  ? (getApps().length ? getApp() : initializeApp(config))
  : null;

export const auth = app ? getAuth(app) : null;
export const firebaseAuth = auth;
export const db = app ? getFirestore(app) : null;
