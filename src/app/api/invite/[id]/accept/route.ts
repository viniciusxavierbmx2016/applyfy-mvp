import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase-admin";
import { getCurrentUser } from "@/lib/auth";

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const invite = await prisma.collaborator.findUnique({
      where: { id: params.id },
    });
    if (!invite) {
      return NextResponse.json(
        { error: "Convite não encontrado" },
        { status: 404 }
      );
    }
    if (invite.status === "REVOKED") {
      return NextResponse.json(
        { error: "Convite revogado" },
        { status: 400 }
      );
    }
    if (invite.status === "ACCEPTED") {
      return NextResponse.json({ ok: true, alreadyAccepted: true });
    }

    const body = await request.json().catch(() => ({}));
    const mode = body.mode as "login" | "signup" | undefined;

    const sessionUser = await getCurrentUser();

    // If already authenticated, bind & accept.
    if (sessionUser) {
      if (
        sessionUser.email.toLowerCase() !== invite.email.toLowerCase()
      ) {
        return NextResponse.json(
          {
            error:
              "O e-mail da sua sessão não corresponde ao e-mail do convite.",
          },
          { status: 400 }
        );
      }
      await prisma.$transaction([
        prisma.user.update({
          where: { id: sessionUser.id },
          data: {
            role: "COLLABORATOR",
            workspaceId: invite.workspaceId,
          },
        }),
        prisma.collaborator.update({
          where: { id: invite.id },
          data: {
            userId: sessionUser.id,
            status: "ACCEPTED",
            acceptedAt: new Date(),
          },
        }),
      ]);
      return NextResponse.json({ ok: true });
    }

    // Not authenticated → need signup flow
    if (mode !== "signup") {
      return NextResponse.json(
        { error: "Sessão ausente" },
        { status: 401 }
      );
    }

    const name = String(body.name ?? "").trim();
    const password = String(body.password ?? "");
    if (!name || password.length < 6) {
      return NextResponse.json(
        { error: "Nome e senha (mín. 6) obrigatórios" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();
    // Create auth user (email confirmed so login works immediately)
    const { data: created, error: createErr } =
      await admin.auth.admin.createUser({
        email: invite.email,
        password,
        email_confirm: true,
        user_metadata: { name },
      });

    const authUserId: string | null = created?.user?.id ?? null;

    if (createErr || !authUserId) {
      const msg = createErr?.message || "";
      const alreadyExists = /already.*registered|already been registered/i.test(
        msg
      );
      if (!alreadyExists) {
        return NextResponse.json(
          { error: msg || "Falha ao criar usuário" },
          { status: 400 }
        );
      }

      // Recover: find existing auth user by email and reset its password.
      // listUsers is paginated — search across pages until we find the email.
      const targetEmail = invite.email.toLowerCase();
      let foundId: string | null = null;
      for (let page = 1; page <= 20 && !foundId; page++) {
        const { data: list, error: listErr } =
          await admin.auth.admin.listUsers({ page, perPage: 200 });
        if (listErr) {
          return NextResponse.json(
            { error: listErr.message || "Falha ao localizar usuário" },
            { status: 400 }
          );
        }
        const match = list?.users?.find(
          (u) => (u.email ?? "").toLowerCase() === targetEmail
        );
        if (match) foundId = match.id;
        if (!list?.users || list.users.length < 200) break;
      }
      if (!foundId) {
        return NextResponse.json(
          { error: "Usuário não encontrado no Auth" },
          { status: 400 }
        );
      }
      const { error: updErr } = await admin.auth.admin.updateUserById(
        foundId,
        { password, email_confirm: true, user_metadata: { name } }
      );
      if (updErr) {
        return NextResponse.json(
          { error: updErr.message || "Falha ao atualizar senha" },
          { status: 400 }
        );
      }
    }

    const user = await prisma.user.upsert({
      where: { email: invite.email.toLowerCase() },
      update: {
        name,
        role: "COLLABORATOR",
        workspaceId: invite.workspaceId,
      },
      create: {
        email: invite.email.toLowerCase(),
        name,
        role: "COLLABORATOR",
        workspaceId: invite.workspaceId,
      },
    });

    await prisma.collaborator.update({
      where: { id: invite.id },
      data: {
        userId: user.id,
        name: invite.name ?? name,
        status: "ACCEPTED",
        acceptedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true, created: true });
  } catch (e) {
    console.error("POST /api/invite/[id]/accept error:", e);
    const msg = e instanceof Error ? e.message : "Erro";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
