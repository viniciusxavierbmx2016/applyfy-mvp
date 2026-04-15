import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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
          "Cache-Control": "private, no-store, max-age=0, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error("GET /api/w/[slug] error:", error);
    return NextResponse.json({ error: "Erro" }, { status: 500 });
  }
}
