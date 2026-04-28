import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase-admin";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await requireAdmin();

    const producer = await prisma.user.findUnique({
      where: { id: params.id },
      select: { id: true, email: true, name: true, role: true },
    });

    if (!producer) {
      return NextResponse.json(
        { error: "Produtor não encontrado" },
        { status: 404 }
      );
    }

    if (producer.role !== "PRODUCER") {
      return NextResponse.json(
        { error: "Usuário não é produtor" },
        { status: 400 }
      );
    }

    const origin =
      request.headers.get("origin") ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "";
    const redirectTo = `${origin}/producer`;

    const supabase = createAdminClient();
    const { data, error } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: producer.email,
      options: { redirectTo },
    });

    if (error || !data?.properties?.action_link) {
      console.error("[IMPERSONATE] generateLink error:", error);
      return NextResponse.json(
        { error: "Erro ao gerar link de acesso" },
        { status: 500 }
      );
    }

    console.log(
      `[IMPERSONATE] Admin ${admin.email} (${admin.id}) → ${producer.email} (${producer.id}) em ${new Date().toISOString()}`
    );

    return NextResponse.json({
      url: data.properties.action_link,
      email: producer.email,
      expiresIn: 120,
    });
  } catch (error) {
    console.error("[IMPERSONATE] error:", error);
    const msg = error instanceof Error ? error.message : "";
    const status =
      msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}
