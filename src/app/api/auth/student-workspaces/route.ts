import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { studentWorkspacesList } from "@/lib/email-templates";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://app.mymembersclub.com.br";

export async function POST(req: Request) {
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
      // Buscar enrollments ACTIVE agrupados por workspace
      const enrollments = await prisma.enrollment.findMany({
        where: { userId: user.id, status: "ACTIVE" },
        include: {
          course: {
            include: {
              workspace: { select: { id: true, slug: true, name: true, isActive: true } },
            },
          },
        },
      });

      // Agrupar por workspace (um aluno pode ter vários cursos no mesmo workspace)
      const workspaceMap = new Map<string, { name: string; slug: string }>();
      for (const e of enrollments) {
        const ws = e.course.workspace;
        if (ws && ws.isActive && !workspaceMap.has(ws.id)) {
          workspaceMap.set(ws.id, { name: ws.name, slug: ws.slug });
        }
      }

      const workspaces = Array.from(workspaceMap.values());

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
