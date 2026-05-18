import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { validateBody, vitrineCustomizeSchema } from "@/lib/validations";

export const dynamic = "force-dynamic";

const SELECT_FIELDS = {
  accentColor: true,
  vitrineBgColor: true,
  vitrineSidebarColor: true,
  vitrineHeaderColor: true,
  vitrineCardColor: true,
  vitrineTextColor: true,
  vitrineWelcomeText: true,
  vitrineLayoutStyle: true,
  bannerUrl: true,
  bannerPosition: true,
} as const;

const EDITABLE_FIELDS = [
  "vitrineBgColor",
  "vitrineSidebarColor",
  "vitrineHeaderColor",
  "vitrineCardColor",
  "vitrineTextColor",
  "accentColor",
  "vitrineWelcomeText",
  "vitrineLayoutStyle",
] as const;

function errorStatus(error: unknown): NextResponse {
  const msg = error instanceof Error ? error.message : "";
  if (msg === "Não autorizado") {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  if (msg === "Sem permissão") {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }
  return NextResponse.json({ error: "Erro" }, { status: 500 });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const staff = await requireStaff();

    const workspace = await prisma.workspace.findFirst({
      where: { id, ownerId: staff.id },
      select: SELECT_FIELDS,
    });

    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ customization: workspace });
  } catch (error) {
    console.error("GET /api/producer/workspaces/[id]/vitrine error:", error);
    return errorStatus(error);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const staff = await requireStaff();

    const workspace = await prisma.workspace.findFirst({
      where: { id, ownerId: staff.id },
      select: { id: true },
    });
    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace não encontrado" },
        { status: 404 }
      );
    }

    const raw = await request.json().catch(() => ({}));
    const v = validateBody(vitrineCustomizeSchema, raw);
    if (!v.success) return v.error;

    const data: Record<string, string | null> = {};
    for (const key of EDITABLE_FIELDS) {
      if (key in v.data) {
        data[key] = v.data[key as keyof typeof v.data] ?? null;
      }
    }

    const updated = await prisma.workspace.update({
      where: { id },
      data,
      select: SELECT_FIELDS,
    });

    return NextResponse.json({ customization: updated });
  } catch (error) {
    console.error("PUT /api/producer/workspaces/[id]/vitrine error:", error);
    return errorStatus(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const staff = await requireStaff();

    const workspace = await prisma.workspace.findFirst({
      where: { id, ownerId: staff.id },
      select: { id: true },
    });
    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace não encontrado" },
        { status: 404 }
      );
    }

    const updated = await prisma.workspace.update({
      where: { id },
      data: {
        accentColor: null,
        vitrineBgColor: null,
        vitrineSidebarColor: null,
        vitrineHeaderColor: null,
        vitrineCardColor: null,
        vitrineTextColor: null,
        vitrineWelcomeText: null,
        vitrineLayoutStyle: "netflix",
      },
      select: SELECT_FIELDS,
    });

    return NextResponse.json({ customization: updated });
  } catch (error) {
    console.error("DELETE /api/producer/workspaces/[id]/vitrine error:", error);
    return errorStatus(error);
  }
}
