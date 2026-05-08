import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import {
  generateSalt,
  hashPassword,
  hashResetToken,
} from "@/lib/workspace-auth";

export async function POST(
  request: Request,
  props: { params: Promise<{ slug: string }> }
) {
  const limited = rateLimit(request);
  if (limited) return limited;

  const params = await props.params;
  try {
    const body = await request.json().catch(() => ({}));
    const token = typeof body?.token === "string" ? body.token : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!token || !password || password.length < 6) {
      return NextResponse.json(
        { error: "Token e senha (mín. 6 caracteres) obrigatórios" },
        { status: 400 }
      );
    }

    const workspace = await prisma.workspace.findUnique({
      where: { slug: params.slug },
      select: { id: true, isActive: true },
    });
    if (!workspace || !workspace.isActive) {
      return NextResponse.json(
        { error: "Workspace não encontrado" },
        { status: 404 }
      );
    }

    const hashedToken = hashResetToken(token);
    const credential = await prisma.workspaceCredential.findFirst({
      where: {
        workspaceId: workspace.id,
        resetToken: hashedToken,
        resetExpires: { gte: new Date() },
      },
      select: { id: true, userId: true },
    });
    if (!credential) {
      return NextResponse.json(
        { error: "Link inválido ou expirado" },
        { status: 400 }
      );
    }

    const salt = generateSalt();
    const passwordHash = hashPassword(password, salt);
    await prisma.workspaceCredential.update({
      where: { id: credential.id },
      data: {
        passwordHash,
        salt,
        resetToken: null,
        resetExpires: null,
      },
    });

    logger.info("workspace reset", "password reset", {
      userId: credential.userId,
      workspaceId: workspace.id,
    });

    return NextResponse.json({ message: "Senha redefinida com sucesso" });
  } catch (err) {
    console.error("POST /api/w/[slug]/reset-password error:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
