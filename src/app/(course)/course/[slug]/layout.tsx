import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { WorkspaceThemeLock } from "@/components/workspace-theme-lock";

const getCourseForceTheme = cache(async (slug: string) => {
  const row = await prisma.course.findUnique({
    where: { slug },
    select: { workspace: { select: { forceTheme: true } } },
  });
  return row?.workspace?.forceTheme ?? null;
});

export default async function CourseSlugLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { slug: string };
}) {
  const forceTheme = await getCourseForceTheme(params.slug);
  return (
    <WorkspaceThemeLock forceTheme={forceTheme}>{children}</WorkspaceThemeLock>
  );
}
