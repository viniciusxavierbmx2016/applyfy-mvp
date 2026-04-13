import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const workspace = await prisma.workspace.findUnique({
      where: { slug: params.slug },
      select: {
        id: true,
        slug: true,
        name: true,
        logoUrl: true,
        loginBgColor: true,
        isActive: true,
      },
    });
    if (!workspace || !workspace.isActive) {
      return NextResponse.json(
        { error: "Workspace não encontrado" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { workspace },
      {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      }
    );
  } catch (error) {
    console.error("GET /api/w/[slug] error:", error);
    return NextResponse.json({ error: "Erro" }, { status: 500 });
  }
}
