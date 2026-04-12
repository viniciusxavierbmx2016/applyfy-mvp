import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();
    const { courseId } = await request.json();
    if (!courseId) {
      return NextResponse.json(
        { error: "courseId obrigatório" },
        { status: 400 }
      );
    }

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
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("courseId");
    if (!courseId) {
      return NextResponse.json(
        { error: "courseId obrigatório" },
        { status: 400 }
      );
    }

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
