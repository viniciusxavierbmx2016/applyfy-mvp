import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase-admin";
import { getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { logAudit, getRequestMeta } from "@/lib/audit";

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const limited = rateLimit(request);
  if (limited) return limited;

  try {
    const invite = await prisma.adminCollaborator.findUnique({
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

    // If already authenticated, bind & accept (sets role to ADMIN_COLLABORATOR).
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
          data: { role: "ADMIN_COLLABORATOR" },
        }),
        prisma.adminCollaborator.update({
          where: { id: invite.id },
          data: {
            userId: sessionUser.id,
            status: "ACCEPTED",
            acceptedAt: new Date(),
          },
        }),
      ]);

      await logAudit({
        userId: sessionUser.id,
        action: "admin_collab_accepted",
        target: invite.id,
        details: { email: invite.email },
        ...getRequestMeta(request),
      });

      return NextResponse.json({ ok: true });
    }

    // Not authenticated → need signup flow.
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

    // Decision A2: admin collaborators must have a fresh email. Block if a
    // Prisma User already exists for this email (covers race vs invite-time check).
    const existing = await prisma.user.findUnique({
      where: { email: invite.email.toLowerCase() },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        {
          error:
            "Este e-mail já está em uso. Use um e-mail exclusivo para o colaborador admin.",
        },
        { status: 409 }
      );
    }

    const admin = createAdminClient();
    const { data: created, error: createErr } =
      await admin.auth.admin.createUser({
        email: invite.email,
        password,
        email_confirm: true,
        user_metadata: { name },
      });

    let authUserId: string | null = created?.user?.id ?? null;

    if (createErr || !authUserId) {
      const msg = createErr?.message || "";
      const alreadyExists =
        /already.*registered|already been registered/i.test(msg);
      if (!alreadyExists) {
        return NextResponse.json(
          { error: msg || "Falha ao criar usuário" },
          { status: 400 }
        );
      }
      // Auth user exists from prior attempt — recover by listing + updating.
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
      authUserId = foundId;
    }

    const user = await prisma.user.create({
      data: {
        id: authUserId!,
        email: invite.email.toLowerCase(),
        name,
        role: "ADMIN_COLLABORATOR",
      },
    });

    await prisma.adminCollaborator.update({
      where: { id: invite.id },
      data: {
        userId: user.id,
        name: invite.name ?? name,
        status: "ACCEPTED",
        acceptedAt: new Date(),
      },
    });

    await logAudit({
      userId: user.id,
      action: "admin_collab_accepted",
      target: invite.id,
      details: { email: invite.email, created: true },
      ...getRequestMeta(request),
    });

    return NextResponse.json({ ok: true, created: true });
  } catch (e) {
    console.error("POST /api/invite/admin/[id]/accept error:", e);
    const msg = e instanceof Error ? e.message : "Erro";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
