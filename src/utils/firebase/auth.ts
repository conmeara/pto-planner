import { cookies } from 'next/headers';
import { getAdminAuth } from './admin';

const SESSION_COOKIE_NAME = '__session';
const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 14, // 14 days
};

/**
 * Get the current user from session cookie
 * Returns null if not authenticated
 */
export async function getCurrentUser() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!sessionCookie) {
      return null;
    }

    const adminAuth = getAdminAuth();
    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true);

    return {
      uid: decodedToken.uid,
      email: decodedToken.email || null,
      emailVerified: decodedToken.email_verified || false,
    };
  } catch (error) {
    // Session cookie is invalid or expired
    console.error('Session verification failed:', error);
    return null;
  }
}

/**
 * Create a session cookie from an ID token
 * Called after client-side sign-in
 */
export async function createSessionCookie(idToken: string) {
  const adminAuth = getAdminAuth();

  // Create session cookie with 14-day expiry
  const expiresIn = 60 * 60 * 24 * 14 * 1000; // 14 days in milliseconds
  const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, sessionCookie, SESSION_COOKIE_OPTIONS);

  return sessionCookie;
}

/**
 * Clear the session cookie (sign out)
 */
export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Verify an ID token (for API routes)
 */
export async function verifyIdToken(idToken: string) {
  try {
    const adminAuth = getAdminAuth();
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    console.error('ID token verification failed:', error);
    return null;
  }
}
