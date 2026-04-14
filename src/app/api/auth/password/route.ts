import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

export async function PATCH(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    if (!authUser?.email) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const { currentPassword, newPassword } = await request.json();
    if (
      typeof currentPassword !== "string" ||
      typeof newPassword !== "string"
    ) {
      return NextResponse.json(
        { error: "Dados inválidos" },
        { status: 400 }
      );
    }
    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "A nova senha precisa ter pelo menos 6 caracteres" },
        { status: 400 }
      );
    }

    // Verify current password using an ephemeral client (no cookie writes).
    const verifier = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
    const { error: signInError } = await verifier.auth.signInWithPassword({
      email: authUser.email,
      password: currentPassword,
    });
    if (signInError) {
      return NextResponse.json(
        { error: "Senha atual incorreta" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    const { error: updateError } = await admin.auth.admin.updateUserById(
      authUser.id,
      { password: newPassword }
    );
    if (updateError) {
      return NextResponse.json(
        { error: updateError.message || "Erro ao atualizar senha" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PATCH /api/auth/password error:", error);
    return NextResponse.json(
      { error: "Erro ao alterar senha" },
      { status: 500 }
    );
  }
}
