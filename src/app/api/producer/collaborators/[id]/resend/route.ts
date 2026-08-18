import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { requireWorkspaceOwner } from "@/lib/workspace";
import { createAdminClient } from "@/lib/supabase-admin";

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const staff = await requireStaff();
    const c = await prisma.collaborator.findUnique({
      where: { id: params.id },
    });
    if (!c) {
      return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    }
    const gate = await requireWorkspaceOwner(staff, c.workspaceId);
    if (!gate.ok) return gate.response;
    /* 9.83 — esta rota JÁ ERA a reativação, barrada por uma guarda.

       Antes, um convite REVOKED levava 400 "Convite revogado" aqui — e a tela
       não oferecia nenhum outro caminho. O produtor editava as permissões da
       linha revogada, recebia "Colaborador atualizado", e **o acesso continuava
       inexistente**: o PATCH do modal não manda `status`, então o REVOKED ficava.
       O único jeito de reabrir era "Convidar colaborador" e redigitar o mesmo
       e-mail, que cai no POST e reaproveita a linha.

       O que esta rota faz — `status: PENDING`, `invitedAt` novo e um magic link
       fresco — é exatamente reativar. Não foi preciso escrever fluxo nenhum:
       só deixar de recusar.

       ⚠️ CONSENTIMENTO PRESERVADO: volta-se ao estado "convidado", nunca a
       ACCEPTED. O acesso só nasce quando a PESSOA passa pelo
       /invite/[id]/accept. Nenhum caminho do produtor grava ACCEPTED.

       ⚠️ EFEITO QUE EXISTE E NÃO É NOVO: a linha mantém o mesmo `id`, então o
       link antigo (que já esteve na caixa de entrada da pessoa) volta a valer —
       o accept só recusa REVOKED. Isso já acontecia pelo caminho do reconvite,
       que também dá `update` na mesma linha. A tela pede confirmação por causa
       disso. Fugir exigiria apagar e recriar, perdendo o histórico da linha. */

    /* ⚠️ A guarda que PRECISOU nascer junto — a rota tinha UMA, e ela saiu.

       O `update` abaixo é incondicional: aplicado a um colaborador ACCEPTED,
       ele o rebaixa a PENDING e a pessoa **perde o acesso na hora**
       (`collaboratorCanActOnCourse` só conta vínculo ACCEPTED). Isso é
       PRÉ-EXISTENTE — a guarda antiga só olhava REVOKED —, mas ficava coberto
       por acidente: a tela nunca ofereceu o botão para linha ativa. Mergear a
       remoção da única guarda sem pôr esta no lugar deixaria a rota sem
       nenhuma. É a família do 9.64/9.109: conferir a rota irmã que DESLIGA.

       ⚠️ 400, não 403: quem chama TEM permissão (já passou pelo
       requireWorkspaceOwner acima). O que não existe é a operação — reenviar
       convite a quem já aceitou. Confundir estado inválido com falta de
       permissão faria o produtor procurar o problema no lugar errado. */
    if (c.status === "ACCEPTED") {
      return NextResponse.json(
        {
          error:
            "Este colaborador já aceitou o convite. Para retirar o acesso, use Revogar.",
        },
        { status: 400 }
      );
    }

    await prisma.collaborator.update({
      where: { id: c.id },
      data: {
        invitedAt: new Date(),
        status: "PENDING",
        // ⚠️ Sem isto, um revogado que JÁ TINHA ACEITADO voltaria a "pendente"
        // carregando `acceptedAt` de meses atrás — pendente e aceito ao mesmo
        // tempo. Para quem já era PENDING o campo já é null: no-op.
        acceptedAt: null,
      },
    });

    let inviteLink: string | null = null;
    try {
      const supabase = createAdminClient();
      const origin =
        request.headers.get("origin") ||
        process.env.NEXT_PUBLIC_SITE_URL ||
        "";
      const redirectTo = `${origin}/invite/${c.id}?email=${encodeURIComponent(c.email)}`;
      const { data, error } = await supabase.auth.admin.generateLink({
        type: "magiclink",
        email: c.email,
        options: { redirectTo },
      });
      if (!error) inviteLink = data?.properties?.action_link ?? null;
    } catch (e) {
      console.error("resend generateLink failed:", e);
    }

    if (!inviteLink) {
      const origin =
        request.headers.get("origin") ||
        process.env.NEXT_PUBLIC_SITE_URL ||
        "";
      inviteLink = `${origin}/invite/${c.id}?email=${encodeURIComponent(c.email)}`;
    }

    return NextResponse.json({ inviteLink });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro";
    const code = msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status: code });
  }
}
