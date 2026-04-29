import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase-route";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createRouteHandlerClient();

  const { data, error } = await supabase.auth.mfa.listFactors();

  if (error) {
    return NextResponse.json({ enabled: false, factors: [] });
  }

  const verifiedFactors = data.totp.filter((f) => f.status === "verified");

  return NextResponse.json({
    enabled: verifiedFactors.length > 0,
    factors: verifiedFactors.map((f) => ({
      id: f.id,
      name: f.friendly_name,
      createdAt: f.created_at,
    })),
  });
}
