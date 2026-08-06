import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { requireWorkspaceOwner } from "@/lib/workspace";
import { updateWorkspaceSchema, validateBody } from "@/lib/validations";

// Fonte própria da tela de edição do workspace. Antes ela buscava a LISTA
// inteira (GET /api/workspaces) e filtrava no client — o que obrigava as outras
// cinco consumidoras da lista a receber o payload completo, masterPassword
// incluída. Aqui o payload é o que essa tela lê, e nada mais.
//
// ⚠️ O select foi montado a partir dos campos LIDOS NO CÓDIGO da tela, não do
// tipo Workspace de _types.ts — ele está desatualizado em 4 (loginTextColor,
// loginSecondaryTextColor, supportEmail, supportWhatsapp). E `tsc` não protege:
// r.json() é `any`, então found.<campo> nunca é checado. Campo faltando aqui
// vira undefined em runtime, cai no `|| DEFAULT` da tela e é REGRAVADO por cima
// no próximo save. Conferir contra a tela, nunca contra o tipo nem contra o
// compilador.
//
// Gate idêntico ao do PATCH/DELETE. A ordem importa: requireWorkspaceOwner já
// devolve 403 quando o PRODUCER não é dono — inclusive para id inexistente, o
// que não vaza existência. O 404 abaixo só é alcançável por ADMIN, que passa
// pelo gate sem consultar a linha.
export async function GET(_request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const staff = await requireStaff();
    const gate = await requireWorkspaceOwner(staff, params.id);
    if (!gate.ok) return gate.response;

    const workspace = await prisma.workspace.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        slug: true,
        name: true,
        logoUrl: true,
        isActive: true,
        masterPassword: true,
        loginLayout: true,
        loginBgImageUrl: true,
        loginBgColor: true,
        loginPrimaryColor: true,
        loginLogoUrl: true,
        loginTitle: true,
        loginSubtitle: true,
        loginBoxColor: true,
        loginBoxOpacity: true,
        loginSideColor: true,
        loginLinkColor: true,
        loginTextColor: true,
        loginSecondaryTextColor: true,
        accentColor: true,
        bannerUrl: true,
        bannerPosition: true,
        faviconUrl: true,
        forceTheme: true,
        customDomain: true,
        supportEmail: true,
        supportWhatsapp: true,
        emailLogoUrl: true,
        emailPrimaryColor: true,
        emailBgColor: true,
        emailBoxColor: true,
        emailTitle: true,
        emailBody: true,
        emailFooter: true,
        emailCustomHtml: true,
        emailUseCustomHtml: true,
        _count: { select: { courses: true, members: true } },
      },
    });
    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace não encontrado" },
        { status: 404 }
      );
    }
    return NextResponse.json({ workspace });
  } catch (error) {
    console.error("GET /api/workspaces/[id] error:", error);
    const msg = error instanceof Error ? error.message : "";
    const status =
      msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}

export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const staff = await requireStaff();
    const gate = await requireWorkspaceOwner(staff, params.id);
    if (!gate.ok) return gate.response;

    const raw = await request.json().catch(() => ({}));
    const v = validateBody(updateWorkspaceSchema, raw);
    if (!v.success) return v.error;
    const body: Record<string, unknown> = v.data;
    const data: Record<string, unknown> = {};
    const hexRe = /^#[0-9a-fA-F]{6}$/;
    const allowedLayouts = new Set(["central", "lateral-left", "lateral-right"]);

    if (typeof body?.name === "string") data.name = body.name.trim();
    if (body?.logoUrl === null || typeof body?.logoUrl === "string")
      data.logoUrl = body.logoUrl || null;
    if (typeof body?.isActive === "boolean") data.isActive = body.isActive;
    if (typeof body?.emailUseCustomHtml === "boolean")
      data.emailUseCustomHtml = body.emailUseCustomHtml;
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
      "loginTextColor",
      "loginSecondaryTextColor",
      "accentColor",
      "emailPrimaryColor",
      "emailBgColor",
      "emailBoxColor",
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
      "emailLogoUrl",
      "emailTitle",
      "emailBody",
      "emailFooter",
      "emailCustomHtml",
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

    // Contato de suporte do workspace — fallback do curso, antes do dono.
    // Zod cuida do tamanho; formato é validado aqui, como o resto da rota.
    if (body?.supportEmail !== undefined) {
      const raw = body.supportEmail;
      const v = typeof raw === "string" ? raw.trim().toLowerCase() : "";
      if (v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
        return NextResponse.json({ error: "Email de suporte inválido" }, { status: 400 });
      }
      data.supportEmail = v || null;
    }
    if (body?.supportWhatsapp !== undefined) {
      const raw = body.supportWhatsapp;
      const digits = typeof raw === "string" ? raw.replace(/\D/g, "") : "";
      if (digits && digits.length < 8) {
        return NextResponse.json({ error: "WhatsApp de suporte inválido" }, { status: 400 });
      }
      data.supportWhatsapp = digits || null;
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

export async function DELETE(_request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const staff = await requireStaff();
    const gate = await requireWorkspaceOwner(staff, params.id);
    if (!gate.ok) return gate.response;
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
