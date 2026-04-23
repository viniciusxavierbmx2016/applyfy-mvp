import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff, canManageStudentsOfCourse } from "@/lib/auth";
import type { Role } from "@prisma/client";
import { createNotification } from "@/lib/notifications";
import { sendEmail } from "@/lib/email";
import { studentAccessGranted } from "@/lib/email-templates";
import { processAutomations } from "@/lib/automation-engine";

async function assertCanManageCourse(
  staff: { id: string; role: Role },
  courseId: string
) {
  if (!(await canManageStudentsOfCourse(staff, courseId))) {
    throw new Error("Sem permissão");
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
        course: {
          select: {
            id: true, title: true, slug: true,
            workspace: { select: { id: true, name: true, slug: true } },
          },
        },
        user: { select: { name: true, email: true } },
      },
    });

    if (!wasActive) {
      await createNotification({
        userId: params.id,
        type: "ENROLLMENT",
        message: `Você foi matriculado no curso ${enrollment.course.title}`,
        link: `/course/${enrollment.course.slug}`,
      });

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
      const loginUrl = `${appUrl}/w/${enrollment.course.workspace.slug}/login`;
      const template = studentAccessGranted(
        enrollment.user.name || enrollment.user.email,
        enrollment.course.title,
        enrollment.course.workspace.name,
        loginUrl
      );
      sendEmail({ to: { email: enrollment.user.email, name: enrollment.user.name || undefined }, ...template }).catch(() => {});

      processAutomations({
        type: "STUDENT_ENROLLED",
        workspaceId: enrollment.course.workspace.id,
        courseId,
        userId: params.id,
      }).catch(() => {});
    }

    return NextResponse.json({ enrollment });
  } catch (error) {
    console.error("POST enrollments error:", error);
    const msg = error instanceof Error ? error.message : "";
    const status =
      msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
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
      msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}
