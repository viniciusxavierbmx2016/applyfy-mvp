import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase-route";
import { createAdminClient } from "@/lib/supabase-admin";
import { rateLimit } from "@/lib/rate-limit";
import { resetPasswordSchema, validateBody } from "@/lib/validations";

// Server-side password reset that bypasses the AAL2 requirement.
//
// Why: supabase.auth.updateUser({ password }) called from the browser
// requires AAL2 when the user has any verified TOTP factor. But the
// reset-password flow comes from a recovery link (email click → AAL1) —
// the user can't be expected to do MFA on a password they've forgotten.
//
// Trust model: the user already proved identity by clicking the recovery
// link (Supabase set the AAL1 session for them). We use the service-role
// admin API to set the new password, then sign them out so they re-login
// from scratch (which triggers MFA challenge if applicable).
export async function POST(req: Request) {
  const limited = rateLimit(req);
  if (limited) return limited;

  try {
    const raw = await req.json().catch(() => ({}));
    const v = validateBody(resetPasswordSchema, raw);
    if (!v.success) return v.error;
    const { password } = v.data;

    // Pull the AAL1 session set by the recovery link.
    const supabase = await createRouteHandlerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Sessão inválida ou expirada. Solicite um novo link." },
        { status: 401 }
      );
    }

    const admin = createAdminClient();
    const { error: updateError } = await admin.auth.admin.updateUserById(
      user.id,
      { password }
    );

    if (updateError) {
      console.error(
        "[RESET-PASSWORD] admin update error:",
        updateError.message
      );
      return NextResponse.json(
        { error: "Erro ao redefinir senha" },
        { status: 500 }
      );
    }

    // Force a fresh login (which will trigger MFA again if enabled).
    await supabase.auth.signOut();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(
      "[RESET-PASSWORD] error:",
      err instanceof Error ? err.message : err
    );
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
