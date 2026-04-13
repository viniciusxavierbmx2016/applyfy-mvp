import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const errorParam = url.searchParams.get("error");

  const jar = await cookies();
  const nextPath = jar.get("oauth_next")?.value || null;
  const slug = jar.get("oauth_slug")?.value || null;
  const role = jar.get("oauth_role")?.value || null;

  function clearIntentCookies(res: NextResponse) {
    res.cookies.set("oauth_next", "", { path: "/", maxAge: 0 });
    res.cookies.set("oauth_slug", "", { path: "/", maxAge: 0 });
    res.cookies.set("oauth_role", "", { path: "/", maxAge: 0 });
    return res;
  }

  function loginFallback(err?: string) {
    const target = slug ? `/w/${slug}/login` : "/login";
    const login = new URL(target, url.origin);
    if (err) login.searchParams.set("error", err);
    return clearIntentCookies(NextResponse.redirect(login));
  }

  if (errorParam) return loginFallback(errorParam);
  if (!code) return loginFallback();

  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error || !data.session?.user) {
      console.error("exchangeCodeForSession error:", error);
      return loginFallback("oauth_failed");
    }

    const authUser = data.session.user;
    const email = authUser.email?.toLowerCase();
    if (!email) return loginFallback("missing_email");

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

    // Resolve workspace if slug was provided (student flow).
    let workspaceId: string | null = null;
    if (slug) {
      const ws = await prisma.workspace.findUnique({
        where: { slug },
        select: { id: true, isActive: true },
      });
      if (!ws || !ws.isActive) return loginFallback("workspace_not_found");
      workspaceId = ws.id;
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (!existing) {
      await prisma.user.create({
        data: {
          id: authUser.id,
          email,
          name: fullName,
          avatarUrl,
          role: role === "PRODUCER" ? "PRODUCER" : "STUDENT",
          workspaceId: workspaceId ?? undefined,
        },
      });
    } else {
      const updates: Record<string, unknown> = {};
      if (!existing.avatarUrl && avatarUrl) updates.avatarUrl = avatarUrl;
      // Bind STUDENT to the workspace on first login through that workspace.
      if (
        workspaceId &&
        existing.role === "STUDENT" &&
        !existing.workspaceId
      ) {
        updates.workspaceId = workspaceId;
      }
      // If user is a STUDENT bound to a different workspace, reject.
      if (
        workspaceId &&
        existing.role === "STUDENT" &&
        existing.workspaceId &&
        existing.workspaceId !== workspaceId
      ) {
        await supabase.auth.signOut();
        return loginFallback("wrong_workspace");
      }
      if (Object.keys(updates).length > 0) {
        await prisma.user.update({
          where: { id: existing.id },
          data: updates,
        });
      }
    }

    const destination =
      nextPath || (slug ? `/w/${slug}` : "/");
    return clearIntentCookies(
      NextResponse.redirect(new URL(destination, url.origin))
    );
  } catch (error) {
    console.error("GET /api/auth/callback error:", error);
    return loginFallback("oauth_failed");
  }
}
