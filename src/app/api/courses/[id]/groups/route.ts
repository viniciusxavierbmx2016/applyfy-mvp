import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { collaboratorCanActOnCourse } from "@/lib/collaborator";
import { ensureDefaultGroup } from "@/lib/community-helpers";

export async function GET(_request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // O parâmetro aceita o id OU o slug do curso.
    //
    // Motivo: a comunidade do aluno só tem o slug na URL, e a única forma de
    // virar id era buscar o feed em /api/posts?courseSlug=... ANTES — feed que
    // vinha sem grupo e era rebuscado logo depois com o grupo padrão. Era essa
    // busca extra que fazia o feed piscar em toda abertura. Aceitando o slug
    // aqui, os grupos chegam primeiro e o feed é buscado uma vez só, já certo.
    //
    // Não afrouxa nada: o portão abaixo (comunidade ativa, dono/colaborador ou
    // matrícula ativa) é o mesmo para as duas formas de achar o curso. E `id`
    // é cuid enquanto `slug` é kebab-case, então um não se passa pelo outro.
    const course = await prisma.course.findFirst({
      where: { OR: [{ id: params.id }, { slug: params.id }] },
      select: {
        id: true,
        communityEnabled: true,
        ownerId: true,
        workspace: { select: { ownerId: true } },
      },
    });

    if (!course) {
      return NextResponse.json(
        { error: "Curso não encontrado" },
        { status: 404 }
      );
    }

    if (!course.communityEnabled) {
      return NextResponse.json(
        { error: "Comunidade desativada" },
        { status: 403 }
      );
    }

    const isStaff =
      user.role === "ADMIN" ||
      (user.role === "PRODUCER" &&
        (course.ownerId === user.id || course.workspace.ownerId === user.id)) ||
      (await collaboratorCanActOnCourse(user.id, course.id, ["REPLY_COMMENTS", "MANAGE_COMMUNITY"]));

    if (!isStaff) {
      const enrollment = await prisma.enrollment.findUnique({
        where: {
          userId_courseId: { userId: user.id, courseId: course.id },
        },
      });
      if (!enrollment || enrollment.status !== "ACTIVE") {
        return NextResponse.json(
          { error: "Não matriculado neste curso" },
          { status: 403 }
        );
      }
    }

    await ensureDefaultGroup(course.id);

    const groups = await prisma.communityGroup.findMany({
      where: { courseId: course.id },
      orderBy: { order: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        isDefault: true,
        permission: true,
        order: true,
        _count: { select: { posts: true } },
      },
    });

    return NextResponse.json({ groups });
  } catch (error) {
    console.error("GET /api/courses/[id]/groups error:", error);
    return NextResponse.json(
      { error: "Erro ao buscar grupos" },
      { status: 500 }
    );
  }
}
