import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase-route";

export async function POST() {
  try {
    const supabase = await createRouteHandlerClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("[AUTH] Logout error:", error.message);
      return NextResponse.json(
        { error: "Erro ao encerrar sessão" },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: "Logout realizado com sucesso" });
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
