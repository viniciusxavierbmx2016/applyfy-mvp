import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function PATCH(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const result = await prisma.notification.updateMany({
      where: { id: params.id, userId: user.id },
      data: { read: true },
    });

    if (result.count === 0) {
      return NextResponse.json(
        { error: "Notificação não encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PATCH /api/notifications/[id]/read error:", error);
    return NextResponse.json({ error: "Erro" }, { status: 500 });
  }
}
