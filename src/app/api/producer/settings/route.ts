import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { producerSettingsSchema, validateBody } from "@/lib/validations";

const ADMIN_KEYS = new Set(["stripe_webhook_secret"]);
const STAFF_KEYS = new Set(["applyfy_token"]);
const ALL_KEYS = new Set(["stripe_webhook_secret", "applyfy_token"]);

export async function GET() {
  try {
    const staff = await requireStaff();
    const canAdmin = staff.role === "ADMIN";

    const visibleKeys = canAdmin
      ? Array.from(ALL_KEYS)
      : Array.from(STAFF_KEYS);

    const rows = await prisma.settings.findMany({
      where: { key: { in: visibleKeys } },
    });

    const map: Record<string, string> = {};
    for (const r of rows) map[r.key] = r.value;

    const masked: Record<string, { set: boolean; preview: string }> = {};
    for (const k of visibleKeys) {
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
      msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}

export async function PUT(request: Request) {
  try {
    const staff = await requireStaff();
    const canAdmin = staff.role === "ADMIN";

    const raw = await request.json().catch(() => ({}));
    const v = validateBody(producerSettingsSchema, raw);
    if (!v.success) return v.error;
    const updates = v.data.settings;

    for (const key of Object.keys(updates)) {
      if (!ALL_KEYS.has(key)) continue;
      if (ADMIN_KEYS.has(key) && !canAdmin) continue;
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
      msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}
