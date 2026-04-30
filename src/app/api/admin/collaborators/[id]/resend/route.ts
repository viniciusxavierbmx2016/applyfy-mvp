import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { adminCollaboratorInvite } from "@/lib/email-templates";
import { logAudit, getRequestMeta } from "@/lib/audit";

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  try {
    const admin = await requireAdmin();

    const collab = await prisma.adminCollaborator.findUnique({
      where: { id: params.id },
      include: { invitedBy: { select: { name: true } } },
    });
    if (!collab) {
      return NextResponse.json(
        { error: "Colaborador não encontrado" },
        { status: 404 }
      );
    }
    if (collab.status === "REVOKED") {
      return NextResponse.json(
        { error: "Convite revogado — convide novamente" },
        { status: 400 }
      );
    }
    if (collab.status === "ACCEPTED") {
      return NextResponse.json(
        { error: "Convite já aceito" },
        { status: 400 }
      );
    }

    await prisma.adminCollaborator.update({
      where: { id: collab.id },
      data: { invitedAt: new Date() },
    });

    const origin =
      request.headers.get("origin") ||
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "";
    const inviteLink = `${origin}/invite/admin/${collab.id}?email=${encodeURIComponent(collab.email)}`;

    const template = adminCollaboratorInvite(
      collab.name || collab.email,
      collab.invitedBy?.name || admin.name,
      inviteLink,
      collab.permissions
    );
    sendEmail({
      to: { email: collab.email, name: collab.name || undefined },
      ...template,
    }).catch((err) =>
      console.error(
        "[EMAIL_ERROR] adminCollaboratorInvite resend to:",
        collab.email,
        err?.message || err
      )
    );

    await logAudit({
      userId: admin.id,
      action: "admin_collab_resent",
      target: collab.id,
      details: { email: collab.email },
      ...getRequestMeta(request),
    });

    return NextResponse.json({ inviteLink });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro";
    const code =
      msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    console.error("POST /api/admin/collaborators/[id]/resend error:", e);
    return NextResponse.json({ error: msg }, { status: code });
  }
}
