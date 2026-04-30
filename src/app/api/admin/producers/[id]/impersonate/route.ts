import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import crypto from "crypto";
import { logAudit, getRequestMeta } from "@/lib/audit";

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const admin = await requireAdmin();

    const producer = await prisma.user.findUnique({
      where: { id: params.id },
      select: { id: true, email: true, role: true },
    });

    if (!producer || producer.role === "STUDENT") {
      return NextResponse.json(
        { error: "Produtor não encontrado" },
        { status: 404 }
      );
    }

    const token = crypto.randomBytes(32).toString("hex");

    await prisma.impersonateToken.create({
      data: {
        token,
        userId: producer.id,
        adminId: admin.id,
        expiresAt: new Date(Date.now() + 120 * 1000),
      },
    });

    prisma.impersonateToken
      .deleteMany({ where: { expiresAt: { lt: new Date() } } })
      .catch(() => {});

    const origin =
      request.headers.get("origin") ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "";

    console.log(
      `[IMPERSONATE] Admin ${admin.email} gerou token para ${producer.email}`
    );

    await logAudit({
      userId: admin.id,
      action: "impersonate",
      target: producer.id,
      details: { email: producer.email },
      ...getRequestMeta(request),
    });

    return NextResponse.json({
      url: `${origin}/auth/impersonate?token=${token}`,
      email: producer.email,
      expiresIn: 120,
    });
  } catch (error) {
    console.error("[IMPERSONATE] error:", error);
    const msg = error instanceof Error ? error.message : "";
    const status =
      msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}
