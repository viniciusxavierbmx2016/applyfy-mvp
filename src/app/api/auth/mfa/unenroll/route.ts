import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase-route";
import { getCurrentUser } from "@/lib/auth";
import { logAudit, getRequestMeta } from "@/lib/audit";
import { mfaUnenrollSchema, validateBody } from "@/lib/validations";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const raw = await req.json().catch(() => ({}));
    const v = validateBody(mfaUnenrollSchema, raw);
    if (!v.success) return v.error;
    const { factorId } = v.data;

    const supabase = await createRouteHandlerClient();

    /* 🔴 9.109 — DESLIGAR O 2FA EXIGE O SEGUNDO FATOR.

       Antes, esta rota pedia apenas estar autenticado — e o `enroll` ao lado
       gateava por role. A assimetria era do pior tipo: a rota folgada era a que
       **remove** a proteção. Uma sessão em AAL1 (só senha, roubada por phishing
       ou cookie) desligava o 2FA e seguia livre. Abrir o `enroll` sem fechar
       isto seria entregar mais cadeados com a chave do lado de fora.

       O nível vem do próprio Supabase: `currentLevel` é `aal2` só depois do
       desafio TOTP. Quem tem fator verificado e está em `aal1` é barrado.
       ⚠️ Quem NÃO tem fator verificado passa direto — `nextLevel` também é
       `aal1`, e nesse caso não há o que proteger (é o cancelamento de uma
       inscrição que nunca foi ativada). */
    const { data: aal, error: aalError } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aalError) {
      console.error("[MFA] AAL check error:", aalError.message);
      return NextResponse.json(
        { error: "Não foi possível verificar sua sessão. Entre novamente." },
        { status: 401 }
      );
    }
    if (aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
      // §9: dizer O QUE FAZER, não só negar.
      return NextResponse.json(
        {
          error:
            "Confirme o segundo fator para desativar a verificação em duas etapas. Saia e entre novamente para confirmar.",
          requiresMfa: true,
        },
        { status: 403 }
      );
    }

    const { error } = await supabase.auth.mfa.unenroll({ factorId });

    if (error) {
      /* §9 — o `error` do Supabase aqui é quase sempre situação de CLIENTE
         (fator inexistente, já removido, ou de outra sessão), e devolver 500
         diz "falha nossa" para quem só mandou um id velho. Provado na matriz
         do E3.11: desativar duas vezes seguidas dava 500.
         ⚠️ O detalhe fica no log, nunca na resposta — a mensagem do Supabase
         pode citar estrutura interna. */
      console.error("[MFA] Unenroll error:", error.message);
      const naoEncontrado = /not found|does not exist|invalid/i.test(error.message);
      return NextResponse.json(
        {
          error: naoEncontrado
            ? "Este método de verificação não está mais ativo."
            : "Não foi possível desativar a verificação em duas etapas. Tente novamente.",
        },
        { status: naoEncontrado ? 404 : 502 }
      );
    }

    await logAudit({
      userId: user.id,
      action: "mfa_disabled",
      target: factorId,
      ...getRequestMeta(req),
    });

    return NextResponse.json({ unenrolled: true });
  } catch (error) {
    console.error("[MFA_UNENROLL]", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
