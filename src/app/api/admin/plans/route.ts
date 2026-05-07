import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminPerm } from "@/lib/admin-permissions-server";
import { createPlanSchema, validateBody } from "@/lib/validations";

export async function GET() {
  try {
    await requireAdminPerm("MANAGE_PLANS");

    const plans = await prisma.plan.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            subscriptions: { where: { status: "ACTIVE" } },
          },
        },
      },
    });

    return NextResponse.json({ plans });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    const status = msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro interno" }, { status });
  }
}

export async function POST(request: Request) {
  try {
    await requireAdminPerm("MANAGE_PLANS");

    const raw = await request.json().catch(() => ({}));
    const v = validateBody(createPlanSchema, raw);
    if (!v.success) return v.error;
    const { name, slug, price, currency, interval, maxWorkspaces, maxCoursesPerWorkspace, features } = v.data;

    const existing = await prisma.plan.findUnique({ where: { slug } });
    if (existing) {
      return NextResponse.json({ error: "Slug já existe" }, { status: 409 });
    }

    const plan = await prisma.plan.create({
      data: {
        name,
        slug,
        price,
        ...(currency && { currency }),
        ...(interval && { interval }),
        ...(maxWorkspaces != null && { maxWorkspaces }),
        ...(maxCoursesPerWorkspace != null && { maxCoursesPerWorkspace }),
        ...(features != null && { features }),
      },
    });

    return NextResponse.json({ plan }, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "";
    const status = msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro interno" }, { status });
  }
}
