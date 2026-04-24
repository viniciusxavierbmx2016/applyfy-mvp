import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { hasWorkspaceAccess } from "@/lib/workspace-access";

export async function GET(
  _request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const workspace = await prisma.workspace.findUnique({
      where: { slug: params.slug },
      select: { id: true, isActive: true },
    });

    if (!workspace || !workspace.isActive) {
      return NextResponse.json({ error: "Workspace não encontrado" }, { status: 404 });
    }

    if (user.role === "STUDENT") {
      const allowed = await hasWorkspaceAccess(user.id, workspace.id);
      if (!allowed) {
        return NextResponse.json({ error: "Sem acesso" }, { status: 403 });
      }
    }

    const allLives = await prisma.live.findMany({
      where: {
        workspaceId: workspace.id,
        status: { in: ["SCHEDULED", "LIVE", "ENDED"] },
      },
      orderBy: [
        { status: "asc" },
        { scheduledAt: "desc" },
      ],
      include: {
        course: { select: { id: true, title: true } },
      },
    });

    let lives = allLives;

    if (user.role === "STUDENT") {
      const courseOnlyLives = allLives.filter((l) => l.visibility === "COURSE_ONLY" && l.courseId);
      if (courseOnlyLives.length > 0) {
        const courseIds = Array.from(new Set(courseOnlyLives.map((l) => l.courseId!)));
        const enrollments = await prisma.enrollment.findMany({
          where: {
            userId: user.id,
            courseId: { in: courseIds },
            status: "ACTIVE",
          },
          select: { courseId: true },
        });
        const enrolledCourseIds = new Set(enrollments.map((e) => e.courseId));

        lives = allLives.filter((l) => {
          if (l.visibility !== "COURSE_ONLY") return true;
          return l.courseId ? enrolledCourseIds.has(l.courseId) : false;
        });
      }
    }

    return NextResponse.json({ lives });
  } catch (error) {
    console.error("GET /api/w/[slug]/lives error:", error);
    return NextResponse.json({ error: "Erro" }, { status: 500 });
  }
}
