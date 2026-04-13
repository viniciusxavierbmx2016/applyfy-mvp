import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

interface Body {
  next?: string;
  slug?: string;
  role?: "PRODUCER" | "STUDENT";
}

export async function POST(request: Request) {
  try {
    let body: Body = {};
    try {
      body = (await request.json()) as Body;
    } catch {
      // no body — use defaults
    }
    const { next, slug, role } = body;

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

    const res = NextResponse.json({ url: data.url });
    // Stash intent in short-lived cookies; the callback reads and clears them.
    const opts = {
      httpOnly: true,
      sameSite: "lax" as const,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 10, // 10 min
    };
    if (next) res.cookies.set("oauth_next", next, opts);
    if (slug) res.cookies.set("oauth_slug", slug, opts);
    if (role) res.cookies.set("oauth_role", role, opts);
    return res;
  } catch (error) {
    console.error("POST /api/auth/google error:", error);
    return NextResponse.json(
      { error: "Erro ao iniciar login com Google" },
      { status: 500 }
    );
  }
}
