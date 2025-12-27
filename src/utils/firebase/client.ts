import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { firebaseConfig } from './config';

// Initialize Firebase for client-side
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;

function initializeFirebase() {
  if (typeof window === 'undefined') {
    // Server-side: return undefined, use admin SDK instead
    return { app: undefined, auth: undefined, db: undefined };
  }

  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }

  auth = getAuth(app);
  db = getFirestore(app);

  return { app, auth, db };
}

// Initialize on module load for client
const firebase = initializeFirebase();

export const getFirebaseApp = () => firebase.app;
export const getFirebaseAuth = () => firebase.auth;
export const getFirebaseDb = () => firebase.db;

// Export for direct use in client components
export { app, auth, db };
