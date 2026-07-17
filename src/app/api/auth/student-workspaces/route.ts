import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email";
import { studentWorkspacesList } from "@/lib/email-templates";
import { getStudentWorkspaces } from "@/lib/student-workspaces";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://app.mymembersclub.com.br";

export async function POST(req: Request) {
  // 7.7 colateral: era a ÚNICA rota da família /api/auth sem rateLimit —
  // disparadora de email sem freio. Mesmo padrão 2.4a das 9 irmãs.
  const limited = rateLimit(req);
  if (limited) return limited;

  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json({ ok: true }); // genérico sempre
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Buscar user por email
    const user = await prisma.user.findFirst({
      where: { email: normalizedEmail },
    });

    if (user) {
      // Agrupamento canônico compartilhado com a Raiz (7.7) — mesma fonte.
      const workspaces = await getStudentWorkspaces(user.id);

      if (workspaces.length > 0) {
        const template = studentWorkspacesList(
          workspaces.map((w) => ({
            name: w.name,
            loginUrl: `${APP_URL}/w/${w.slug}/login`,
          }))
        );

        await sendEmail({
          to: { email: normalizedEmail },
          ...template,
        });
      }
    }

    // Sempre a mesma resposta — anti-enumeração
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[STUDENT_WORKSPACES]", error);
    return NextResponse.json({ ok: true }); // genérico mesmo no erro
  }
}
