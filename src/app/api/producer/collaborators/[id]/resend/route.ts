import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { requireWorkspaceOwner } from "@/lib/workspace";
import { createAdminClient } from "@/lib/supabase-admin";

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const staff = await requireStaff();
    const c = await prisma.collaborator.findUnique({
      where: { id: params.id },
    });
    if (!c) {
      return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    }
    const gate = await requireWorkspaceOwner(staff, c.workspaceId);
    if (!gate.ok) return gate.response;
    if (c.status === "REVOKED") {
      return NextResponse.json(
        { error: "Convite revogado" },
        { status: 400 }
      );
    }

    await prisma.collaborator.update({
      where: { id: c.id },
      data: { invitedAt: new Date(), status: "PENDING" },
    });

    let inviteLink: string | null = null;
    try {
      const supabase = createAdminClient();
      const origin =
        request.headers.get("origin") ||
        process.env.NEXT_PUBLIC_SITE_URL ||
        "";
      const redirectTo = `${origin}/invite/${c.id}?email=${encodeURIComponent(c.email)}`;
      const { data, error } = await supabase.auth.admin.generateLink({
        type: "magiclink",
        email: c.email,
        options: { redirectTo },
      });
      if (!error) inviteLink = data?.properties?.action_link ?? null;
    } catch (e) {
      console.error("resend generateLink failed:", e);
    }

    if (!inviteLink) {
      const origin =
        request.headers.get("origin") ||
        process.env.NEXT_PUBLIC_SITE_URL ||
        "";
      inviteLink = `${origin}/invite/${c.id}?email=${encodeURIComponent(c.email)}`;
    }

    return NextResponse.json({ inviteLink });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro";
    const code = msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status: code });
  }
}
