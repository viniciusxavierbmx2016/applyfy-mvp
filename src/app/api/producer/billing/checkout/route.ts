import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";

export async function POST() {
  try {
    const staff = await requireStaff();
    if (staff.role !== "PRODUCER") {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const user = await prisma.user.findUnique({
      where: { id: staff.id },
      select: { id: true, name: true, email: true },
    });
    if (!user) {
      return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });
    }

    const baseCheckoutUrl =
      process.env.MEMBERS_CLUB_CHECKOUT_URL ||
      "https://checkout.applyfy.com.br/checkout/cmo4usp5g08jm1rp2steeksuj?offer=KJ63X6I";

    const params = new URLSearchParams();
    if (user.name) params.set("name", user.name);
    if (user.email) params.set("email", user.email);

    const separator = baseCheckoutUrl.includes("?") ? "&" : "?";
    const checkoutUrl = `${baseCheckoutUrl}${separator}${params.toString()}`;

    return NextResponse.json({ checkoutUrl });
  } catch (error) {
    console.error("POST /api/producer/billing/checkout error:", error);
    const msg = error instanceof Error ? error.message : "";
    const status = msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro interno" }, { status });
  }
}
