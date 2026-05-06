import { NextResponse, type NextRequest } from "next/server";

// Hosts that serve the public marketing landing instead of the app.
const APEX_HOSTS = new Set([
  "mymembersclub.com.br",
  "www.mymembersclub.com.br",
]);

const publicRoutes = new Set([
  "/login",
  "/register",
  "/admin/login",
  "/producer/login",
  "/producer/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/auth/impersonate",
  "/landing",
]);

const redirectIfAuthed = new Set([
  "/login",
  "/register",
  "/admin/login",
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

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = (request.headers.get("host") ?? "").toLowerCase();
  const isApex = APEX_HOSTS.has(host);

  // Apex domain serves the marketing landing on root via internal rewrite.
  // The app stays at app.mymembersclub.com.br and keeps its auth flow.
  if (isApex && pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/landing";
    return NextResponse.rewrite(url);
  }

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
    url.pathname = wsMatch
      ? `/w/${wsMatch[1]}/login`
      : pathname.startsWith("/admin")
        ? "/admin/login"
        : pathname.startsWith("/producer")
          ? "/producer/login"
          : "/producer/login";
    return NextResponse.redirect(url);
  }

  if (authed && pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/producer";
    return NextResponse.redirect(url);
  }

  if (authed && redirectIfAuthed.has(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.startsWith("/admin")
      ? "/admin"
      : pathname.startsWith("/producer")
        ? "/producer"
        : "/";
    return NextResponse.redirect(url);
  }

  if (authed) {
    const wsLoginMatch = pathname.match(/^\/w\/([^/]+)\/login\/?$/);
    if (wsLoginMatch && !request.nextUrl.searchParams.get("preview")) {
      const url = request.nextUrl.clone();
      url.pathname = `/w/${wsLoginMatch[1]}`;
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|avif|woff2?|ttf|otf|js|css|map|txt|xml|json)$).*)",
  ],
};
