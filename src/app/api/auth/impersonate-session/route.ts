import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase-admin";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: "Token obrigatório" },
        { status: 400 }
      );
    }

    const impToken = await prisma.impersonateToken.findUnique({
      where: { token },
      include: {
        user: { select: { id: true, email: true } },
        admin: { select: { email: true } },
      },
    });

    if (!impToken) {
      return NextResponse.json(
        { error: "Token inválido" },
        { status: 404 }
      );
    }

    if (impToken.used) {
      return NextResponse.json(
        { error: "Token já utilizado" },
        { status: 400 }
      );
    }

    if (impToken.expiresAt < new Date()) {
      await prisma.impersonateToken.delete({ where: { id: impToken.id } });
      return NextResponse.json(
        { error: "Token expirado" },
        { status: 400 }
      );
    }

    await prisma.impersonateToken.update({
      where: { id: impToken.id },
      data: { used: true },
    });

    const supabaseAdmin = createAdminClient();

    const tempPassword = `imp_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    const { error: updateError } =
      await supabaseAdmin.auth.admin.updateUserById(impToken.user.id, {
        password: tempPassword,
      });

    if (updateError) {
      console.error(
        "[IMPERSONATE-SESSION] updateUser error:",
        updateError.message
      );
      return NextResponse.json(
        { error: "Erro ao preparar acesso" },
        { status: 500 }
      );
    }

    const tempClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: signInData, error: signInError } =
      await tempClient.auth.signInWithPassword({
        email: impToken.user.email,
        password: tempPassword,
      });

    if (signInError || !signInData.session) {
      console.error(
        "[IMPERSONATE-SESSION] signIn error:",
        signInError?.message
      );
      return NextResponse.json(
        { error: "Erro ao autenticar" },
        { status: 500 }
      );
    }

    const finalPassword = `locked_${Date.now()}_${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
    await supabaseAdmin.auth.admin.updateUserById(impToken.user.id, {
      password: finalPassword,
    });

    console.log(
      `[IMPERSONATE-SESSION] Success: ${impToken.admin.email} → ${impToken.user.email}`
    );

    return NextResponse.json({
      access_token: signInData.session.access_token,
      refresh_token: signInData.session.refresh_token,
      expires_in: signInData.session.expires_in,
      expires_at: signInData.session.expires_at,
      email: impToken.user.email,
    });
  } catch (err) {
    console.error(
      "[IMPERSONATE-SESSION] Error:",
      err instanceof Error ? err.message : err
    );
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
