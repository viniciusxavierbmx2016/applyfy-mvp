import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase-admin";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function GET(
  request: Request,
  { params }: { params: { token: string } }
) {
  const baseUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    new URL(request.url).origin;

  const errorRedirect = (msg: string) =>
    NextResponse.redirect(`${baseUrl}/admin?error=${encodeURIComponent(msg)}`);

  try {
    const impToken = await prisma.impersonateToken.findUnique({
      where: { token: params.token },
      include: {
        user: { select: { email: true } },
        admin: { select: { email: true } },
      },
    });

    if (!impToken) {
      return errorRedirect("Token inválido");
    }

    if (impToken.used) {
      return errorRedirect("Token já utilizado");
    }

    if (impToken.expiresAt < new Date()) {
      await prisma.impersonateToken.delete({ where: { id: impToken.id } });
      return errorRedirect("Token expirado");
    }

    await prisma.impersonateToken.update({
      where: { id: impToken.id },
      data: { used: true },
    });

    const supabaseAdmin = createAdminClient();
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: impToken.user.email,
      options: { redirectTo: `${baseUrl}/producer` },
    });

    if (error || !data?.properties?.action_link) {
      console.error("[IMPERSONATE] generateLink error:", error);
      return errorRedirect("Erro ao autenticar");
    }

    const actionUrl = new URL(data.properties.action_link);
    const tokenHash = actionUrl.searchParams.get("token");
    const type = actionUrl.searchParams.get("type");

    if (!tokenHash || type !== "magiclink") {
      console.error("[IMPERSONATE] invalid action_link format:", data.properties.action_link);
      return errorRedirect("Erro ao autenticar");
    }

    const supabase = await createServerSupabaseClient();
    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: "magiclink",
    });

    if (verifyError) {
      console.error("[IMPERSONATE] verifyOtp error:", verifyError);
      return errorRedirect("Erro ao verificar sessão");
    }

    console.log(
      `[IMPERSONATE] Admin ${impToken.admin.email} → ${impToken.user.email} (session set)`
    );

    return NextResponse.redirect(`${baseUrl}/producer`);
  } catch (error) {
    console.error("[IMPERSONATE] callback error:", error);
    return errorRedirect("Erro interno");
  }
}
