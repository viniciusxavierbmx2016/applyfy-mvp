import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase-route";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { registerSchema, validateBody } from "@/lib/validations";

export async function POST(request: Request) {
  const limited = rateLimit(request);
  if (limited) return limited;

  try {
    const body = await request.json();
    const v = validateBody(registerSchema, body);
    if (!v.success) return v.error;
    const { email, password, name } = v.data;
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
      options: {
        data: { name },
      },
    });

    if (error) {
      console.error("[AUTH] Register error:", error.message);
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
          role: "ADMIN",
        },
      });
    }

    return NextResponse.json(
      { message: "Conta criada com sucesso", user: data.user },
      { status: 201 }
    );
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
