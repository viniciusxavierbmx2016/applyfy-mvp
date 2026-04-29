import { prisma } from "@/lib/prisma";

export async function logAudit(params: {
  userId: string;
  action: string;
  target?: string | null;
  details?: Record<string, unknown> | null;
  ip?: string | null;
  userAgent?: string | null;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        target: params.target ?? null,
        details: params.details ? JSON.stringify(params.details) : null,
        ip: params.ip ?? null,
        userAgent: params.userAgent ?? null,
      },
    });
  } catch (err) {
    // Audit failures must never break the originating request.
    console.error("[AUDIT] Failed to log:", err);
  }
}

export function getRequestMeta(req: Request) {
  const fwd = req.headers.get("x-forwarded-for");
  return {
    ip:
      fwd?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      "unknown",
    userAgent: req.headers.get("user-agent") || "unknown",
  };
}
