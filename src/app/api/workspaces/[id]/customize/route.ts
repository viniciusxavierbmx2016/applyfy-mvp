import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { canAccessWorkspace } from "@/lib/workspace";
import { createAdminClient } from "@/lib/supabase-admin";

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
  memberBannerUrl: true,
  memberWelcomeText: true,
  memberLayoutStyle: true,
} as const;

const ALLOWED_LAYOUTS = new Set(["netflix", "grid", "list"]);
const BANNER_BUCKET = "thumbnails";
const MAX_BANNER_SIZE = 5 * 1024 * 1024;

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
    if (!(await canAccessWorkspace(staff, params.id))) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const ws = await prisma.workspace.findUnique({
      where: { id: params.id },
      select: SELECT_FIELDS,
    });
    if (!ws) {
      return NextResponse.json({ error: "Workspace não encontrado" }, { status: 404 });
    }

    return NextResponse.json({ customization: ws });
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
    if (!(await canAccessWorkspace(staff, params.id))) {
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

    if (body.memberBannerUrl !== undefined) {
      data.memberBannerUrl = body.memberBannerUrl || null;
    }

    const ws = await prisma.workspace.update({
      where: { id: params.id },
      data,
      select: SELECT_FIELDS,
    });

    return NextResponse.json({ customization: ws });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    return NextResponse.json({ error: msg || "Erro" }, { status: errStatus(msg) });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const staff = await requireStaff();
    if (!(await canAccessWorkspace(staff, params.id))) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Arquivo obrigatório" }, { status: 400 });
    }
    if (file.size > MAX_BANNER_SIZE) {
      return NextResponse.json({ error: "Máximo 5MB" }, { status: 400 });
    }
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Apenas imagens" }, { status: 400 });
    }

    const ext = file.name.split(".").pop() || "png";
    const storagePath = `workspaces/${params.id}/banner.${ext}`;

    const supabase = createAdminClient();
    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from(BANNER_BUCKET)
      .upload(storagePath, arrayBuffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json({ error: "Erro no upload" }, { status: 500 });
    }

    const { data: publicUrl } = supabase.storage
      .from(BANNER_BUCKET)
      .getPublicUrl(storagePath);

    await prisma.workspace.update({
      where: { id: params.id },
      data: { memberBannerUrl: publicUrl.publicUrl },
    });

    return NextResponse.json({ bannerUrl: publicUrl.publicUrl });
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
    if (!(await canAccessWorkspace(staff, params.id))) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const data: Record<string, null> = {};
    for (const key of COLOR_FIELDS) data[key] = null;
    data.memberBannerUrl = null;
    data.memberWelcomeText = null;

    const ws = await prisma.workspace.update({
      where: { id: params.id },
      data: { ...data, memberLayoutStyle: "grid" },
      select: SELECT_FIELDS,
    });

    return NextResponse.json({ customization: ws });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    return NextResponse.json({ error: msg || "Erro" }, { status: errStatus(msg) });
  }
}
