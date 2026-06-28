import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { resolveStaffWorkspace, requireWorkspaceOwner } from "@/lib/workspace";
import { producerSettingsSchema, validateBody } from "@/lib/validations";

// Admin-only globals (no per-workspace scoping)
const ADMIN_KEYS = new Set(["stripe_webhook_secret"]);
// Per-workspace keys: stored as `<key>:<workspaceId>` so each producer's token
// is isolated. The producer UI still talks in plain key names ("applyfy_token");
// the route resolves the workspace and translates on read/write.
const WORKSPACE_KEYS = new Set(["applyfy_token"]);

function workspaceKey(key: string, workspaceId: string) {
  return `${key}:${workspaceId}`;
}

export async function GET() {
  try {
    const staff = await requireStaff();
    const canAdmin = staff.role === "ADMIN";
    const { workspace } = await resolveStaffWorkspace(staff);

    const masked: Record<string, { set: boolean; preview: string }> = {};

    if (workspace) {
      const wsKeys = Array.from(WORKSPACE_KEYS).map((k) =>
        workspaceKey(k, workspace.id)
      );
      const rows = await prisma.settings.findMany({
        where: { key: { in: wsKeys } },
      });
      const map: Record<string, string> = {};
      for (const r of rows) map[r.key] = r.value;
      for (const k of WORKSPACE_KEYS) {
        const v = map[workspaceKey(k, workspace.id)] || "";
        masked[k] = {
          set: v.length > 0,
          preview: v ? `••••${v.slice(-4)}` : "",
        };
      }
    } else {
      for (const k of WORKSPACE_KEYS) {
        masked[k] = { set: false, preview: "" };
      }
    }

    if (canAdmin) {
      const adminRows = await prisma.settings.findMany({
        where: { key: { in: Array.from(ADMIN_KEYS) } },
      });
      const adminMap: Record<string, string> = {};
      for (const r of adminRows) adminMap[r.key] = r.value;
      for (const k of ADMIN_KEYS) {
        const v = adminMap[k] || "";
        masked[k] = {
          set: v.length > 0,
          preview: v ? `••••${v.slice(-4)}` : "",
        };
      }
    }

    return NextResponse.json({ settings: masked });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    const status =
      msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}

export async function PUT(request: Request) {
  try {
    const staff = await requireStaff();
    const canAdmin = staff.role === "ADMIN";
    const { workspace } = await resolveStaffWorkspace(staff);

    const raw = await request.json().catch(() => ({}));
    const v = validateBody(producerSettingsSchema, raw);
    if (!v.success) return v.error;
    const updates = v.data.settings;

    // FURO#3 — applyfy_token é o segredo do webhook de pagamento. Escrevê-lo
    // (setar OU limpar) é ação owner-only, igual às rotas applyfy-tokens. As
    // demais chaves seguem o gate atual (colaborador mexe em settings não-pagamento).
    const touchesWorkspaceSecret = Object.keys(updates).some((k) =>
      WORKSPACE_KEYS.has(k)
    );
    if (touchesWorkspaceSecret) {
      if (!workspace) {
        return NextResponse.json(
          { error: "Nenhum workspace ativo." },
          { status: 400 }
        );
      }
      const gate = await requireWorkspaceOwner(staff, workspace.id);
      if (!gate.ok) return gate.response;
    }

    for (const key of Object.keys(updates)) {
      const value = updates[key];

      if (WORKSPACE_KEYS.has(key)) {
        if (!workspace) {
          return NextResponse.json(
            { error: "Nenhum workspace ativo. Selecione um workspace antes de salvar o token." },
            { status: 400 }
          );
        }
        const storeKey = workspaceKey(key, workspace.id);
        if (value === null || value === "") {
          await prisma.settings.deleteMany({ where: { key: storeKey } });
        } else if (typeof value === "string") {
          await prisma.settings.upsert({
            where: { key: storeKey },
            create: { key: storeKey, value },
            update: { value },
          });
        }
        continue;
      }

      if (ADMIN_KEYS.has(key)) {
        if (!canAdmin) continue;
        if (value === null || value === "") {
          await prisma.settings.deleteMany({ where: { key } });
        } else if (typeof value === "string") {
          await prisma.settings.upsert({
            where: { key },
            create: { key, value },
            update: { value },
          });
        }
        continue;
      }
      // unknown key → ignore
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("PUT /api/admin/settings error:", error);
    const msg = error instanceof Error ? error.message : "";
    const status =
      msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}
