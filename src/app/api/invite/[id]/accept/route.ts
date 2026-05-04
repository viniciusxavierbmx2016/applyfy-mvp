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
      // C5: do NOT overwrite User.role. The Collaborator row is the source
      // of truth for "user X is a collaborator of workspace Y" — preserving
      // the original role keeps STUDENT access intact for invitees who are
      // also students of courses in the workspace.
      // workspaceId is only set if the user doesn't already have one
      // (preserves existing primary workspace when invitee belongs to
      // multiple workspaces).
      const tx = [];
      if (!sessionUser.workspaceId) {
        tx.push(
          prisma.user.update({
            where: { id: sessionUser.id },
            data: { workspaceId: invite.workspaceId },
          })
        );
      }
      tx.push(
        prisma.collaborator.update({
          where: { id: invite.id },
          data: {
            userId: sessionUser.id,
            status: "ACCEPTED",
            acceptedAt: new Date(),
          },
        })
      );
      await prisma.$transaction(tx);
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

    // C5: same role-preservation rule as the sessionUser branch above.
    // Replaces the previous upsert because "preserve workspaceId only when
    // null" requires reading the existing row first.
    // Also fixes a latent bug: the previous create branch let id default to
    // a fresh @default(uuid()), decoupling Prisma.User from the Supabase
    // Auth user. We now set id explicitly to authUserId so the two stay
    // in sync (matches /api/w/[slug]/register and other create paths).
    const targetEmail = invite.email.toLowerCase();
    const existing = await prisma.user.findUnique({
      where: { email: targetEmail },
      select: { id: true, workspaceId: true },
    });
    const user = existing
      ? await prisma.user.update({
          where: { id: existing.id },
          data: {
            name,
            ...(existing.workspaceId
              ? {}
              : { workspaceId: invite.workspaceId }),
          },
        })
      : await prisma.user.create({
          data: {
            id: authUserId!,
            email: targetEmail,
            name,
            // role defaults to STUDENT per schema; collaborator status is
            // tracked in the Collaborator row created/updated below.
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
