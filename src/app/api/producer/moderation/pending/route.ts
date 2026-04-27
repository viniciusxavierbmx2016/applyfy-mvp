import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff, getStaffCourseIds } from "@/lib/auth";
import { resolveStaffWorkspace } from "@/lib/workspace";

export async function GET(request: Request) {
  try {
    const staff = await requireStaff();
    const { workspace, scoped } = await resolveStaffWorkspace(staff);
    const workspaceId = scoped && workspace ? workspace.id : null;

    if (staff.role !== "ADMIN" && !workspaceId) {
      return NextResponse.json({ items: [], total: 0 });
    }

    const collabScope = await getStaffCourseIds(staff);
    const workspaceCourseIds = workspaceId
      ? (
          await prisma.course.findMany({
            where: { workspaceId },
            select: { id: true },
          })
        ).map((c) => c.id)
      : null;
    const scopedCourseIds =
      collabScope !== null
        ? workspaceCourseIds
          ? collabScope.filter((id) => workspaceCourseIds.includes(id))
          : collabScope
        : workspaceCourseIds;

    const { searchParams } = new URL(request.url);
    const typeFilter = searchParams.get("type");
    const courseIdFilter = searchParams.get("courseId");

    const courseWhere = courseIdFilter
      ? { id: courseIdFilter, ...(scopedCourseIds ? { id: { in: scopedCourseIds } } : {}) }
      : scopedCourseIds
        ? { id: { in: scopedCourseIds } }
        : workspaceId
          ? { workspaceId }
          : undefined;

    const courseIds = courseWhere
      ? (await prisma.course.findMany({ where: courseWhere, select: { id: true } })).map((c) => c.id)
      : null;

    const items: Array<Record<string, unknown>> = [];

    if (!typeFilter || typeFilter === "lesson_comments") {
      const lessonComments = await prisma.lessonComment.findMany({
        where: {
          status: "PENDING",
          ...(courseIds
            ? { lesson: { module: { courseId: { in: courseIds } } } }
            : {}),
        },
        orderBy: { createdAt: "asc" },
        include: {
          user: { select: { id: true, name: true, email: true, avatarUrl: true } },
          lesson: {
            select: {
              id: true,
              title: true,
              module: {
                select: {
                  course: { select: { id: true, title: true, slug: true } },
                },
              },
            },
          },
        },
      });
      for (const lc of lessonComments) {
        items.push({
          id: lc.id,
          type: "lesson_comment",
          content: lc.content,
          createdAt: lc.createdAt,
          user: lc.user,
          lesson: { id: lc.lesson.id, title: lc.lesson.title },
          course: lc.lesson.module.course,
        });
      }
    }

    if (!typeFilter || typeFilter === "community_posts") {
      const posts = await prisma.post.findMany({
        where: {
          status: "PENDING",
          ...(courseIds ? { courseId: { in: courseIds } } : {}),
        },
        orderBy: { createdAt: "asc" },
        include: {
          user: { select: { id: true, name: true, email: true, avatarUrl: true } },
          course: { select: { id: true, title: true, slug: true } },
          group: { select: { id: true, name: true } },
        },
      });
      for (const p of posts) {
        items.push({
          id: p.id,
          type: "community_post",
          content: p.content,
          createdAt: p.createdAt,
          user: p.user,
          course: p.course,
          group: p.group,
        });
      }
    }

    if (!typeFilter || typeFilter === "community_comments") {
      const comments = await prisma.comment.findMany({
        where: {
          status: "PENDING",
          ...(courseIds ? { post: { courseId: { in: courseIds } } } : {}),
        },
        orderBy: { createdAt: "asc" },
        include: {
          user: { select: { id: true, name: true, email: true, avatarUrl: true } },
          post: {
            select: {
              id: true,
              content: true,
              course: { select: { id: true, title: true, slug: true } },
            },
          },
        },
      });
      for (const c of comments) {
        items.push({
          id: c.id,
          type: "community_comment",
          content: c.content,
          createdAt: c.createdAt,
          user: c.user,
          post: { id: c.post.id, content: c.post.content.slice(0, 100) },
          course: c.post.course,
        });
      }
    }

    items.sort((a, b) => {
      const da = new Date(a.createdAt as string).getTime();
      const db = new Date(b.createdAt as string).getTime();
      return da - db;
    });

    return NextResponse.json({ items, total: items.length });
  } catch (error) {
    console.error("GET /api/producer/moderation/pending error:", error);
    const msg = error instanceof Error ? error.message : "";
    const status = msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}
