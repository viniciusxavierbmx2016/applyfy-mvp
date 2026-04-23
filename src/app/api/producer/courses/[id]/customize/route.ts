import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canEditCourse, requireStaff } from "@/lib/auth";

const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const COLOR_FIELDS = [
  "memberBgColor",
  "memberSidebarColor",
  "memberHeaderColor",
  "memberCardColor",
  "memberPrimaryColor",
  "memberTextColor",
  "memberAccentColor",
] as const;

const SELECT_FIELDS = {
  memberBgColor: true,
  memberSidebarColor: true,
  memberHeaderColor: true,
  memberCardColor: true,
  memberPrimaryColor: true,
  memberTextColor: true,
  memberAccentColor: true,
  memberWelcomeText: true,
  memberLayoutStyle: true,
} as const;

const ALLOWED_LAYOUTS = new Set(["netflix", "grid", "list"]);

function errStatus(msg: string) {
  if (msg === "Não autorizado") return 401;
  if (msg === "Sem permissão") return 403;
  return 500;
}

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const staff = await requireStaff();
    if (!(await canEditCourse(staff, params.id))) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const course = await prisma.course.findUnique({
      where: { id: params.id },
      select: SELECT_FIELDS,
    });
    if (!course) {
      return NextResponse.json({ error: "Curso não encontrado" }, { status: 404 });
    }

    return NextResponse.json({ customization: course });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    return NextResponse.json({ error: msg || "Erro" }, { status: errStatus(msg) });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const staff = await requireStaff();
    if (!(await canEditCourse(staff, params.id))) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const body = await request.json();
    const data: Record<string, unknown> = {};

    for (const key of COLOR_FIELDS) {
      if (body[key] !== undefined) {
        if (body[key] === null) {
          data[key] = null;
        } else if (typeof body[key] === "string" && HEX_RE.test(body[key])) {
          data[key] = body[key];
        } else {
          return NextResponse.json({ error: `Cor inválida: ${key}` }, { status: 400 });
        }
      }
    }

    if (body.memberLayoutStyle !== undefined) {
      if (!ALLOWED_LAYOUTS.has(body.memberLayoutStyle)) {
        return NextResponse.json({ error: "Layout inválido" }, { status: 400 });
      }
      data.memberLayoutStyle = body.memberLayoutStyle;
    }

    if (body.memberWelcomeText !== undefined) {
      data.memberWelcomeText = body.memberWelcomeText
        ? String(body.memberWelcomeText).slice(0, 500)
        : null;
    }

    const course = await prisma.course.update({
      where: { id: params.id },
      data,
      select: SELECT_FIELDS,
    });

    return NextResponse.json({ customization: course });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    return NextResponse.json({ error: msg || "Erro" }, { status: errStatus(msg) });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const staff = await requireStaff();
    if (!(await canEditCourse(staff, params.id))) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const data: Record<string, null> = {};
    for (const key of COLOR_FIELDS) data[key] = null;
    data.memberWelcomeText = null;

    const course = await prisma.course.update({
      where: { id: params.id },
      data: { ...data, memberLayoutStyle: "grid" },
      select: SELECT_FIELDS,
    });

    return NextResponse.json({ customization: course });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    return NextResponse.json({ error: msg || "Erro" }, { status: errStatus(msg) });
  }
}
