import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canEditCourse, requireStaff } from "@/lib/auth";
import { sendWorkspaceAccessEmail } from "@/lib/webhook-helpers";

export async function POST(
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
      include: {
        user: { select: { email: true } },
        course: {
          select: { workspace: { select: { slug: true } }, id: true },
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

    return NextResponse.json({ success: true, accessLink });
  } catch (error) {
    console.error("POST resend access error:", error);
    const msg = error instanceof Error ? error.message : "";
    const status =
      msg === "Unauthorized" ? 401 : msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}
