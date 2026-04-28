import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase-admin";
import { createClient } from "@supabase/supabase-js";

export async function GET(
  request: Request,
  { params }: { params: { token: string } }
) {
  const baseUrl = new URL(request.url).origin;

  try {
    console.log(
      "[IMPERSONATE] Step 0 - Token recebido:",
      params.token.substring(0, 10) + "..."
    );

    const impToken = await prisma.impersonateToken.findUnique({
      where: { token: params.token },
      include: {
        user: { select: { id: true, email: true } },
        admin: { select: { email: true } },
      },
    });

    if (!impToken) {
      console.error("[IMPERSONATE] Token not found");
      return NextResponse.redirect(
        `${baseUrl}/admin?error=${encodeURIComponent("Token inválido")}`
      );
    }

    if (impToken.used) {
      console.error("[IMPERSONATE] Token already used");
      return NextResponse.redirect(
        `${baseUrl}/admin?error=${encodeURIComponent("Token já utilizado")}`
      );
    }

    if (impToken.expiresAt < new Date()) {
      console.error("[IMPERSONATE] Token expired");
      await prisma.impersonateToken.delete({ where: { id: impToken.id } });
      return NextResponse.redirect(
        `${baseUrl}/admin?error=${encodeURIComponent("Token expirado")}`
      );
    }

    await prisma.impersonateToken.update({
      where: { id: impToken.id },
      data: { used: true },
    });

    console.log("[IMPERSONATE] Step 1 - Token valid for:", impToken.user.email);

    const supabaseAdmin = createAdminClient();

    const tempPassword = `imp_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    const { error: updateError } =
      await supabaseAdmin.auth.admin.updateUserById(impToken.user.id, {
        password: tempPassword,
      });

    if (updateError) {
      console.error(
        "[IMPERSONATE] Step 2 - updateUser error:",
        updateError.message
      );
      return NextResponse.redirect(
        `${baseUrl}/admin?error=${encodeURIComponent("Erro ao preparar acesso")}`
      );
    }

    console.log("[IMPERSONATE] Step 2 - Temp password set");

    const tempClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: signInData, error: signInError } =
      await tempClient.auth.signInWithPassword({
        email: impToken.user.email,
        password: tempPassword,
      });

    if (signInError || !signInData.session) {
      console.error(
        "[IMPERSONATE] Step 3 - signIn error:",
        signInError?.message
      );
      return NextResponse.redirect(
        `${baseUrl}/admin?error=${encodeURIComponent("Erro ao autenticar")}`
      );
    }

    console.log(
      "[IMPERSONATE] Step 3 - Signed in as:",
      signInData.user?.email
    );

    const finalPassword = `locked_${Date.now()}_${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
    await supabaseAdmin.auth.admin.updateUserById(impToken.user.id, {
      password: finalPassword,
    });

    console.log("[IMPERSONATE] Step 4 - Temp password cleared");

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
    const cookiePrefix = `sb-${projectRef}-auth-token`;

    const sessionStr = JSON.stringify({
      access_token: signInData.session.access_token,
      refresh_token: signInData.session.refresh_token,
      expires_in: signInData.session.expires_in,
      expires_at: signInData.session.expires_at,
      token_type: "bearer",
      user: signInData.session.user,
    });

    const maxAge = signInData.session.expires_in;
    const safeSession = sessionStr.replace(/\\/g, "\\\\").replace(/'/g, "\\'");

    console.log(
      `[IMPERSONATE] Step 5 - SUCCESS: Admin ${impToken.admin.email} → ${impToken.user.email} (cookie size: ${sessionStr.length})`
    );

    const html = `<!DOCTYPE html>
<html>
<head><title>Carregando...</title></head>
<body style="background:#0a0a0b;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">
  <div style="text-align:center">
    <p>Entrando como ${impToken.user.email}...</p>
  </div>
  <script>
    (function() {
      document.cookie.split(';').forEach(function(c) {
        var name = c.trim().split('=')[0];
        if (name.startsWith('sb-') && name.includes('-auth-token')) {
          document.cookie = name + '=; path=/; max-age=0; secure; samesite=lax';
        }
      });

      var cookieName = '${cookiePrefix}';
      var cookieValue = '${safeSession}';
      var maxAge = ${maxAge};
      var chunkSize = 3500;

      if (cookieValue.length <= chunkSize) {
        document.cookie = cookieName + '=' + encodeURIComponent(cookieValue) + '; path=/; max-age=' + maxAge + '; secure; samesite=lax';
      } else {
        for (var i = 0; i < cookieValue.length; i += chunkSize) {
          var chunk = cookieValue.slice(i, i + chunkSize);
          var idx = Math.floor(i / chunkSize);
          document.cookie = cookieName + '.' + idx + '=' + encodeURIComponent(chunk) + '; path=/; max-age=' + maxAge + '; secure; samesite=lax';
        }
      }

      setTimeout(function() {
        window.location.href = '/producer';
      }, 500);
    })();
  </script>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: { "Content-Type": "text/html" },
    });
  } catch (err) {
    console.error(
      "[IMPERSONATE] Unexpected error:",
      err instanceof Error ? err.message : err
    );
    return NextResponse.redirect(
      `${baseUrl}/admin?error=${encodeURIComponent("Erro interno")}`
    );
  }
}
