import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const c = await prisma.collaborator.findUnique({
    where: { id: params.id },
    include: {
      workspace: { select: { name: true, slug: true, logoUrl: true } },
    },
  });
  if (!c) {
    return NextResponse.json(
      { error: "Convite não encontrado" },
      { status: 404 }
    );
  }
  return NextResponse.json({
    invite: {
      id: c.id,
      email: c.email,
      name: c.name,
      status: c.status,
      permissions: c.permissions,
      workspace: c.workspace,
    },
  });
}
