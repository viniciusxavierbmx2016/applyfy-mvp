import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase-route";
import { getCurrentUser } from "@/lib/auth";
import { logAudit, getRequestMeta } from "@/lib/audit";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "ADMIN" && user.role !== "PRODUCER")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createRouteHandlerClient();

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "Members Club Auth",
  });

  if (error) {
    console.error("[MFA] Enroll error:", error.message);
    return NextResponse.json(
      { error: "Erro ao configurar 2FA" },
      { status: 500 }
    );
  }

  await logAudit({
    userId: user.id,
    action: "mfa_enroll",
    target: data.id,
    ...getRequestMeta(req),
  });

  return NextResponse.json({
    factorId: data.id,
    qrCode: data.totp.qr_code,
    secret: data.totp.secret,
    uri: data.totp.uri,
  });
}
