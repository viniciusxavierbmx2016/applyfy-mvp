import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const errorParam = url.searchParams.get("error");

  if (errorParam) {
    const login = new URL("/login", url.origin);
    login.searchParams.set("error", errorParam);
    return NextResponse.redirect(login);
  }

  if (!code) {
    return NextResponse.redirect(new URL("/login", url.origin));
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error || !data.session?.user) {
      console.error("exchangeCodeForSession error:", error);
      const login = new URL("/login", url.origin);
      login.searchParams.set("error", "oauth_failed");
      return NextResponse.redirect(login);
    }

    const authUser = data.session.user;
    const email = authUser.email?.toLowerCase();
    if (!email) {
      const login = new URL("/login", url.origin);
      login.searchParams.set("error", "missing_email");
      return NextResponse.redirect(login);
    }

    const meta =
      (authUser.user_metadata as Record<string, unknown> | undefined) || {};
    const fullName =
      (meta.full_name as string | undefined) ||
      (meta.name as string | undefined) ||
      email.split("@")[0];
    const avatarUrl =
      (meta.avatar_url as string | undefined) ||
      (meta.picture as string | undefined) ||
      null;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (!existing) {
      await prisma.user.create({
        data: {
          id: authUser.id,
          email,
          name: fullName,
          avatarUrl,
        },
      });
    } else if (!existing.avatarUrl && avatarUrl) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { avatarUrl },
      });
    }

    return NextResponse.redirect(new URL("/", url.origin));
  } catch (error) {
    console.error("GET /api/auth/callback error:", error);
    const login = new URL("/login", url.origin);
    login.searchParams.set("error", "oauth_failed");
    return NextResponse.redirect(login);
  }
}
