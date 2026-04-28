import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import crypto from "crypto";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await requireAdmin();

    const producer = await prisma.user.findUnique({
      where: { id: params.id },
      select: { id: true, email: true, name: true, role: true },
    });

    if (!producer) {
      return NextResponse.json(
        { error: "Produtor não encontrado" },
        { status: 404 }
      );
    }

    if (producer.role !== "PRODUCER") {
      return NextResponse.json(
        { error: "Usuário não é produtor" },
        { status: 400 }
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
    const url = `${origin}/api/auth/impersonate/${token}`;

    console.log(
      `[IMPERSONATE] Admin ${admin.email} (${admin.id}) gerou token para ${producer.email} (${producer.id}) em ${new Date().toISOString()}`
    );

    return NextResponse.json({ url, email: producer.email, expiresIn: 120 });
  } catch (error) {
    console.error("[IMPERSONATE] error:", error);
    const msg = error instanceof Error ? error.message : "";
    const status =
      msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}
