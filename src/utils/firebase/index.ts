// Client-side exports
export { getFirebaseApp, getFirebaseAuth, getFirebaseDb, auth, db } from './client';

// Config exports
export { firebaseConfig, hasFirebaseConfig } from './config';

// Server-side auth utilities
export {
  getCurrentUser,
  createSessionCookie,
  clearSessionCookie,
  verifyIdToken,
} from './auth';
