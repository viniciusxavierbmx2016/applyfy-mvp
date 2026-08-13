import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { MEMBER_AREA_PERMISSION } from "@/lib/collaborator";

// "Qual workspace eu posso abrir como MEMBRO pelo meu vínculo?" — uma pergunta,
// uma rota, uma resposta.
//
// ⚠️ Deliberadamente NÃO é um parâmetro novo em /api/workspaces. Aquela rota
// alimenta SETE telas (o switcher do painel, a gestão de workspaces, o contato
// de suporte e as CINCO telas de credencial de pagamento, via
// useActiveWorkspace) e todas assumem "workspaces que eu POSSUO". Devolver um
// workspace alheio ali faria a tela da Kiwify montar a URL de webhook do
// workspace de outra pessoa — e o switcher do painel passaria a oferecer uma
// troca que o resolver ignora (a fatia (a) rejeitada no 9.75). Rota separada
// custa 20 linhas e não tem nenhum desses efeitos.
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ workspace: null }, { status: 401 });
    }

    const collab = await prisma.collaborator.findFirst({
      where: {
        userId: user.id,
        status: "ACCEPTED",
        permissions: { has: MEMBER_AREA_PERMISSION },
      },
      // `orderBy` explícito: hoje ninguém colabora em mais de um workspace
      // (medido 13/08), mas findFirst sem ordem é indeterminado no dia em que
      // alguém colaborar — o mesmo cheiro anotado no 9.74.
      orderBy: { invitedAt: "asc" },
      select: {
        workspace: { select: { slug: true, name: true, isActive: true } },
      },
    });

    const ws = collab?.workspace;
    return NextResponse.json({
      workspace: ws && ws.isActive ? { slug: ws.slug, name: ws.name } : null,
    });
  } catch (error) {
    console.error("GET /api/me/member-workspace error:", error);
    // Cosmético (só acende um link): falhar em silêncio é melhor que derrubar
    // a sidebar inteira.
    return NextResponse.json({ workspace: null });
  }
}
