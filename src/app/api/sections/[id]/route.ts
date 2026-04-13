import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canEditCourse, requireStaff } from "@/lib/auth";

async function authorize(sectionId: string) {
  const staff = await requireStaff();
  const section = await prisma.section.findUnique({
    where: { id: sectionId },
    select: { courseId: true },
  });
  if (!section) return { error: "Seção não encontrada", status: 404 as const };
  if (!(await canEditCourse(staff, section.courseId))) {
    return { error: "Forbidden", status: 403 as const };
  }
  return { ok: true as const, courseId: section.courseId };
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const check = await authorize(params.id);
    if ("error" in check) {
      return NextResponse.json({ error: check.error }, { status: check.status });
    }
    const { title } = await request.json();
    const section = await prisma.section.update({
      where: { id: params.id },
      data: { ...(title !== undefined && { title: String(title).trim() }) },
    });
    return NextResponse.json({ section });
  } catch (error) {
    console.error("PUT section error:", error);
    const msg = error instanceof Error ? error.message : "";
    const status =
      msg === "Unauthorized" ? 401 : msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const check = await authorize(params.id);
    if ("error" in check) {
      return NextResponse.json({ error: check.error }, { status: check.status });
    }
    // Detach modules (onDelete SetNull does this at FK level, but explicit for clarity)
    await prisma.module.updateMany({
      where: { sectionId: params.id },
      data: { sectionId: null },
    });
    await prisma.section.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE section error:", error);
    const msg = error instanceof Error ? error.message : "";
    const status =
      msg === "Unauthorized" ? 401 : msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}
