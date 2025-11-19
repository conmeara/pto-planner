"use server";

import { encodedRedirect, getURL } from "@/utils/utils";
import { createClient } from "@/utils/supabase/server";
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

export const signUpAction = async (formData: FormData) => {
  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();
  const supabase = await createClient();
  const origin = await getURL();

  if (!email || !password) {
    return encodedRedirect(
      "error",
      "/sign-up",
      "Email and password are required",
    );
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}auth/callback`,
    },
  });

  if (error) {
    console.error(error.code + " " + error.message);
    return encodedRedirect("error", "/sign-up", error.message);
  }

  // Initialize user account in database
  if (data.user) {
    const initResult = await initializeUserAccount(data.user.id, email);
    if (!initResult.success) {
      console.error("Failed to initialize user account:", initResult.error);
      // Don't fail signup if initialization fails - user can set up later
    }
  }

  return encodedRedirect(
    "success",
    "/sign-up",
    "Thanks for signing up! Please check your email for a verification link.",
  );
};

export const signInAction = async (formData: FormData) => {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return encodedRedirect("error", "/sign-in", error.message);
  }

  return redirect("/dashboard");
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

  const supabase = await createClient();
  const origin = await getURL();

  const { error } = await supabase.auth.signInWithOtp({
    email: parsedEmail.data.email,
    options: {
      emailRedirectTo: `${origin}auth/callback?redirect_to=/`,
      shouldCreateUser: true,
    },
  });

  if (error) {
    console.error("Magic link error:", error.message);
    return {
      success: false,
      error: "Unable to send a magic link right now. Please try again shortly.",
    };
  }

  const resendAvailableAt = now + MAGIC_LINK_RESEND_WINDOW_MS;
  setMagicLinkRateLimitCookie(cookieStore, resendAvailableAt);

  return {
    success: true,
    message: "Check your email for a secure sign-in link.",
    resendAvailableAt,
  };
};

export const forgotPasswordAction = async (formData: FormData) => {
  const email = formData.get("email")?.toString();
  const supabase = await createClient();
  const origin = await getURL();
  const callbackUrl = formData.get("callbackUrl")?.toString();

  if (!email) {
    return encodedRedirect("error", "/forgot-password", "Email is required");
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}auth/callback?redirect_to=/protected/reset-password`,
  });

  if (error) {
    console.error(error.message);
    return encodedRedirect(
      "error",
      "/forgot-password",
      "Could not reset password",
    );
  }

  if (callbackUrl) {
    return redirect(callbackUrl);
  }

  return encodedRedirect(
    "success",
    "/forgot-password",
    "Check your email for a link to reset your password.",
  );
};

export const resetPasswordAction = async (formData: FormData) => {
  const supabase = await createClient();

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

  const { error } = await supabase.auth.updateUser({
    password: password,
  });

  if (error) {
    return encodedRedirect(
      "error",
      "/protected/reset-password",
      "Password update failed",
    );
  }

  return encodedRedirect("success", "/protected/reset-password", "Password updated");
};

export const signOutAction = async () => {
  const supabase = await createClient();
  await supabase.auth.signOut();

  // Clean up rate limit cookie on sign out
  const cookieStore = await cookies();
  cookieStore.delete(MAGIC_LINK_RATE_LIMIT_COOKIE);

  return redirect("/sign-in");
};
