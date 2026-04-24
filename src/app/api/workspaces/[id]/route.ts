import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { canAccessWorkspace } from "@/lib/workspace";

export async function PATCH(
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
    const hexRe = /^#[0-9a-fA-F]{6}$/;
    const allowedLayouts = new Set(["central", "lateral-left", "lateral-right"]);

    if (typeof body?.name === "string") data.name = body.name.trim();
    if (body?.logoUrl === null || typeof body?.logoUrl === "string")
      data.logoUrl = body.logoUrl || null;
    if (typeof body?.isActive === "boolean") data.isActive = body.isActive;
    if (body?.masterPassword === null || typeof body?.masterPassword === "string")
      data.masterPassword = body.masterPassword
        ? String(body.masterPassword).trim() || null
        : null;

    if (typeof body?.loginLayout === "string") {
      if (!allowedLayouts.has(body.loginLayout)) {
        return NextResponse.json(
          { error: "loginLayout inválido" },
          { status: 400 }
        );
      }
      data.loginLayout = body.loginLayout;
    }

    for (const key of [
      "loginBgColor",
      "loginPrimaryColor",
      "loginBoxColor",
      "loginSideColor",
      "loginLinkColor",
      "accentColor",
    ] as const) {
      if (body?.[key] === null) {
        data[key] = null;
      } else if (typeof body?.[key] === "string") {
        const v = (body[key] as string).trim();
        if (v && !hexRe.test(v)) {
          return NextResponse.json(
            { error: `${key} deve ser hex (#RRGGBB)` },
            { status: 400 }
          );
        }
        data[key] = v || null;
      }
    }

    if (body?.loginBoxOpacity === null) {
      data.loginBoxOpacity = null;
    } else if (typeof body?.loginBoxOpacity === "number") {
      const v = body.loginBoxOpacity;
      if (!Number.isFinite(v) || v < 0 || v > 1) {
        return NextResponse.json(
          { error: "loginBoxOpacity deve estar entre 0 e 1" },
          { status: 400 }
        );
      }
      data.loginBoxOpacity = v;
    }

    for (const key of [
      "loginBgImageUrl",
      "loginLogoUrl",
      "loginTitle",
      "loginSubtitle",
      "faviconUrl",
      "customDomain",
      "bannerUrl",
      "bannerPosition",
    ] as const) {
      if (body?.[key] === null) {
        data[key] = null;
      } else if (typeof body?.[key] === "string") {
        const v = (body[key] as string).trim();
        data[key] = v || null;
      }
    }

    if (body?.forceTheme === null || body?.forceTheme === "") {
      data.forceTheme = null;
    } else if (typeof body?.forceTheme === "string") {
      if (body.forceTheme !== "light" && body.forceTheme !== "dark") {
        return NextResponse.json(
          { error: "forceTheme deve ser 'light', 'dark' ou null" },
          { status: 400 }
        );
      }
      data.forceTheme = body.forceTheme;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Nada a atualizar" }, { status: 400 });
    }

    const workspace = await prisma.workspace.update({
      where: { id: params.id },
      data,
    });
    return NextResponse.json({ workspace });
  } catch (error) {
    console.error("PATCH /api/workspaces/[id] error:", error);
    const msg = error instanceof Error ? error.message : "";
    const status =
      msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
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
    // Soft delete: just deactivate.
    const workspace = await prisma.workspace.update({
      where: { id: params.id },
      data: { isActive: false },
    });
    return NextResponse.json({ workspace });
  } catch (error) {
    console.error("DELETE /api/workspaces/[id] error:", error);
    const msg = error instanceof Error ? error.message : "";
    const status =
      msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}
