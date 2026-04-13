import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canEditCourse, requireStaff } from "@/lib/auth";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string; enrollmentId: string } }
) {
  try {
    const staff = await requireStaff();
    if (!(await canEditCourse(staff, params.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: { id: params.enrollmentId },
      select: { courseId: true, status: true },
    });
    if (!enrollment || enrollment.courseId !== params.id) {
      return NextResponse.json(
        { error: "Matrícula não encontrada" },
        { status: 404 }
      );
    }

    const body = await request.json().catch(() => ({}));
    if (!("expiresAt" in body)) {
      return NextResponse.json(
        { error: "Campo expiresAt obrigatório" },
        { status: 400 }
      );
    }

    let expiresAt: Date | null = null;
    if (body.expiresAt !== null) {
      const d = new Date(body.expiresAt);
      if (isNaN(d.getTime())) {
        return NextResponse.json(
          { error: "expiresAt inválido" },
          { status: 400 }
        );
      }
      expiresAt = d;
    }

    const updated = await prisma.enrollment.update({
      where: { id: params.enrollmentId },
      data: {
        expiresAt,
        ...(enrollment.status === "CANCELLED" ? { status: "ACTIVE" } : {}),
      },
      select: { id: true, expiresAt: true, status: true },
    });

    return NextResponse.json({ enrollment: updated });
  } catch (error) {
    console.error("PATCH enrollment error:", error);
    const msg = error instanceof Error ? error.message : "";
    const status =
      msg === "Unauthorized" ? 401 : msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string; enrollmentId: string } }
) {
  try {
    const staff = await requireStaff();
    if (!(await canEditCourse(staff, params.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: { id: params.enrollmentId },
      select: { courseId: true },
    });
    if (!enrollment || enrollment.courseId !== params.id) {
      return NextResponse.json(
        { error: "Matrícula não encontrada" },
        { status: 404 }
      );
    }

    await prisma.enrollment.update({
      where: { id: params.enrollmentId },
      data: { status: "CANCELLED" },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE enrollment error:", error);
    const msg = error instanceof Error ? error.message : "";
    const status =
      msg === "Unauthorized" ? 401 : msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}
