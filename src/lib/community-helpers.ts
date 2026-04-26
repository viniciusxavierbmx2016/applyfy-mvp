import { prisma } from "@/lib/prisma";

export async function ensureDefaultGroup(courseId: string) {
  const existing = await prisma.communityGroup.findFirst({
    where: { courseId, isDefault: true },
  });
  if (existing) return existing;

  return prisma.communityGroup.create({
    data: {
      name: "Geral",
      slug: "geral",
      courseId,
      isDefault: true,
      permission: "READ_WRITE",
      order: 0,
    },
  });
}
