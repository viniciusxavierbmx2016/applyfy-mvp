import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canEditCourse, requireStaff } from "@/lib/auth";

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const staff = await requireStaff();

    const post = await prisma.post.findUnique({
      where: { id: params.id },
      select: { id: true, pinned: true, courseId: true },
    });
    if (!post) {
      return NextResponse.json(
        { error: "Post não encontrado" },
        { status: 404 }
      );
    }

    if (!(await canEditCourse(staff, post.courseId))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updated = await prisma.post.update({
      where: { id: params.id },
      data: { pinned: !post.pinned },
    });

    return NextResponse.json({ success: true, pinned: updated.pinned });
  } catch (error) {
    console.error("POST pin error:", error);
    const msg = error instanceof Error ? error.message : "";
    const status =
      msg === "Unauthorized" ? 401 : msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}
