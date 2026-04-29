import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase-route";

export async function POST(req: Request) {
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
    return NextResponse.json(
      { error: "Erro na verificação" },
      { status: 500 }
    );
  }

  const { error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code,
  });

  if (error) {
    return NextResponse.json({ error: "Código inválido" }, { status: 400 });
  }

  return NextResponse.json({ verified: true });
}
