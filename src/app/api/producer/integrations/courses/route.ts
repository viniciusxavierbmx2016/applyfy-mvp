import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";

export async function GET() {
  try {
    const staff = await requireStaff();

    const courses = await prisma.course.findMany({
      where: staff.role === "PRODUCER" ? { ownerId: staff.id } : undefined,
      orderBy: { order: "asc" },
      select: {
        id: true,
        title: true,
        slug: true,
        externalProductId: true,
        isPublished: true,
      },
    });

    return NextResponse.json({ courses });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    const status =
      msg === "Unauthorized" ? 401 : msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}
