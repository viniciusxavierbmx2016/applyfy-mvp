import { NextResponse } from "next/server";
import { Redis } from "@upstash/redis";

// Rate limit — 100 req / 60s por (IP + rota).
//
// 2.4 Peça A (shared-store): o contador vive no Upstash Redis (compartilhado entre
// as lambdas da Vercel — o balde per-instância do 2.4a não segurava burst distribuído).
// Fail-open COM fallback: se o Upstash estiver ausente (dev/staging sem as env) ou
// cair/estourar o timeout, o Map local por-instância (o mecanismo do 2.4a) assume —
// ninguém é trancado fora. A chave é o pathname COMPLETO (conserta o bucket por-segmento
// do 2.4a, que fazia todas as /api/auth/* dividirem um balde só).
const WINDOW_SEC = 60;
const MAX_REQUESTS = 100;
const UPSTASH_TIMEOUT_MS = 800; // lição serverless: toda chamada externa com timeout

// Upstash só existe em PRODUCTION. Sem as duas env → redis=null → fallback local
// automático (o teste do Redis real é controlado, nunca acidental).
const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

function getIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}

function tooMany(retryAfterSec: number): NextResponse {
  return NextResponse.json(
    { error: "Muitas requisições. Tente novamente em instantes." },
    {
      status: 429,
      headers: {
        "Retry-After": retryAfterSec.toString(),
        "X-RateLimit-Limit": MAX_REQUESTS.toString(),
        "X-RateLimit-Remaining": "0",
      },
    }
  );
}

// ---- Fallback local: o MESMO mecanismo do 2.4a (Map por-instância), com a
//      chave nova por-rota (keying uniforme com o Redis). ----
interface Bucket {
  count: number;
  resetAt: number;
}
const buckets = new Map<string, Bucket>();

function localLimit(key: string): NextResponse | null {
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    bucket = { count: 0, resetAt: now + WINDOW_SEC * 1000 };
    buckets.set(key, bucket);
  }
  bucket.count++;
  if (bucket.count > MAX_REQUESTS) {
    return tooMany(Math.ceil((bucket.resetAt - now) / 1000));
  }
  // Opportunistic cleanup when map grows
  if (buckets.size > 5000) {
    buckets.forEach((b, k) => {
      if (b.resetAt < now) buckets.delete(k);
    });
  }
  return null;
}

// ---- Upstash: fixed-window por INCR + EXPIRE NX num único round-trip (pipeline).
//      EXPIRE ... NX = só cria o TTL na 1ª req da janela → janela fixa de 60s
//      (provado suportado em @upstash/redis 1.38.0). ----
async function redisLimit(key: string): Promise<NextResponse | null> {
  const pipeline = redis!.pipeline();
  pipeline.incr(key);
  pipeline.expire(key, WINDOW_SEC, "NX");
  const result = (await Promise.race([
    pipeline.exec<[number, number]>(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("upstash-timeout")), UPSTASH_TIMEOUT_MS)
    ),
  ])) as [number, number];
  const count = result[0];
  return count > MAX_REQUESTS ? tooMany(WINDOW_SEC) : null;
}

export async function rateLimit(request: Request): Promise<NextResponse | null> {
  const ip = getIp(request);
  const pathname = new URL(request.url).pathname; // COMPLETO — conserta o por-segmento
  const key = `rl:${ip}:${pathname}`;

  if (redis) {
    try {
      return await redisLimit(key);
    } catch (err) {
      // fail-open com fallback: Upstash indisponível não pode trancar ninguém fora.
      console.error("[rateLimit] Upstash indisponível → fallback local:", err);
    }
  }
  return localLimit(key);
}
