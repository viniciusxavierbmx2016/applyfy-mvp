import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const MAX_MESSAGE_LENGTH = 500;
const PAGE_SIZE = 100;

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const live = await prisma.live.findUnique({
      where: { id: params.id },
      select: { id: true, status: true },
    });
    if (!live) {
      return NextResponse.json({ error: "Live não encontrada" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get("cursor");

    const messages = await prisma.liveMessage.findMany({
      where: { liveId: params.id },
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    const nextCursor = messages.length === PAGE_SIZE ? messages[messages.length - 1].id : null;

    return NextResponse.json({ messages, nextCursor });
  } catch (error) {
    console.error("GET /api/lives/[id]/messages error:", error);
    return NextResponse.json({ error: "Erro" }, { status: 500 });
  }
}

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const live = await prisma.live.findUnique({
      where: { id: params.id },
      select: { id: true, status: true, chatEnabled: true },
    });
    if (!live) {
      return NextResponse.json({ error: "Live não encontrada" }, { status: 404 });
    }
    if (live.status !== "LIVE") {
      return NextResponse.json({ error: "O chat está disponível apenas durante a live" }, { status: 400 });
    }
    if (!live.chatEnabled) {
      return NextResponse.json({ error: "Chat desativado pelo moderador" }, { status: 403 });
    }

    const body = await request.json();
    const { content } = body;

    if (!content?.trim()) {
      return NextResponse.json({ error: "Mensagem vazia" }, { status: 400 });
    }
    if (content.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json({ error: `Mensagem deve ter no máximo ${MAX_MESSAGE_LENGTH} caracteres` }, { status: 400 });
    }

    const message = await prisma.liveMessage.create({
      data: {
        content: content.trim(),
        liveId: params.id,
        userId: user.id,
      },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
      },
    });

    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    console.error("POST /api/lives/[id]/messages error:", error);
    return NextResponse.json({ error: "Erro" }, { status: 500 });
  }
}
