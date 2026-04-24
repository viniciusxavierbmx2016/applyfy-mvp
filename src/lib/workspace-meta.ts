import { cache } from "react";
import { prisma } from "@/lib/prisma";

export const getWorkspaceMeta = cache(async (slug: string) =>
  prisma.workspace.findUnique({
    where: { slug },
    select: {
      isActive: true,
      name: true,
      faviconUrl: true,
      forceTheme: true,
      accentColor: true,
    },
  })
);
