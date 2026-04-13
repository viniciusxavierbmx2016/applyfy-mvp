import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const publicRoutes = ["/login", "/register"];

const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 100;

interface Bucket {
  count: number;
  resetAt: number;
}
const buckets = new Map<string, Bucket>();

function getIp(request: NextRequest): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}

function applyRateLimit(request: NextRequest): NextResponse | null {
  const ip = getIp(request);
  const now = Date.now();
  let bucket = buckets.get(ip);
  if (!bucket || bucket.resetAt < now) {
    bucket = { count: 0, resetAt: now + WINDOW_MS };
    buckets.set(ip, bucket);
  }
  bucket.count++;
  if (bucket.count > MAX_REQUESTS) {
    return NextResponse.json(
      { error: "Muitas requisições. Tente novamente em instantes." },
      {
        status: 429,
        headers: {
          "Retry-After": Math.ceil((bucket.resetAt - now) / 1000).toString(),
          "X-RateLimit-Limit": MAX_REQUESTS.toString(),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }
  if (buckets.size > 5000) {
    buckets.forEach((b, k) => {
      if (b.resetAt < now) buckets.delete(k);
    });
  }
  return null;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rate limit — apenas para /api/* (exceto webhooks externos)
  if (pathname.startsWith("/api/") && !pathname.startsWith("/api/webhooks/")) {
    const limited = applyRateLimit(request);
    if (limited) return limited;
  }

  // Webhooks são servidor-a-servidor, sem cookies Supabase. Skip session refresh.
  if (pathname.startsWith("/api/webhooks/")) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getUser() refresca o access_token se necessário e, via setAll, grava os
  // cookies rotacionados em supabaseResponse — essencial no Vercel onde o
  // refresh_token é one-time-use.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Para rotas /api/* só renovamos cookies — a autorização fica no handler.
  if (pathname.startsWith("/api/")) {
    return supabaseResponse;
  }

  const isPublic =
    publicRoutes.includes(pathname) || pathname.startsWith("/verify/");

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && publicRoutes.includes(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
