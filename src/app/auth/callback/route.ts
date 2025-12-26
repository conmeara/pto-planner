import { NextResponse } from "next/server";

/**
 * Auth callback route for Firebase
 *
 * With Firebase, authentication primarily happens client-side.
 * This route handles redirects after email link sign-in and
 * other auth-related callbacks.
 *
 * The actual session creation happens via the createSessionAction
 * server action, which is called from the client after successful
 * Firebase authentication.
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const origin = requestUrl.origin;
  const redirectTo = requestUrl.searchParams.get("redirect_to")?.toString();
  const mode = requestUrl.searchParams.get("mode");

  // Handle different Firebase auth modes
  if (mode === "signIn") {
    // Email link sign-in - redirect to a page that will complete the sign-in
    const emailLink = requestUrl.href;
    // Encode the email link to pass it to the sign-in page
    const encodedLink = encodeURIComponent(emailLink);
    return NextResponse.redirect(`${origin}/sign-in?emailLink=${encodedLink}`);
  }

  if (mode === "resetPassword") {
    // Password reset - redirect to the reset password page
    const oobCode = requestUrl.searchParams.get("oobCode");
    if (oobCode) {
      return NextResponse.redirect(`${origin}/protected/reset-password?oobCode=${oobCode}`);
    }
  }

  if (mode === "verifyEmail") {
    // Email verification - redirect to sign-in with success message
    return NextResponse.redirect(`${origin}/sign-in?verified=true`);
  }

  // Default redirect
  if (redirectTo) {
    return NextResponse.redirect(`${origin}${redirectTo}`);
  }

  return NextResponse.redirect(`${origin}/protected`);
}
