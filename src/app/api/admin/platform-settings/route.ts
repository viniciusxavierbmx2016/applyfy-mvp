import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { invalidatePlatformSettingsCache } from "@/lib/platform-settings";
import { platformSettingsSchema, validateBody } from "@/lib/validations";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await prisma.platformSettings.upsert({
      where: { id: "platform" },
      update: {},
      create: { id: "platform" },
    });
    return NextResponse.json({ settings });
  } catch {
    return NextResponse.json(
      { settings: { logoUrl: null, faviconUrl: null } }
    );
  }
}

export async function PUT(request: Request) {
  try {
    await requireAdmin();
    const raw = await request.json().catch(() => ({}));
    const v = validateBody(platformSettingsSchema, raw);
    if (!v.success) return v.error;
    const { logoUrl, faviconUrl } = v.data;

    const settings = await prisma.platformSettings.upsert({
      where: { id: "platform" },
      update: {
        ...(logoUrl !== undefined && { logoUrl }),
        ...(faviconUrl !== undefined && { faviconUrl }),
      },
      create: {
        id: "platform",
        ...(logoUrl !== undefined && { logoUrl }),
        ...(faviconUrl !== undefined && { faviconUrl }),
      },
    });

    invalidatePlatformSettingsCache();
    return NextResponse.json({ settings });
  } catch (error) {
    console.error("[platform-settings] save error:", error);
    const msg = error instanceof Error ? error.message : "";
    const status =
      msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro interno" }, { status });
  }
}
