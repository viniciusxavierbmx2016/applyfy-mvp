import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: { code: string } }
) {
  try {
    const code = params.code.trim().toUpperCase();
    if (!code) {
      return NextResponse.json({ valid: false }, { status: 400 });
    }

    const cert = await prisma.certificate.findUnique({
      where: { code },
      include: {
        user: { select: { name: true } },
        course: { select: { title: true } },
      },
    });

    if (!cert) {
      return NextResponse.json({ valid: false });
    }

    return NextResponse.json({
      valid: true,
      code: cert.code,
      studentName: cert.user.name,
      courseTitle: cert.course.title,
      issuedAt: cert.issuedAt,
    });
  } catch (error) {
    console.error("GET /api/verify/[code] error:", error);
    return NextResponse.json({ valid: false }, { status: 500 });
  }
}
