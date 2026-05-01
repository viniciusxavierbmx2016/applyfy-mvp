import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import {
  createAdminClient,
  TICKET_ATTACHMENTS_BUCKET,
} from "@/lib/supabase-admin";
import { canAccessTicket } from "@/lib/ticket-access";

const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1h

// GET /api/support/attachments/signed-url?path=tickets/<userId>/<file>
// Generates a short-lived signed URL only when:
//   1) the path appears in some TicketMessage.attachments array, AND
//   2) the requester can access that ticket (producer-owner or admin/SUPPORT).
// "Orphan" paths (uploaded but never attached to a message) are not signable.
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const path = searchParams.get("path");
  if (!path) {
    return NextResponse.json({ error: "path obrigatório" }, { status: 400 });
  }

  // Find any TicketMessage that references this path (Postgres array contains).
  const msg = await prisma.ticketMessage.findFirst({
    where: { attachments: { has: path } },
    select: { ticket: { select: { id: true, producerId: true } } },
  });
  if (!msg?.ticket) {
    return NextResponse.json(
      { error: "Anexo não encontrado" },
      { status: 404 }
    );
  }

  if (!(await canAccessTicket(user, msg.ticket))) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.storage
    .from(TICKET_ATTACHMENTS_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    console.error(
      "[support signed-url] error:",
      error?.message || "no url returned"
    );
    return NextResponse.json(
      { error: "Falha ao gerar URL" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    url: data.signedUrl,
    expiresIn: SIGNED_URL_TTL_SECONDS,
  });
}
