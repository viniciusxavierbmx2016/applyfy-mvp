import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

const ALLOWED_KEYS = new Set([
  "hotmart_hottok",
  "stripe_webhook_secret",
]);

export async function GET() {
  try {
    await requireAdmin();

    const rows = await prisma.settings.findMany({
      where: { key: { in: Array.from(ALLOWED_KEYS) } },
    });

    const map: Record<string, string> = {};
    for (const r of rows) map[r.key] = r.value;

    // Mask long secrets so they aren't re-sent in full; show last 4
    const masked: Record<string, { set: boolean; preview: string }> = {};
    for (const k of Array.from(ALLOWED_KEYS)) {
      const v = map[k] || "";
      masked[k] = {
        set: v.length > 0,
        preview: v ? `••••${v.slice(-4)}` : "",
      };
    }

    return NextResponse.json({ settings: masked });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    const status =
      msg === "Unauthorized" ? 401 : msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}

export async function PUT(request: Request) {
  try {
    await requireAdmin();

    const body = await request.json();
    const updates = body?.settings as Record<string, string | null> | undefined;

    if (!updates || typeof updates !== "object") {
      return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
    }

    for (const key of Object.keys(updates)) {
      if (!ALLOWED_KEYS.has(key)) continue;
      const value = updates[key];
      if (value === null || value === "") {
        await prisma.settings.deleteMany({ where: { key } });
      } else if (typeof value === "string") {
        await prisma.settings.upsert({
          where: { key },
          create: { key, value },
          update: { value },
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PUT /api/admin/settings error:", error);
    const msg = error instanceof Error ? error.message : "";
    const status =
      msg === "Unauthorized" ? 401 : msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}
