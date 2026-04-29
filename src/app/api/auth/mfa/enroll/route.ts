import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase-route";
import { getCurrentUser } from "@/lib/auth";

export async function POST() {
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

  return NextResponse.json({
    factorId: data.id,
    qrCode: data.totp.qr_code,
    secret: data.totp.secret,
    uri: data.totp.uri,
  });
}
