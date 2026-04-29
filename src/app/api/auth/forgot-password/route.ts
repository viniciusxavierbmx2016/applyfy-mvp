import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { passwordReset } from "@/lib/email-templates";
import { rateLimit } from "@/lib/rate-limit";
import { forgotPasswordSchema, validateBody } from "@/lib/validations";

export async function POST(req: Request) {
  const limited = rateLimit(req);
  if (limited) return limited;

  try {
    const body = await req.json();
    const v = validateBody(forgotPasswordSchema, body);
    if (!v.success) return v.error;
    const { email, from } = v.data;

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: { id: true, name: true, email: true },
    });

    if (!user) {
      return NextResponse.json({ success: true });
    }

    const supabase = createAdminClient();
    const origin =
      req.headers.get("origin") || process.env.NEXT_PUBLIC_APP_URL || "https://app.mymembersclub.com.br";

    const { data, error } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email: user.email,
      options: {
        redirectTo: `${origin}/reset-password${from ? `?from=${from}` : ""}`,
      },
    });

    if (error || !data?.properties?.action_link) {
      console.error("[FORGOT-PASSWORD] generateLink error:", error?.message);
      return NextResponse.json({ success: true });
    }

    const template = passwordReset(user.name || "Usuário", data.properties.action_link);

    await sendEmail({
      to: { email: user.email, name: user.name },
      subject: template.subject,
      htmlContent: template.htmlContent,
    }).catch((err) => {
      console.error("[FORGOT-PASSWORD] sendEmail error:", err);
    });

    console.log(`[FORGOT-PASSWORD] Email enviado para ${user.email}`);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[FORGOT-PASSWORD] Error:", err);
    return NextResponse.json({ success: true });
  }
}
