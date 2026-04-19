import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { canAccessWorkspace } from "@/lib/workspace";
import { createAdminClient } from "@/lib/supabase-admin";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const staff = await requireStaff();
    const c = await prisma.collaborator.findUnique({
      where: { id: params.id },
    });
    if (!c) {
      return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
    }
    const ok = await canAccessWorkspace(staff, c.workspaceId);
    if (!ok) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }
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
      const redirectTo = `${origin}/invite/${c.id}`;
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
      inviteLink = `${origin}/invite/${c.id}`;
    }

    return NextResponse.json({ inviteLink });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro";
    const code = msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    return NextResponse.json({ error: msg }, { status: code });
  }
}
