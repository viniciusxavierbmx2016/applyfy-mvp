import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const course = await prisma.course.findUnique({
      where: { id: params.id },
      include: {
        modules: {
          orderBy: { order: "asc" },
          include: {
            lessons: { orderBy: { order: "asc" } },
          },
        },
      },
    });

    if (!course) {
      return NextResponse.json(
        { error: "Curso não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ course });
  } catch (error) {
    console.error("GET /api/courses/[id] error:", error);
    return NextResponse.json(
      { error: "Erro ao buscar curso" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();

    const body = await request.json();
    const {
      title,
      slug,
      description,
      thumbnail,
      checkoutUrl,
      externalProductId,
      isPublished,
      showInStore,
    } = body;

    if (slug) {
      const existing = await prisma.course.findFirst({
        where: { slug, NOT: { id: params.id } },
      });
      if (existing) {
        return NextResponse.json(
          { error: "Já existe um curso com esse slug" },
          { status: 409 }
        );
      }
    }

    const course = await prisma.course.update({
      where: { id: params.id },
      data: {
        ...(title !== undefined && { title }),
        ...(slug !== undefined && { slug }),
        ...(description !== undefined && { description }),
        ...(thumbnail !== undefined && { thumbnail }),
        ...(checkoutUrl !== undefined && { checkoutUrl }),
        ...(externalProductId !== undefined && {
          externalProductId: externalProductId?.trim() || null,
        }),
        ...(isPublished !== undefined && { isPublished: Boolean(isPublished) }),
        ...(showInStore !== undefined && { showInStore: Boolean(showInStore) }),
      },
    });

    return NextResponse.json({ course });
  } catch (error) {
    console.error("PUT /api/courses/[id] error:", error);
    return NextResponse.json(
      { error: "Erro ao atualizar curso" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();

    await prisma.course.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/courses/[id] error:", error);
    return NextResponse.json(
      { error: "Erro ao excluir curso" },
      { status: 500 }
    );
  }
}
