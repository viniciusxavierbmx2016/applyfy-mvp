import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase-route";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { factorId, code } = await req.json().catch(() => ({}));

  if (!factorId || !code) {
    return NextResponse.json(
      { error: "Dados obrigatórios" },
      { status: 400 }
    );
  }

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

  return NextResponse.json({ verified: true });
}
