import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

// Cheap optimistic gate: no session cookie → /signin. Real checks happen in pages and
// route handlers (requireUser), since a cookie can be stale.
export function proxy(request: NextRequest) {
  if (!getSessionCookie(request)) {
    const url = new URL("/signin", request.url);
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/app/:path*"],
};
