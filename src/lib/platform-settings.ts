import { prisma } from "@/lib/prisma";

let cached: { logoUrl: string | null; faviconUrl: string | null } | null = null;
let cachedAt = 0;
const TTL = 60_000;

export async function getPlatformSettings() {
  if (cached && Date.now() - cachedAt < TTL) return cached;

  const settings = await prisma.platformSettings
    .findUnique({ where: { id: "platform" } })
    .catch(() => null);

  cached = {
    logoUrl: settings?.logoUrl ?? null,
    faviconUrl: settings?.faviconUrl ?? null,
  };
  cachedAt = Date.now();
  return cached;
}

export function invalidatePlatformSettingsCache() {
  cached = null;
  cachedAt = 0;
}
