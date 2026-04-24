import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: { slug: string } }
) {
  const workspace = await prisma.workspace.findUnique({
    where: { slug: params.slug },
    select: { name: true, logoUrl: true },
  });

  const name = workspace?.name || "Members Club";
  const logoUrl = workspace?.logoUrl;

  const icons = logoUrl
    ? [
        { src: logoUrl, sizes: "192x192", type: "image/png", purpose: "any" },
        { src: logoUrl, sizes: "512x512", type: "image/png", purpose: "any" },
        { src: logoUrl, sizes: "192x192", type: "image/png", purpose: "maskable" },
        { src: logoUrl, sizes: "512x512", type: "image/png", purpose: "maskable" },
      ]
    : [
        { src: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
        { src: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
        { src: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      ];

  const manifest = {
    name,
    short_name: name.length > 12 ? name.slice(0, 12) : name,
    description: `Área de membros - ${name}`,
    start_url: `/w/${params.slug}`,
    display: "standalone",
    background_color: "#0a0a1a",
    theme_color: "#0a0a1a",
    orientation: "portrait-primary",
    icons,
  };

  return new NextResponse(JSON.stringify(manifest), {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
