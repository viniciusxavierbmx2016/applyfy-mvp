import { prisma } from "@/lib/prisma";
import { isEnrollmentActive } from "@/lib/auth";

/* Acesso de LEITURA a uma aula pelo lado do aluno.
   Molde: `lib/ticket-access.ts` — o predicado mora num módulo próprio e as
   rotas o importam, em vez de cada uma repetir o seu.

   Este predicado NASCEU inline em `api/lessons/[id]/materials/route.ts:35-48`
   e foi extraído sem alterar uma vírgula da decisão: mesmos ramos, mesma ordem,
   mesmos códigos. A rota de download precisa exatamente do mesmo julgamento —
   duas cópias divergiriam, e é sempre a segunda que fica para trás.

   ⚠️ CEGO AO COLABORADOR HÍBRIDO, de propósito neste passo: decide por
   `user.role`, então colaborador (que desde o C5 mantém `role=STUDENT`) cai no
   ramo da matrícula e leva 403. É o comportamento que já existia — item
   registrado na família do 9.88, a ser corrigido em item próprio, não aqui.
   Extrair o predicado não muda quem passa; só faz a cegueira existir num lugar
   só, onde o conserto será de uma linha. */
export type LessonAccess =
  | { ok: true; courseId: string }
  | { ok: false; status: 403 | 404 };

export async function checkLessonAccess(
  user: { id: string; role: string },
  lessonId: string
): Promise<LessonAccess> {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: {
      id: true,
      module: {
        select: {
          course: {
            select: {
              id: true,
              ownerId: true,
              workspace: { select: { ownerId: true } },
            },
          },
        },
      },
    },
  });

  if (!lesson) return { ok: false, status: 404 };

  const course = lesson.module.course;
  const isOwner =
    user.role === "ADMIN" ||
    (user.role === "PRODUCER" &&
      (course.ownerId === user.id || course.workspace.ownerId === user.id));

  if (!isOwner) {
    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: user.id, courseId: course.id } },
    });
    if (!isEnrollmentActive(enrollment)) return { ok: false, status: 403 };
  }

  return { ok: true, courseId: course.id };
}
