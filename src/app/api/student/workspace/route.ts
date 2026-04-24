import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const enrollment = await prisma.enrollment.findFirst({
      where: { userId: user.id, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
      select: {
        course: {
          select: {
            workspace: {
              select: { slug: true, name: true },
            },
          },
        },
      },
    });

    if (!enrollment?.course?.workspace?.slug) {
      return NextResponse.json({ error: "Nenhum workspace encontrado" }, { status: 404 });
    }

    return NextResponse.json({
      slug: enrollment.course.workspace.slug,
      name: enrollment.course.workspace.name,
    });
  } catch (error) {
    console.error("GET /api/student/workspace error:", error);
    return NextResponse.json({ error: "Erro" }, { status: 500 });
  }
}
