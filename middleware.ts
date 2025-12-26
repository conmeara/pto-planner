import { type NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE_NAME = '__session';

export async function middleware(request: NextRequest) {
  // Get the session cookie
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const isAuthenticated = !!sessionCookie;

  // Protected routes require authentication
  if (request.nextUrl.pathname.startsWith("/protected") && !isAuthenticated) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  // Redirect authenticated users from home to protected area
  if (request.nextUrl.pathname === "/" && isAuthenticated) {
    return NextResponse.redirect(new URL("/protected", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
