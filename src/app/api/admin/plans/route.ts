import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();

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
    const status = msg === "Unauthorized" ? 401 : msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro interno" }, { status });
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();

    const body = await request.json();
    const { name, slug, price, currency, interval, maxWorkspaces, maxCoursesPerWorkspace, features } = body;

    if (!name || !slug || price == null) {
      return NextResponse.json({ error: "name, slug e price são obrigatórios" }, { status: 400 });
    }

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
    const status = msg === "Unauthorized" ? 401 : msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro interno" }, { status });
  }
}
