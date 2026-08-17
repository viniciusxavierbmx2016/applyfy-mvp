import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase-route";
import { getCurrentUser } from "@/lib/auth";
import { hasStaffPanelAccess } from "@/lib/staff-access";
import { logAudit, getRequestMeta } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    /* 9.109 — o gate era `role !== "ADMIN" && role !== "PRODUCER"`. Como o
       colaborador mantém `role = "STUDENT"` desde o C5, ele **não conseguia
       habilitar segundo fator** — e o efeito era perverso: quem tem
       MANAGE_STUDENTS exporta lista de alunos com e-mail e telefone e não podia
       proteger a própria conta. A conta que mais vale atacar era justamente a
       que não podia se defender.

       ⚠️ A tela `/producer/settings/security` já aparecia no menu dele sem gate
       (`settings/layout.tsx:75`): via "Ativar 2FA", clicava, e levava 401. A
       interface prometia e o servidor negava.

       ⚠️ O aluno puro segue de fora, e é decisão técnica, não de conveniência:
       ele autentica por `WorkspaceCredential` (scrypt), não pelo Supabase Auth
       — não há fator a que amarrar. Incluí-lo é construir um SEGUNDO mecanismo
       de MFA, com recuperação e suporte próprios. Item de frente, não este. */
    if (!(await hasStaffPanelAccess(user))) {
      return NextResponse.json(
        { error: "Apenas quem acessa o painel pode ativar a verificação em duas etapas." },
        { status: 403 }
      );
    }

    const supabase = await createRouteHandlerClient();

    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "Members Club Auth",
    });

    if (error) {
      console.error("[MFA] Enroll error:", error.message);
      return NextResponse.json(
        { error: "Erro ao configurar 2FA" },
        { status: 500 }
      );
    }

    await logAudit({
      userId: user.id,
      action: "mfa_enroll",
      target: data.id,
      ...getRequestMeta(req),
    });

    return NextResponse.json({
      factorId: data.id,
      qrCode: data.totp.qr_code,
      secret: data.totp.secret,
      uri: data.totp.uri,
    });
  } catch (error) {
    console.error("[MFA_ENROLL]", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
