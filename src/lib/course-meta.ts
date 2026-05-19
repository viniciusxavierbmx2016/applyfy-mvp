import { cache } from "react";
import { prisma } from "@/lib/prisma";

export const getCourseMeta = cache(async (slug: string) => {
  const course = await prisma.course.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      ownerId: true,
      title: true,
      bannerUrl: true,
      memberBgColor: true,
      memberSidebarColor: true,
      memberHeaderColor: true,
      memberCardColor: true,
      memberPrimaryColor: true,
      memberTextColor: true,
      memberWelcomeText: true,
      memberLayoutStyle: true,
      termsContent: true,
      termsFileUrl: true,
      workspace: {
        select: {
          id: true,
          name: true,
          logoUrl: true,
          slug: true,
          ownerId: true,
        },
      },
    },
  });
  return course;
});
