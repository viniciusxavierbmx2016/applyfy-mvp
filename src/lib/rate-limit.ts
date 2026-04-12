import { NextResponse } from "next/server";

const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 100;

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

function getIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}

export function rateLimit(request: Request): NextResponse | null {
  const ip = getIp(request);
  const now = Date.now();
  const key = `${ip}:${new URL(request.url).pathname.split("/")[2] ?? "root"}`;
  let bucket = buckets.get(key);

  if (!bucket || bucket.resetAt < now) {
    bucket = { count: 0, resetAt: now + WINDOW_MS };
    buckets.set(key, bucket);
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

  // Opportunistic cleanup when map grows
  if (buckets.size > 5000) {
    buckets.forEach((b, k) => {
      if (b.resetAt < now) buckets.delete(k);
    });
  }

  return null;
}
