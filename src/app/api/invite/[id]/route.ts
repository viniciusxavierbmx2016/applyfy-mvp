import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const limited = rateLimit(request);
  if (limited) return limited;

  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email")?.toLowerCase().trim();
  if (!email) {
    return NextResponse.json(
      { error: "Convite não encontrado" },
      { status: 404 }
    );
  }

  const c = await prisma.collaborator.findUnique({
    where: { id: params.id },
    include: {
      workspace: { select: { name: true, slug: true, logoUrl: true } },
    },
  });
  if (!c || c.email.toLowerCase() !== email) {
    return NextResponse.json(
      { error: "Convite não encontrado" },
      { status: 404 }
    );
  }
  return NextResponse.json({
    invite: {
      id: c.id,
      name: c.name,
      status: c.status,
      permissions: c.permissions,
      workspace: c.workspace,
    },
  });
}
