import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canEditCourse, requireStaff } from "@/lib/auth";
import { collaboratorCanActOnCourse } from "@/lib/collaborator";

export async function POST(_request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
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

    const allowed =
      staff.role === "COLLABORATOR"
        ? await collaboratorCanActOnCourse(staff.id, post.courseId, [
            "MANAGE_COMMUNITY",
          ])
        : await canEditCourse(staff, post.courseId);
    if (!allowed) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
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
      msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}
