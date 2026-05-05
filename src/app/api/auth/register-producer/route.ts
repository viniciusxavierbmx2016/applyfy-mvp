import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase-route";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { welcomeProducer } from "@/lib/email-templates";
import { rateLimit } from "@/lib/rate-limit";
import { registerSchema, validateBody } from "@/lib/validations";
import { encrypt } from "@/lib/encryption";

export async function POST(request: Request) {
  const limited = rateLimit(request);
  if (limited) return limited;

  try {
    const body = await request.json();
    const v = validateBody(registerSchema, body);
    if (!v.success) return v.error;
    const {
      email, password, name, phone, businessType, niche,
      monthlyRevenue, referralSource, document,
    } = v.data as typeof v.data & {
      phone?: string; businessType?: string; niche?: string;
      monthlyRevenue?: string; referralSource?: string; document?: string;
    };
    if (!name) {
      return NextResponse.json(
        { error: "Nome obrigatório" },
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
      console.error("[AUTH] Register producer error:", error.message);
      const msg = error.message ?? "";
      if (
        msg.includes("already registered") ||
        msg.includes("already been registered")
      ) {
        return NextResponse.json(
          { error: "Este email já está cadastrado. Tente fazer login." },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: "Não foi possível criar a conta. Tente novamente." },
        { status: 400 }
      );
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
          document: document ? encrypt(document) : null,
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
      sendEmail({ to: { email, name }, ...template }).catch((err) => console.error("[EMAIL_ERROR] welcomeProducer to:", email, err?.message || err));
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
