import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/* 9.23 — a corrida que derrubava a comunidade recém-aberta.

   O helper era check-then-create sem proteção. Num curso sem grupo, a página da
   comunidade dispara DUAS rotas em paralelo (`GET /groups` + `GET /posts`), as
   duas passam por aqui, as duas veem "não existe", as duas criam — e a segunda
   viola a unique `courseId_slug` (P2002) e devolvia 500 ao aluno. Não é
   teórico: reproduzido no staging na PRIMEIRA tentativa com duas requisições
   HTTP simultâneas (20/08), com o P2002 no log. Um clique basta — não precisa
   de dois usuários.

   ⚠️ POR QUE NÃO `upsert`: provado empiricamente ANTES deste fix (log de query,
   20/08) que o upsert desta forma NÃO vira INSERT ON CONFLICT no Prisma 5.22 —
   sai BEGIN → SELECT → … → COMMIT, ou seja, EMULADO: o mesmo check-then-write
   da corrida, com outra roupa. O caminho é o create com catch de P2002: o
   banco é quem decide quem venceu, e a perdedora ADOTA o grupo do vencedor.

   ⚠️ A re-busca é pela UNIQUE que conflitou (`courseId_slug`), não por
   `isDefault`: o P2002 PROVA que essa linha existe, então o retorno é total —
   inclusive no caso teórico de um grupo manual com slug "geral" (aí devolve o
   grupo que existe em vez do 500 permanente que o código antigo daria). */
export async function ensureDefaultGroup(courseId: string) {
  const existing = await prisma.communityGroup.findFirst({
    where: { courseId, isDefault: true },
  });
  if (existing) return existing;

  try {
    return await prisma.communityGroup.create({
      data: {
        name: "Geral",
        slug: "geral",
        courseId,
        isDefault: true,
        permission: "READ_WRITE",
        order: 0,
      },
    });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      const vencedor = await prisma.communityGroup.findFirst({
        where: { courseId, slug: "geral" },
      });
      if (vencedor) return vencedor;
    }
    throw e;
  }
}
