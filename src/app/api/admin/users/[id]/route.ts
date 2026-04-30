import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { Role } from "@prisma/client";

export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const admin = await requireAdmin();
    const { role } = await request.json();

    if (role !== "STUDENT" && role !== "PRODUCER" && role !== "ADMIN") {
      return NextResponse.json({ error: "Role inválida" }, { status: 400 });
    }

    if (params.id === admin.id && role !== "ADMIN") {
      return NextResponse.json(
        { error: "Você não pode remover sua própria permissão de admin" },
        { status: 400 }
      );
    }

    const user = await prisma.user.update({
      where: { id: params.id },
      data: { role: role as Role },
      select: { id: true, role: true },
    });

    return NextResponse.json({ user });
  } catch (error) {
    console.error("PATCH /api/admin/users/[id] error:", error);
    const msg = error instanceof Error ? error.message : "";
    const status =
      msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}
