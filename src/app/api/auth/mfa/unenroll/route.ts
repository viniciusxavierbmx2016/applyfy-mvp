import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase-route";
import { getCurrentUser } from "@/lib/auth";
import { logAudit, getRequestMeta } from "@/lib/audit";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { factorId } = await req.json().catch(() => ({}));

  if (!factorId) {
    return NextResponse.json(
      { error: "Factor ID obrigatório" },
      { status: 400 }
    );
  }

  const supabase = await createRouteHandlerClient();

  const { error } = await supabase.auth.mfa.unenroll({ factorId });

  if (error) {
    console.error("[MFA] Unenroll error:", error.message);
    return NextResponse.json(
      { error: "Erro ao desativar 2FA" },
      { status: 500 }
    );
  }

  await logAudit({
    userId: user.id,
    action: "mfa_disabled",
    target: factorId,
    ...getRequestMeta(req),
  });

  return NextResponse.json({ unenrolled: true });
}
