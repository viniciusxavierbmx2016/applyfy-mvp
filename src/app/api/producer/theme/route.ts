import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";

interface ThemeConfig {
  mode: string;
  primaryColor: string;
  secondaryColor: string;
  bgColor: string;
  headerColor: string;
  sidebarColor: string;
  cardColor: string;
  buttonTextColor: string;
}

const DEFAULTS: ThemeConfig = {
  mode: "dark",
  primaryColor: "#6366F1",
  secondaryColor: "#1a1e2e",
  bgColor: "#0a0a1a",
  headerColor: "#0a0a1a",
  sidebarColor: "#0a0a1a",
  cardColor: "#0a0e19",
  buttonTextColor: "#ffffff",
};

const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const COLOR_KEYS: (keyof ThemeConfig)[] = [
  "primaryColor",
  "secondaryColor",
  "bgColor",
  "headerColor",
  "sidebarColor",
  "cardColor",
  "buttonTextColor",
];

function parseTheme(raw: string | null | undefined): ThemeConfig {
  if (!raw) return { ...DEFAULTS };
  try {
    const parsed = JSON.parse(raw);
    return { ...DEFAULTS, ...parsed };
  } catch {
    return { ...DEFAULTS };
  }
}

export async function GET() {
  try {
    const staff = await requireStaff();
    const user = await prisma.user.findUnique({
      where: { id: staff.id },
      select: { themeConfig: true },
    });
    return NextResponse.json({ theme: parseTheme(user?.themeConfig) });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    const status = msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}

export async function PUT(req: Request) {
  try {
    const staff = await requireStaff();
    const body = await req.json();

    for (const key of COLOR_KEYS) {
      if (body[key] !== undefined && !HEX_RE.test(body[key])) {
        return NextResponse.json(
          { error: `Cor inválida para ${key}: deve ser formato #XXXXXX` },
          { status: 400 }
        );
      }
    }

    if (body.mode !== undefined && body.mode !== "dark" && body.mode !== "light") {
      return NextResponse.json(
        { error: "mode deve ser 'dark' ou 'light'" },
        { status: 400 }
      );
    }

    const current = await prisma.user.findUnique({
      where: { id: staff.id },
      select: { themeConfig: true },
    });

    const existing = parseTheme(current?.themeConfig);
    const merged: ThemeConfig = { ...existing };

    if (body.mode !== undefined) merged.mode = body.mode;
    for (const key of COLOR_KEYS) {
      if (body[key] !== undefined) merged[key] = body[key];
    }

    await prisma.user.update({
      where: { id: staff.id },
      data: { themeConfig: JSON.stringify(merged) },
    });

    return NextResponse.json({ theme: merged });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    const status = msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}

export async function DELETE() {
  try {
    const staff = await requireStaff();
    await prisma.user.update({
      where: { id: staff.id },
      data: { themeConfig: "{}" },
    });
    return NextResponse.json({ theme: { ...DEFAULTS } });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    const status = msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}
