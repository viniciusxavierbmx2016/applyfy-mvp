import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { pushSubscribeSchema, validateBody } from "@/lib/validations";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const raw = await request.json().catch(() => ({}));
    const v = validateBody(pushSubscribeSchema, raw);
    if (!v.success) return v.error;
    const { endpoint, p256dh, auth, device } = v.data;

    await prisma.pushSubscription.upsert({
      where: {
        userId_endpoint: { userId: user.id, endpoint },
      },
      update: { p256dh, auth, device: device || null },
      create: {
        userId: user.id,
        endpoint,
        p256dh,
        auth,
        device: device || null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("POST /api/push/subscribe error:", error);
    return NextResponse.json({ error: "Erro" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    await prisma.pushSubscription.deleteMany({
      where: { userId: user.id },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/push/subscribe error:", error);
    return NextResponse.json({ error: "Erro" }, { status: 500 });
  }
}
