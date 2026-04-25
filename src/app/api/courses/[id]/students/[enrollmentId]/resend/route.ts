import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canEditCourse, requireStaff } from "@/lib/auth";
import { sendWorkspaceAccessEmail } from "@/lib/webhook-helpers";
import { sendEmail } from "@/lib/email";
import { studentAccessGranted } from "@/lib/email-templates";

export async function POST(
  request: Request,
  { params }: { params: { id: string; enrollmentId: string } }
) {
  try {
    const staff = await requireStaff();
    if (!(await canEditCourse(staff, params.id))) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: { id: params.enrollmentId },
      include: {
        user: { select: { email: true, name: true } },
        course: {
          select: {
            id: true,
            title: true,
            workspace: { select: { slug: true, name: true } },
          },
        },
      },
    });
    if (!enrollment || enrollment.course.id !== params.id) {
      return NextResponse.json(
        { error: "Matrícula não encontrada" },
        { status: 404 }
      );
    }

    const baseUrl = new URL(request.url).origin;
    const accessLink = await sendWorkspaceAccessEmail(
      enrollment.user.email,
      enrollment.course.workspace.slug,
      baseUrl
    );

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || baseUrl;
    const loginUrl = `${appUrl}/w/${enrollment.course.workspace.slug}/login`;
    const template = studentAccessGranted(
      enrollment.user.name || enrollment.user.email,
      enrollment.course.title,
      enrollment.course.workspace.name,
      loginUrl
    );
    await sendEmail({
      to: { email: enrollment.user.email, name: enrollment.user.name || undefined },
      ...template,
    });

    return NextResponse.json({ success: true, accessLink });
  } catch (error) {
    console.error("POST resend access error:", error);
    const msg = error instanceof Error ? error.message : "";
    const status =
      msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}
