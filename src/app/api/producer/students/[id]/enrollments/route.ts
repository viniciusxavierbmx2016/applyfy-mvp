import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff, canManageStudentsOfCourse } from "@/lib/auth";
import type { Role } from "@prisma/client";
import { createNotification } from "@/lib/notifications";

async function assertCanManageCourse(
  staff: { id: string; role: Role },
  courseId: string
) {
  if (!(await canManageStudentsOfCourse(staff, courseId))) {
    throw new Error("Forbidden");
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const staff = await requireStaff();
    const { courseId } = await request.json();
    if (!courseId) {
      return NextResponse.json(
        { error: "courseId obrigatório" },
        { status: 400 }
      );
    }
    await assertCanManageCourse(staff, courseId);

    const existing = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: params.id, courseId } },
    });
    const wasActive = existing?.status === "ACTIVE";

    const enrollment = await prisma.enrollment.upsert({
      where: {
        userId_courseId: { userId: params.id, courseId },
      },
      create: { userId: params.id, courseId, status: "ACTIVE" },
      update: { status: "ACTIVE" },
      include: {
        course: { select: { id: true, title: true, slug: true } },
      },
    });

    if (!wasActive) {
      await createNotification({
        userId: params.id,
        type: "ENROLLMENT",
        message: `Você foi matriculado no curso ${enrollment.course.title}`,
        link: `/course/${enrollment.course.slug}`,
      });
    }

    return NextResponse.json({ enrollment });
  } catch (error) {
    console.error("POST enrollments error:", error);
    const msg = error instanceof Error ? error.message : "";
    const status =
      msg === "Unauthorized" ? 401 : msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const staff = await requireStaff();
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("courseId");
    if (!courseId) {
      return NextResponse.json(
        { error: "courseId obrigatório" },
        { status: 400 }
      );
    }
    await assertCanManageCourse(staff, courseId);

    await prisma.enrollment.deleteMany({
      where: { userId: params.id, courseId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE enrollments error:", error);
    const msg = error instanceof Error ? error.message : "";
    const status =
      msg === "Unauthorized" ? 401 : msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}
