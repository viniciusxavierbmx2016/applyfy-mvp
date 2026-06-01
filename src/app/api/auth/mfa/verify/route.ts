import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase-route";
import { getCurrentUser } from "@/lib/auth";
import { logAudit, getRequestMeta } from "@/lib/audit";
import { mfaVerifySchema, validateBody } from "@/lib/validations";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const raw = await req.json().catch(() => ({}));
    const v = validateBody(mfaVerifySchema, raw);
    if (!v.success) return v.error;
    const { factorId, code } = v.data;

    const supabase = await createRouteHandlerClient();

    const { data: challenge, error: challengeError } =
      await supabase.auth.mfa.challenge({ factorId });

    if (challengeError) {
      console.error("[MFA] Challenge error:", challengeError.message);
      return NextResponse.json(
        { error: "Erro ao verificar" },
        { status: 500 }
      );
    }

    const { error: verifyError } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code,
    });

    if (verifyError) {
      console.error("[MFA] Verify error:", verifyError.message);
      return NextResponse.json(
        { error: "Código inválido. Tente novamente." },
        { status: 400 }
      );
    }

    await logAudit({
      userId: user.id,
      action: "mfa_activated",
      target: factorId,
      ...getRequestMeta(req),
    });

    return NextResponse.json({ verified: true });
  } catch (error) {
    console.error("[MFA_VERIFY]", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
