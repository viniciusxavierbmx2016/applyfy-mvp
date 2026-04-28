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

  console.log("[IMPERSONATE] Step 0 - Request received:", {
    tokenPrefix: params.token.substring(0, 10),
    baseUrl,
  });

  const errorRedirect = (msg: string) => {
    console.log("[IMPERSONATE] ERROR REDIRECT:", msg);
    return NextResponse.redirect(
      `${baseUrl}/admin?error=${encodeURIComponent(msg)}`
    );
  };

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

    console.log("[IMPERSONATE] Step 1 - Token found:", {
      tokenId: impToken.id,
      used: impToken.used,
      expiresAt: impToken.expiresAt.toISOString(),
      now: new Date().toISOString(),
      expired: impToken.expiresAt < new Date(),
      targetEmail: impToken.user.email,
      adminEmail: impToken.admin.email,
    });

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

    console.log("[IMPERSONATE] Step 2 - generateLink result:", {
      hasData: !!data,
      hasActionLink: !!data?.properties?.action_link,
      actionLinkPreview: data?.properties?.action_link?.substring(0, 100),
      error: error?.message || null,
    });

    if (error || !data?.properties?.action_link) {
      console.error("[IMPERSONATE] generateLink error:", error);
      return errorRedirect("Erro ao autenticar");
    }

    const actionUrl = new URL(data.properties.action_link);
    const tokenHash =
      actionUrl.searchParams.get("token_hash") ||
      actionUrl.searchParams.get("token");
    const type = actionUrl.searchParams.get("type");

    console.log("[IMPERSONATE] Step 3 - Extracted from action_link:", {
      tokenHashPreview: tokenHash?.substring(0, 20),
      type,
      allParams: Object.fromEntries(actionUrl.searchParams.entries()),
    });

    if (!tokenHash || type !== "magiclink") {
      console.error(
        "[IMPERSONATE] invalid action_link format:",
        data.properties.action_link
      );
      return errorRedirect("Erro ao autenticar");
    }

    const supabase = await createServerSupabaseClient();
    const { data: sessionData, error: verifyError } =
      await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: "magiclink",
      });

    console.log("[IMPERSONATE] Step 4 - verifyOtp result:", {
      hasSession: !!sessionData?.session,
      userEmail: sessionData?.user?.email || null,
      error: verifyError?.message || null,
      errorStatus: verifyError?.status || null,
    });

    if (verifyError) {
      console.error("[IMPERSONATE] verifyOtp error:", verifyError);
      return errorRedirect("Erro ao verificar sessão");
    }

    console.log(
      `[IMPERSONATE] Step 5 - SUCCESS: Admin ${impToken.admin.email} → ${impToken.user.email} (session set, redirecting to /producer)`
    );

    return NextResponse.redirect(`${baseUrl}/producer`);
  } catch (error) {
    console.error("[IMPERSONATE] callback error:", error);
    return errorRedirect("Erro interno");
  }
}
