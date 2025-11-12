import { initializeUserAccount } from "@/app/actions/user-actions";
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  // The `/auth/callback` route is required for the server-side auth flow implemented
  // by the SSR package. It exchanges an auth code for the user's session.
  // https://supabase.com/docs/guides/auth/server-side/nextjs
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const origin = requestUrl.origin;
  const redirectTo = requestUrl.searchParams.get("redirect_to")?.toString();

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);

    const {
      data: { user },
      error: userFetchError,
    } = await supabase.auth.getUser();

    if (!userFetchError && user) {
      const { data: existingUser, error: profileError } = await supabase
        .from("users")
        .select("id")
        .eq("id", user.id)
        .single();

      if (profileError && profileError.code !== "PGRST116") {
        console.error("Failed to load user profile during auth callback:", profileError);
      }

      if (!existingUser) {
        const initResult = await initializeUserAccount(user.id, user.email ?? "");
        if (!initResult.success) {
          console.error("Failed to initialize user account during auth callback:", initResult.error);
        }
      }
    } else if (userFetchError) {
      console.error("Failed to fetch authenticated user during auth callback:", userFetchError);
    }
  }

  if (redirectTo) {
    return NextResponse.redirect(`${origin}${redirectTo}`);
  }

  // URL to redirect to after sign up process completes
  return NextResponse.redirect(`${origin}/protected`);
}
