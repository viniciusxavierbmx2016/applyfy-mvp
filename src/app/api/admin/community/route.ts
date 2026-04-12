import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("courseId");

    const posts = await prisma.post.findMany({
      where: courseId ? { courseId } : {},
      orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
      include: {
        user: { select: { id: true, name: true, avatarUrl: true, role: true } },
        course: { select: { id: true, title: true, slug: true } },
        _count: { select: { likes: true, comments: true } },
      },
    });

    const courses = await prisma.course.findMany({
      orderBy: { order: "asc" },
      select: { id: true, title: true, slug: true },
    });

    return NextResponse.json({ posts, courses });
  } catch (error) {
    console.error("GET /api/admin/community error:", error);
    const msg = error instanceof Error ? error.message : "";
    const status =
      msg === "Unauthorized" ? 401 : msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}
