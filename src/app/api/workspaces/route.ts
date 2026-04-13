import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";

const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/;

export async function GET() {
  try {
    const staff = await requireStaff();
    const workspaces = await prisma.workspace.findMany({
      where: staff.role === "ADMIN" ? undefined : { ownerId: staff.id },
      orderBy: { createdAt: "asc" },
      include: {
        _count: { select: { courses: true, members: true } },
      },
    });
    return NextResponse.json({ workspaces });
  } catch (error) {
    console.error("GET /api/workspaces error:", error);
    const msg = error instanceof Error ? error.message : "";
    const status =
      msg === "Unauthorized" ? 401 : msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const staff = await requireStaff();
    const body = await request.json();
    const name: string | undefined = body?.name?.toString().trim();
    const slug: string | undefined = body?.slug?.toString().trim().toLowerCase();
    const loginBgColor: string | null = body?.loginBgColor || null;

    if (!name || !slug) {
      return NextResponse.json(
        { error: "Nome e slug são obrigatórios" },
        { status: 400 }
      );
    }
    if (!SLUG_RE.test(slug)) {
      return NextResponse.json(
        {
          error:
            "Slug inválido. Use 3-50 caracteres: letras minúsculas, números e hífens (não começar/terminar com hífen).",
        },
        { status: 400 }
      );
    }

    const existing = await prisma.workspace.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json(
        { error: "Slug já está em uso" },
        { status: 409 }
      );
    }

    const workspace = await prisma.workspace.create({
      data: {
        slug,
        name,
        loginBgColor,
        ownerId: staff.id,
      },
    });

    return NextResponse.json({ workspace }, { status: 201 });
  } catch (error) {
    console.error("POST /api/workspaces error:", error);
    const msg = error instanceof Error ? error.message : "";
    const status =
      msg === "Unauthorized" ? 401 : msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}
