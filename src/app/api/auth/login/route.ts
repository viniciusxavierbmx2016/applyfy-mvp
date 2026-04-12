import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase-route";
import { prisma } from "@/lib/prisma";

const MAX_SESSIONS = 3;

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email e senha são obrigatórios" },
        { status: 400 }
      );
    }

    const supabase = await createRouteHandlerClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    // Enforce max sessions limit
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        sessions: { orderBy: { createdAt: "asc" } },
      },
    });

    if (user) {
      // Clean up expired sessions
      await prisma.session.deleteMany({
        where: {
          userId: user.id,
          expiresAt: { lt: new Date() },
        },
      });

      // Check active sessions count
      const activeSessions = await prisma.session.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "asc" },
      });

      // If at max, remove oldest
      if (activeSessions.length >= MAX_SESSIONS) {
        const sessionsToRemove = activeSessions.slice(
          0,
          activeSessions.length - MAX_SESSIONS + 1
        );
        await prisma.session.deleteMany({
          where: {
            id: { in: sessionsToRemove.map((s) => s.id) },
          },
        });
      }

      // Create new session
      const ip = request.headers.get("x-forwarded-for") || "unknown";
      const device = request.headers.get("user-agent") || "unknown";
      await prisma.session.create({
        data: {
          userId: user.id,
          ip,
          device,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
      });
    }

    return NextResponse.json({
      message: "Login realizado com sucesso",
      user: data.user,
      session: data.session,
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Erro interno do servidor" },
      { status: 500 }
    );
  }
}
