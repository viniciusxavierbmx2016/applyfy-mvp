import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, isCourseStaffOwner } from "@/lib/auth";

export async function GET(_request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    /* 9.69 — o gate era `isStaff(user)`, role GLOBAL: qualquer PRODUCER ou
       COLLABORATOR **de qualquer workspace** pulava o aceite de termos. Um
       produtor do workspace B, matriculado aqui como aluno comum, entrava no
       curso sem aceitar nada. O próprio `isStaff` avisa disso em `auth.ts:197`
       e manda usar `isCourseStaffOwner` para decisão dentro de um curso.

       ⚠️ A busca do curso subiu para ANTES do gate — o novo predicado precisa
       do `ownerId`/`workspaceId`, que o `select` antigo não trazia. Nenhum outro
       ramo muda: o 404 de curso inexistente passou a vir primeiro, o que é
       mais correto (antes, staff recebia `required: false` para curso que nem
       existe). Colaborador sem matrícula continua resolvido logo abaixo, pelo
       `if (!enrollment) → required: false`. */
    const course = await prisma.course.findUnique({
      where: { id: params.id },
      select: {
        termsContent: true,
        termsFileUrl: true,
        termsUpdatedAt: true,
        ownerId: true,
        workspace: { select: { ownerId: true } },
      },
    });
    if (!course) {
      return NextResponse.json({ error: "Curso não encontrado" }, { status: 404 });
    }

    if (isCourseStaffOwner(user, course)) {
      return NextResponse.json({ required: false });
    }

    if (!course.termsContent && !course.termsFileUrl) {
      return NextResponse.json({ required: false });
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: user.id, courseId: params.id } },
      select: { termsAcceptedAt: true },
    });
    if (!enrollment) {
      return NextResponse.json({ required: false });
    }

    const termsPayload = {
      termsContent: course.termsContent,
      termsFileUrl: course.termsFileUrl,
    };

    if (!enrollment.termsAcceptedAt) {
      return NextResponse.json({ required: true, ...termsPayload });
    }

    if (
      course.termsUpdatedAt &&
      enrollment.termsAcceptedAt < course.termsUpdatedAt
    ) {
      return NextResponse.json({ required: true, ...termsPayload });
    }

    return NextResponse.json({ required: false });
  } catch (error) {
    console.error("GET /api/courses/[id]/terms-status error:", error);
    return NextResponse.json({ error: "Erro ao verificar termos" }, { status: 500 });
  }
}
