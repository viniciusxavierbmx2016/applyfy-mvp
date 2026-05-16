import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase-admin";
import { createClient } from "@supabase/supabase-js";
import { rateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { impersonateSessionSchema, validateBody } from "@/lib/validations";

export async function POST(request: Request) {
  const limited = rateLimit(request);
  if (limited) return limited;

  try {
    const raw = await request.json().catch(() => ({}));
    const v = validateBody(impersonateSessionSchema, raw);
    if (!v.success) return v.error;
    const { token } = v.data;

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

    // Create a session via magic-link OTP instead of overwriting the
    // producer's real Supabase Auth password. The previous flow rotated the
    // password to `imp_*` and signed in with it — leaving the producer
    // locked out of their own account until they ran a password reset.
    const { data: linkData, error: linkError } =
      await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email: impToken.user.email,
      });

    if (linkError || !linkData?.properties?.hashed_token) {
      logger.error("IMPERSONATE-SESSION", "generateLink failed", {
        error: linkError ? linkError.message : "missing hashed_token",
      });
      return NextResponse.json(
        { error: "Falha ao criar sessão" },
        { status: 500 }
      );
    }

    const tempClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: otpData, error: otpError } = await tempClient.auth.verifyOtp({
      token_hash: linkData.properties.hashed_token,
      type: "magiclink",
    });

    if (otpError || !otpData.session) {
      logger.error("IMPERSONATE-SESSION", "verifyOtp failed", {
        error: otpError?.message ?? "no session",
      });
      return NextResponse.json(
        { error: "Falha ao criar sessão" },
        { status: 500 }
      );
    }

    logger.info(
      "IMPERSONATE-SESSION",
      `Success: ${impToken.admin.email} → ${impToken.user.email}`
    );

    return NextResponse.json({
      access_token: otpData.session.access_token,
      refresh_token: otpData.session.refresh_token,
      expires_in: otpData.session.expires_in,
      expires_at: otpData.session.expires_at,
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
