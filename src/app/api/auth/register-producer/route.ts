import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase-route";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { welcomeProducer } from "@/lib/email-templates";

export async function POST(request: Request) {
  try {
    const {
      email, password, name, phone, businessType, niche,
      monthlyRevenue, referralSource, document,
    } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Email, senha e nome são obrigatórios" },
        { status: 400 }
      );
    }
    if (password.length < 6) {
      return NextResponse.json(
        { error: "A senha precisa ter pelo menos 6 caracteres" },
        { status: 400 }
      );
    }

    const supabase = await createRouteHandlerClient();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, role: "PRODUCER" } },
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (data.user) {
      await prisma.user.create({
        data: {
          id: data.user.id,
          email,
          name,
          role: "PRODUCER",
          phone: phone || null,
          businessType: businessType || null,
          niche: niche || null,
          monthlyRevenue: monthlyRevenue || null,
          referralSource: referralSource || null,
          document: document || null,
        },
      });

      const defaultPlan = await prisma.plan.findFirst({
        where: { active: true },
        orderBy: { price: "asc" },
      });
      if (defaultPlan) {
        await prisma.subscription.create({
          data: {
            userId: data.user.id,
            planId: defaultPlan.id,
            status: "PENDING",
          },
        });
      }

      const template = welcomeProducer(name);
      sendEmail({ to: { email, name }, ...template }).catch(() => {});
    }

    return NextResponse.json(
      { message: "Conta de produtor criada", user: data.user },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/auth/register-producer error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
