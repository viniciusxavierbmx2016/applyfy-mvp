import { NextResponse, type NextRequest } from "next/server";

const publicRoutes = new Set([
  "/login",
  "/register",
  "/producer/login",
  "/producer/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
]);

const redirectIfAuthed = new Set([
  "/login",
  "/register",
  "/producer/login",
  "/producer/register",
]);

function hasSessionCookie(request: NextRequest): boolean {
  // Supabase SSR chunks large JWTs into `sb-<ref>-auth-token.0`, `.1`, ...
  // so we accept both the whole and chunked cookie names.
  for (const cookie of request.cookies.getAll()) {
    if (
      cookie.name.startsWith("sb-") &&
      cookie.name.includes("-auth-token") &&
      cookie.value
    ) {
      return true;
    }
  }
  return false;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // API routes: auth is enforced per-handler. Middleware does nothing.
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const authed = hasSessionCookie(request);

  const isWorkspacePublic =
    /^\/w\/[^/]+\/(login|register|forgot-password|reset-password)\/?$/.test(
      pathname
    );
  const isPublic =
    publicRoutes.has(pathname) ||
    pathname.startsWith("/verify/") ||
    pathname.startsWith("/invite/") ||
    isWorkspacePublic;

  if (!authed && !isPublic) {
    const url = request.nextUrl.clone();
    const wsMatch = pathname.match(/^\/w\/([^/]+)/);
    url.pathname = wsMatch ? `/w/${wsMatch[1]}/login` : "/login";
    return NextResponse.redirect(url);
  }

  if (authed && redirectIfAuthed.has(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  if (authed) {
    const wsLoginMatch = pathname.match(/^\/w\/([^/]+)\/login\/?$/);
    if (wsLoginMatch) {
      const url = request.nextUrl.clone();
      url.pathname = `/w/${wsLoginMatch[1]}`;
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
