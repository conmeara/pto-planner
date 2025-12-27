import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

let app: App;
let adminAuth: Auth;
let adminDb: Firestore;

function initializeAdmin() {
  if (getApps().length === 0) {
    // For server-side, use service account credentials
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
      ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
      : undefined;

    if (serviceAccount) {
      app = initializeApp({
        credential: cert(serviceAccount),
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      });
    } else {
      // Fallback: use application default credentials (for local dev with gcloud)
      app = initializeApp({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      });
    }
  } else {
    app = getApps()[0];
  }

  adminAuth = getAuth(app);
  adminDb = getFirestore(app);

  return { app, adminAuth, adminDb };
}

// Initialize on module load
const admin = initializeAdmin();

export const getAdminApp = () => admin.app;
export const getAdminAuth = () => admin.adminAuth;
export const getAdminDb = () => admin.adminDb;

// Export for direct use
export { adminAuth, adminDb };
