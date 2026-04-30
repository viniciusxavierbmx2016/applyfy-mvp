import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff, requirePermission } from "@/lib/auth";
import { resolveStaffWorkspace } from "@/lib/workspace";
import { decrypt } from "@/lib/encryption";

export async function GET(_request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const staff = await requireStaff();
    if (staff.role === "COLLABORATOR") {
      await requirePermission(staff, "MANAGE_STUDENTS");
    }

    const { workspace, scoped } = await resolveStaffWorkspace(staff);
    const workspaceId = scoped && workspace ? workspace.id : null;

    if (staff.role !== "ADMIN" && !workspaceId) {
      return NextResponse.json({ error: "Sem workspace" }, { status: 403 });
    }

    const workspaceCourseIds = workspaceId
      ? (
          await prisma.course.findMany({
            where: { workspaceId },
            select: { id: true },
          })
        ).map((c) => c.id)
      : null;

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        document: true,
        avatarUrl: true,
        points: true,
        level: true,
        createdAt: true,
        lastAccessAt: true,
        lastIpAddress: true,
        userTags: {
          select: { tag: { select: { name: true, color: true } } },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Aluno não encontrado" }, { status: 404 });
    }

    const enrollmentWhere = workspaceCourseIds
      ? { userId: user.id, courseId: { in: workspaceCourseIds } }
      : { userId: user.id };

    const enrollments = await prisma.enrollment.findMany({
      where: enrollmentWhere,
      select: {
        id: true,
        status: true,
        expiresAt: true,
        termsAcceptedAt: true,
        createdAt: true,
        course: {
          select: {
            id: true,
            title: true,
            slug: true,
            thumbnail: true,
            modules: {
              select: {
                lessons: { select: { id: true } },
              },
            },
          },
        },
      },
    });

    if (workspaceCourseIds && enrollments.length === 0) {
      return NextResponse.json({ error: "Aluno não pertence a este workspace" }, { status: 404 });
    }

    const courseIds = enrollments.map((e) => e.course.id);

    const [progress, certificates, reactionCounts, postCount, commentCount, lessonCommentCount, recentProgress, recentReactions] =
      await Promise.all([
        prisma.lessonProgress.findMany({
          where: { userId: user.id, completed: true },
          select: { lessonId: true, lesson: { select: { module: { select: { courseId: true } } } } },
        }),
        prisma.certificate.findMany({
          where: { userId: user.id, courseId: { in: courseIds } },
          select: { courseId: true, issuedAt: true, course: { select: { title: true } } },
        }),
        prisma.lessonReaction.groupBy({
          by: ["type"],
          where: { userId: user.id },
          _count: { _all: true },
        }),
        prisma.post.count({ where: { userId: user.id } }),
        prisma.comment.count({ where: { userId: user.id } }),
        prisma.lessonComment.count({ where: { userId: user.id } }),
        prisma.lessonProgress.findMany({
          where: { userId: user.id, completed: true },
          orderBy: { completedAt: "desc" },
          take: 10,
          select: {
            completedAt: true,
            lesson: { select: { title: true, module: { select: { course: { select: { title: true } } } } } },
          },
        }),
        prisma.lessonReaction.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            type: true,
            createdAt: true,
            lesson: { select: { title: true } },
          },
        }),
      ]);

    const accessLogs = await prisma.accessLog.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { ip: true, userAgent: true, path: true, createdAt: true },
    });

    const progressByCourse = new Map<string, number>();
    for (const p of progress) {
      const cid = p.lesson.module.courseId;
      progressByCourse.set(cid, (progressByCourse.get(cid) || 0) + 1);
    }

    const enrollmentsOut = enrollments.map((e) => {
      const totalLessons = e.course.modules.reduce((s, m) => s + m.lessons.length, 0);
      const completed = progressByCourse.get(e.course.id) || 0;
      const pct = totalLessons > 0 ? Math.round((completed / totalLessons) * 100) : 0;
      return {
        id: e.id,
        status: e.status,
        expiresAt: e.expiresAt,
        enrolledAt: e.createdAt,
        termsAcceptedAt: e.termsAcceptedAt,
        course: {
          id: e.course.id,
          title: e.course.title,
          slug: e.course.slug,
          thumbnail: e.course.thumbnail,
        },
        progress: pct,
        lessonsCompleted: completed,
        totalLessons,
      };
    });

    const likesCount = reactionCounts.find((r) => r.type === "LIKE")?._count._all || 0;
    const dislikesCount = reactionCounts.find((r) => r.type === "DISLIKE")?._count._all || 0;

    const recentActivity: { type: string; description: string; date: string }[] = [];

    for (const p of recentProgress) {
      if (p.completedAt) {
        recentActivity.push({
          type: "lesson_completed",
          description: `Concluiu "${p.lesson.title}" em ${p.lesson.module.course.title}`,
          date: p.completedAt.toISOString(),
        });
      }
    }
    for (const r of recentReactions) {
      recentActivity.push({
        type: r.type === "LIKE" ? "like" : "dislike",
        description: `${r.type === "LIKE" ? "Curtiu" : "Não curtiu"} "${r.lesson.title}"`,
        date: r.createdAt.toISOString(),
      });
    }
    recentActivity.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        document: user.document ? decrypt(user.document) : null,
        avatarUrl: user.avatarUrl,
        points: user.points,
        level: user.level,
        createdAt: user.createdAt,
        lastAccessAt: user.lastAccessAt,
        lastIpAddress: user.lastIpAddress,
      },
      tags: user.userTags.map((ut) => ({ name: ut.tag.name, color: ut.tag.color })),
      enrollments: enrollmentsOut,
      stats: {
        totalCourses: enrollments.length,
        activeCourses: enrollments.filter((e) => e.status === "ACTIVE").length,
        totalLessonsCompleted: progress.length,
        totalLikes: likesCount,
        totalDislikes: dislikesCount,
        totalPosts: postCount,
        totalComments: commentCount + lessonCommentCount,
        totalCertificates: certificates.length,
      },
      certificates: certificates.map((c) => ({
        courseName: c.course.title,
        issuedAt: c.issuedAt,
      })),
      recentActivity: recentActivity.slice(0, 15),
      accessLogs,
    });
  } catch (error) {
    console.error("GET /api/producer/students/[id] error:", error);
    const msg = error instanceof Error ? error.message : "";
    const status =
      msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}
