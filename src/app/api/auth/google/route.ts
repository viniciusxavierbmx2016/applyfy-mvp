import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();

    const origin = new URL(request.url).origin;
    const redirectTo = `${origin}/api/auth/callback`;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });

    if (error || !data.url) {
      console.error("signInWithOAuth error:", error);
      return NextResponse.json(
        { error: error?.message || "Falha ao iniciar OAuth" },
        { status: 500 }
      );
    }

    return NextResponse.json({ url: data.url });
  } catch (error) {
    console.error("POST /api/auth/google error:", error);
    return NextResponse.json(
      { error: "Erro ao iniciar login com Google" },
      { status: 500 }
    );
  }
}
