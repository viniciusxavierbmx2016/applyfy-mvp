import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canEditCourse, getCurrentUser, requireStaff } from "@/lib/auth";

const DEFAULTS = [
  { label: "Home", icon: "home", url: "/course/:slug", isDefault: true },
  {
    label: "Continuar assistindo",
    icon: "play",
    url: "/course/:slug#continue",
    isDefault: true,
  },
  {
    label: "Comunidade",
    icon: "message",
    url: "/course/:slug/community",
    isDefault: true,
  },
];

async function ensureDefaults(courseId: string) {
  const count = await prisma.menuItem.count({
    where: { courseId, isDefault: true },
  });
  if (count >= DEFAULTS.length) return;
  for (let i = 0; i < DEFAULTS.length; i++) {
    const d = DEFAULTS[i];
    const exists = await prisma.menuItem.findFirst({
      where: { courseId, isDefault: true, label: d.label },
    });
    if (!exists) {
      await prisma.menuItem.create({
        data: { ...d, courseId, order: i },
      });
    }
  }
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    await ensureDefaults(params.id);
    const items = await prisma.menuItem.findMany({
      where: { courseId: params.id },
      orderBy: { order: "asc" },
    });
    return NextResponse.json({ items });
  } catch (error) {
    console.error("GET menu error:", error);
    return NextResponse.json({ error: "Erro" }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const staff = await requireStaff();
    if (!(await canEditCourse(staff, params.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const { label, icon, url } = await request.json();
    if (!label || !url) {
      return NextResponse.json(
        { error: "Nome e URL obrigatórios" },
        { status: 400 }
      );
    }
    const last = await prisma.menuItem.findFirst({
      where: { courseId: params.id },
      orderBy: { order: "desc" },
    });
    const item = await prisma.menuItem.create({
      data: {
        courseId: params.id,
        label,
        icon: icon || "link",
        url,
        order: (last?.order ?? -1) + 1,
      },
    });
    return NextResponse.json({ item });
  } catch (error) {
    console.error("POST menu error:", error);
    const msg = error instanceof Error ? error.message : "";
    const status = msg === "Unauthorized" ? 401 : msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}
