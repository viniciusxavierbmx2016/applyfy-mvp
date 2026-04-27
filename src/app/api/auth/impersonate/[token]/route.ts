import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase-admin";

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

    const supabase = createAdminClient();
    const redirectTo = `${baseUrl}/producer`;

    const { data, error } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: impToken.user.email,
      options: { redirectTo },
    });

    if (error || !data?.properties?.action_link) {
      console.error("[IMPERSONATE] Supabase generateLink error:", error);
      return errorRedirect("Erro ao autenticar");
    }

    console.log(
      `[IMPERSONATE] Admin ${impToken.admin.email} → ${impToken.user.email} (token consumed)`
    );

    return NextResponse.redirect(data.properties.action_link);
  } catch (error) {
    console.error("[IMPERSONATE] callback error:", error);
    return errorRedirect("Erro interno");
  }
}
