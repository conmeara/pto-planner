"use server";

import { encodedRedirect, getURL } from "@/utils/utils";
import { redirect } from "next/navigation";
import { initializeUserAccount } from "@/app/actions/user-actions";
import { cookies } from "next/headers";
import {
  MagicLinkRequestSchema,
  type MagicLinkResponse,
} from "@/types";
import {
  MAGIC_LINK_RATE_LIMIT_COOKIE,
  MAGIC_LINK_RESEND_WINDOW_SECONDS,
} from "@/lib/auth/constants";
import { createSessionCookie, clearSessionCookie, getCurrentUser } from "@/utils/firebase/auth";
import { getAdminAuth } from "@/utils/firebase/admin";
import {
  getUsersCollection,
  convertUser,
} from "@/utils/firebase/firestore-admin";

/**
 * Create a session after client-side sign in
 * Called from the client after Firebase Auth signIn completes
 */
export const createSessionAction = async (idToken: string) => {
  try {
    await createSessionCookie(idToken);

    // Get user info from the token
    const adminAuth = getAdminAuth();
    const decodedToken = await adminAuth.verifyIdToken(idToken);

    // Check if user profile exists, if not initialize it
    const usersCollection = getUsersCollection();
    const userDoc = await usersCollection.doc(decodedToken.uid).get();

    if (!userDoc.exists) {
      await initializeUserAccount(decodedToken.uid, decodedToken.email || '');
    }

    return { success: true };
  } catch (error) {
    console.error("Error creating session:", error);
    return { success: false, error: "Failed to create session" };
  }
};

/**
 * Sign up action - creates user in Firebase Auth
 * Note: With Firebase, sign up happens on the client, then we create a session
 */
export const signUpAction = async (formData: FormData) => {
  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();

  if (!email || !password) {
    return encodedRedirect(
      "error",
      "/sign-up",
      "Email and password are required",
    );
  }

  // With Firebase, actual sign-up happens on the client side
  // This action is kept for form validation and redirect handling
  // The client will call createSessionAction after successful sign-up

  return encodedRedirect(
    "success",
    "/sign-up",
    "Please complete sign-up in the form.",
  );
};

/**
 * Sign in action - validates form data
 * Note: With Firebase, sign in happens on the client, then we create a session
 */
export const signInAction = async (formData: FormData): Promise<void> => {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    encodedRedirect("error", "/sign-in", "Email and password are required");
    return;
  }

  // With Firebase, actual sign-in happens on the client side
  // This server action validates the form data
  // The client will call createSessionAction after successful sign-in
};

const MAGIC_LINK_RESEND_WINDOW_MS = MAGIC_LINK_RESEND_WINDOW_SECONDS * 1000;
type CookieStore = Awaited<ReturnType<typeof cookies>>;

const parseResendTimestamp = (value?: string | null) => {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const setMagicLinkRateLimitCookie = (
  cookieStore: CookieStore,
  resendAvailableAt: number,
) => {
  cookieStore.set(MAGIC_LINK_RATE_LIMIT_COOKIE, resendAvailableAt.toString(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(resendAvailableAt),
    maxAge: MAGIC_LINK_RESEND_WINDOW_SECONDS,
  });
};

/**
 * Send magic link for email sign-in
 * Note: Firebase uses signInWithEmailLink for this
 */
export const signInWithMagicLinkAction = async (
  formData: FormData,
): Promise<MagicLinkResponse> => {
  const rawEmail = formData.get("email");
  const parsedEmail = MagicLinkRequestSchema.safeParse({
    email: typeof rawEmail === "string" ? rawEmail : "",
  });

  if (!parsedEmail.success) {
    const errorMessage =
      parsedEmail.error.issues[0]?.message || "Enter a valid email address.";
    return { success: false, error: errorMessage };
  }

  const cookieStore = await cookies();
  const now = Date.now();
  const existingRateLimit = parseResendTimestamp(
    cookieStore.get(MAGIC_LINK_RATE_LIMIT_COOKIE)?.value,
  );

  if (existingRateLimit && existingRateLimit > now) {
    const secondsRemaining = Math.ceil(
      (existingRateLimit - now) / 1000,
    );
    return {
      success: false,
      error: `Please wait ${secondsRemaining}s before requesting another magic link.`,
      resendAvailableAt: existingRateLimit,
    };
  }

  if (existingRateLimit && existingRateLimit <= now) {
    cookieStore.delete(MAGIC_LINK_RATE_LIMIT_COOKIE);
  }

  // With Firebase, magic link is sent from the client using sendSignInLinkToEmail
  // Store the email in a cookie so we can verify it after the user clicks the link
  const origin = await getURL();

  // Store email for verification after clicking link
  cookieStore.set('emailForSignIn', parsedEmail.data.email, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60, // 1 hour
  });

  const resendAvailableAt = now + MAGIC_LINK_RESEND_WINDOW_MS;
  setMagicLinkRateLimitCookie(cookieStore, resendAvailableAt);

  return {
    success: true,
    message: "Check your email for a secure sign-in link.",
    resendAvailableAt,
  };
};

/**
 * Get the stored email for magic link verification
 */
export const getEmailForSignIn = async () => {
  const cookieStore = await cookies();
  return cookieStore.get('emailForSignIn')?.value || null;
};

/**
 * Clear the stored email after magic link verification
 */
export const clearEmailForSignIn = async () => {
  const cookieStore = await cookies();
  cookieStore.delete('emailForSignIn');
};

/**
 * Request password reset
 * Note: With Firebase, this is done client-side with sendPasswordResetEmail
 */
export const forgotPasswordAction = async (formData: FormData) => {
  const email = formData.get("email")?.toString();
  const callbackUrl = formData.get("callbackUrl")?.toString();

  if (!email) {
    return encodedRedirect("error", "/forgot-password", "Email is required");
  }

  // With Firebase, password reset email is sent from the client
  // This action validates the form and handles redirects

  if (callbackUrl) {
    return redirect(callbackUrl);
  }

  return encodedRedirect(
    "success",
    "/forgot-password",
    "Check your email for a link to reset your password.",
  );
};

/**
 * Reset password action
 * Note: With Firebase, password reset is completed client-side with confirmPasswordReset
 */
export const resetPasswordAction = async (formData: FormData) => {
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!password || !confirmPassword) {
    return encodedRedirect(
      "error",
      "/protected/reset-password",
      "Password and confirm password are required",
    );
  }

  if (password !== confirmPassword) {
    return encodedRedirect(
      "error",
      "/protected/reset-password",
      "Passwords do not match",
    );
  }

  // With Firebase, the actual password update happens client-side
  // using confirmPasswordReset with the oobCode from the URL

  return encodedRedirect("success", "/protected/reset-password", "Password updated");
};

/**
 * Sign out action
 */
export const signOutAction = async () => {
  await clearSessionCookie();

  // Clean up rate limit cookie on sign out
  const cookieStore = await cookies();
  cookieStore.delete(MAGIC_LINK_RATE_LIMIT_COOKIE);
  cookieStore.delete('emailForSignIn');

  // Return user to the main planner (unauthenticated view uses local data)
  return redirect("/");
};

/**
 * Get current user from session
 */
export const getCurrentUserAction = async () => {
  return await getCurrentUser();
};
