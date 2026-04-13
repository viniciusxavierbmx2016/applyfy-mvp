import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase-route";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { email, password, name } = await request.json();

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
        },
      });
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
