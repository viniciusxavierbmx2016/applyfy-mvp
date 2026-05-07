import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase-route";
import { getCurrentUser } from "@/lib/auth";
import { logAudit, getRequestMeta } from "@/lib/audit";
import { mfaUnenrollSchema, validateBody } from "@/lib/validations";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const raw = await req.json().catch(() => ({}));
  const v = validateBody(mfaUnenrollSchema, raw);
  if (!v.success) return v.error;
  const { factorId } = v.data;

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
