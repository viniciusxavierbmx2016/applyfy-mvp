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

    const subscription = await prisma.subscription.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: { plan: true },
    });

    const plan = subscription?.plan
      ?? await prisma.plan.findFirst({ where: { active: true }, orderBy: { price: "asc" } });

    if (!plan) {
      return NextResponse.json({ error: "Nenhum plano disponível" }, { status: 400 });
    }

    const publicKey = process.env.APPLYFY_PUBLIC_KEY;
    const secretKey = process.env.APPLYFY_SECRET_KEY;
    const productId = process.env.MEMBERS_CLUB_PRODUCT_ID;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";

    if (!publicKey || !secretKey || !productId) {
      console.error("[checkout] Missing Applyfy keys or product ID");
      return NextResponse.json(
        { error: "Configuração de checkout incompleta. Contate o suporte." },
        { status: 500 }
      );
    }

    const payload = {
      product: {
        externalId: productId,
        name: "Members Club Pro",
        offer: {
          name: "Assinatura Mensal",
          price: plan.price,
          offerType: "NATIONAL",
          currency: "BRL",
          lang: "pt-BR",
        },
      },
      settings: {
        paymentMethods: ["PIX", "CREDIT_CARD", "BOLETO"],
        askForAddress: false,
        acceptedDocs: ["CPF"],
        thankYouPage: `${appUrl}/producer/billing?success=true`,
        colors: {
          primaryColor: "#6366F1",
          text: "#FFFFFF",
          background: "#0a0a1a",
          purchaseButtonBackground: "#6366F1",
          purchaseButtonText: "#FFFFFF",
          widgets: "#1a1a2e",
          inputBackground: "#1f2937",
          inputText: "#FFFFFF",
        },
      },
      customer: {
        name: user.name,
        email: user.email,
      },
      trackProps: {
        userId: user.id,
        subscriptionId: subscription?.id || "new",
      },
    };
    const res = await fetch("https://app.applyfy.com.br/api/v1/gateway/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-public-key": publicKey,
        "x-secret-key": secretKey,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      console.error("[checkout] Applyfy error:", res.status, errBody);
      return NextResponse.json(
        { error: "Erro ao gerar checkout. Tente novamente." },
        { status: 500 }
      );
    }

    const data = await res.json();
    const checkoutUrl = data.checkoutUrl || data.url || data.checkout_url;

    if (!checkoutUrl) {
      console.error("[checkout] No checkout URL in response:", data);
      return NextResponse.json(
        { error: "Erro ao gerar checkout. Tente novamente." },
        { status: 500 }
      );
    }

    return NextResponse.json({ checkoutUrl });
  } catch (error) {
    console.error("POST /api/producer/billing/checkout error:", error);
    const msg = error instanceof Error ? error.message : "";
    const status = msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro interno" }, { status });
  }
}
