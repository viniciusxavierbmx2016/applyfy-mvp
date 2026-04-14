import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff, canEditCourse } from "@/lib/auth";

async function assertCanEditCourse(courseId: string) {
  const staff = await requireStaff();
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, ownerId: true },
  });
  if (!course) return { error: "Curso não encontrado", status: 404 as const };
  if (staff.role === "ADMIN") return { ok: true as const };
  if (staff.role === "PRODUCER" && course.ownerId !== staff.id) {
    return { error: "Forbidden", status: 403 as const };
  }
  if (staff.role === "COLLABORATOR") {
    const ok = await canEditCourse(staff, courseId);
    if (!ok) return { error: "Forbidden", status: 403 as const };
  }
  return { ok: true as const };
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const course = await prisma.course.findUnique({
      where: { id: params.id },
      include: {
        sections: { orderBy: { order: "asc" } },
        modules: {
          orderBy: { order: "asc" },
          include: {
            lessons: { orderBy: { order: "asc" } },
          },
        },
      },
    });

    if (!course) {
      return NextResponse.json(
        { error: "Curso não encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ course });
  } catch (error) {
    console.error("GET /api/courses/[id] error:", error);
    return NextResponse.json(
      { error: "Erro ao buscar curso" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const check = await assertCanEditCourse(params.id);
    if ("error" in check) {
      return NextResponse.json({ error: check.error }, { status: check.status });
    }

    const body = await request.json();
    const {
      title,
      slug,
      description,
      thumbnail,
      bannerUrl,
      checkoutUrl,
      price,
      priceCurrency,
      externalProductId,
      isPublished,
      showInStore,
      certificateEnabled,
      communityEnabled,
      lessonCommentsEnabled,
      reviewsEnabled,
      gamificationEnabled,
      showStudentCount,
      supportEmail,
      supportWhatsapp,
      showLessonSupport,
    } = body;

    if (supportEmail !== undefined && supportEmail !== null && supportEmail !== "") {
      const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(supportEmail).trim());
      if (!emailOk) {
        return NextResponse.json(
          { error: "Email de suporte inválido" },
          { status: 400 }
        );
      }
    }

    if (slug) {
      const existing = await prisma.course.findFirst({
        where: { slug, NOT: { id: params.id } },
      });
      if (existing) {
        return NextResponse.json(
          { error: "Já existe um curso com esse slug" },
          { status: 409 }
        );
      }
    }

    const course = await prisma.course.update({
      where: { id: params.id },
      data: {
        ...(title !== undefined && { title }),
        ...(slug !== undefined && { slug }),
        ...(description !== undefined && { description }),
        ...(thumbnail !== undefined && { thumbnail }),
        ...(bannerUrl !== undefined && { bannerUrl }),
        ...(checkoutUrl !== undefined && { checkoutUrl }),
        ...(price !== undefined && {
          price:
            price === null || price === ""
              ? null
              : typeof price === "number"
                ? price
                : Number(price) || null,
        }),
        ...(priceCurrency !== undefined && {
          priceCurrency: priceCurrency || "BRL",
        }),
        ...(externalProductId !== undefined && {
          externalProductId: externalProductId?.trim() || null,
        }),
        ...(isPublished !== undefined && { isPublished: Boolean(isPublished) }),
        ...(showInStore !== undefined && { showInStore: Boolean(showInStore) }),
        ...(certificateEnabled !== undefined && {
          certificateEnabled: Boolean(certificateEnabled),
        }),
        ...(communityEnabled !== undefined && {
          communityEnabled: Boolean(communityEnabled),
        }),
        ...(lessonCommentsEnabled !== undefined && {
          lessonCommentsEnabled: Boolean(lessonCommentsEnabled),
        }),
        ...(reviewsEnabled !== undefined && {
          reviewsEnabled: Boolean(reviewsEnabled),
        }),
        ...(gamificationEnabled !== undefined && {
          gamificationEnabled: Boolean(gamificationEnabled),
        }),
        ...(showStudentCount !== undefined && {
          showStudentCount: Boolean(showStudentCount),
        }),
        ...(supportEmail !== undefined && {
          supportEmail:
            typeof supportEmail === "string" && supportEmail.trim()
              ? supportEmail.trim()
              : null,
        }),
        ...(supportWhatsapp !== undefined && {
          supportWhatsapp:
            typeof supportWhatsapp === "string" && supportWhatsapp.replace(/\D/g, "")
              ? supportWhatsapp.replace(/\D/g, "")
              : null,
        }),
        ...(showLessonSupport !== undefined && {
          showLessonSupport: Boolean(showLessonSupport),
        }),
      },
    });

    return NextResponse.json({ course });
  } catch (error) {
    console.error("PUT /api/courses/[id] error:", error);
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
    const staff = await requireStaff();
    if (staff.role === "COLLABORATOR") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const check = await assertCanEditCourse(params.id);
    if ("error" in check) {
      return NextResponse.json({ error: check.error }, { status: check.status });
    }

    await prisma.course.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/courses/[id] error:", error);
    const msg = error instanceof Error ? error.message : "";
    const status =
      msg === "Unauthorized" ? 401 : msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}
