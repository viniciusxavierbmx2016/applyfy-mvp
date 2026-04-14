import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const ADMIN_EMAIL = "viniciusxavierbmx2016@gmail.com";

async function main() {
  const admin = await prisma.user.findUnique({
    where: { email: ADMIN_EMAIL },
    select: { id: true, role: true },
  });

  if (!admin) {
    console.error(`User ${ADMIN_EMAIL} não encontrado.`);
    process.exit(1);
  }

  console.log(`Admin: ${ADMIN_EMAIL} (${admin.id}) — role: ${admin.role}`);

  const workspaces = await prisma.workspace.findMany({
    where: { ownerId: admin.id },
    select: { id: true, slug: true },
  });
  const workspaceIds = workspaces.map((w) => w.id);
  console.log(
    `Workspaces a remover (${workspaces.length}):`,
    workspaces.map((w) => w.slug).join(", ") || "(nenhum)"
  );

  const courses = workspaceIds.length
    ? await prisma.course.findMany({
        where: { workspaceId: { in: workspaceIds } },
        select: { id: true, slug: true },
      })
    : [];
  const courseIds = courses.map((c) => c.id);
  console.log(`Cursos a remover (${courses.length})`);

  const modules = courseIds.length
    ? await prisma.module.findMany({
        where: { courseId: { in: courseIds } },
        select: { id: true },
      })
    : [];
  const moduleIds = modules.map((m) => m.id);

  const lessons = moduleIds.length
    ? await prisma.lesson.findMany({
        where: { moduleId: { in: moduleIds } },
        select: { id: true },
      })
    : [];
  const lessonIds = lessons.map((l) => l.id);

  const posts = courseIds.length
    ? await prisma.post.findMany({
        where: { courseId: { in: courseIds } },
        select: { id: true },
      })
    : [];
  const postIds = posts.map((p) => p.id);

  const enrollments = courseIds.length
    ? await prisma.enrollment.findMany({
        where: { courseId: { in: courseIds } },
        select: { id: true },
      })
    : [];
  const enrollmentIds = enrollments.map((e) => e.id);

  const counts = {};

  await prisma.$transaction(async (tx) => {
    if (enrollmentIds.length) {
      counts.enrollmentOverride = (
        await tx.enrollmentOverride.deleteMany({
          where: { enrollmentId: { in: enrollmentIds } },
        })
      ).count;
    } else counts.enrollmentOverride = 0;

    if (lessonIds.length) {
      counts.lessonProgress = (
        await tx.lessonProgress.deleteMany({
          where: { lessonId: { in: lessonIds } },
        })
      ).count;
      counts.lessonComment = (
        await tx.lessonComment.deleteMany({
          where: { lessonId: { in: lessonIds } },
        })
      ).count;
    } else {
      counts.lessonProgress = 0;
      counts.lessonComment = 0;
    }

    if (postIds.length) {
      counts.comment = (
        await tx.comment.deleteMany({ where: { postId: { in: postIds } } })
      ).count;
      counts.like = (
        await tx.like.deleteMany({ where: { postId: { in: postIds } } })
      ).count;
      counts.post = (
        await tx.post.deleteMany({ where: { id: { in: postIds } } })
      ).count;
    } else {
      counts.comment = 0;
      counts.like = 0;
      counts.post = 0;
    }

    counts.notification = (
      await tx.notification.deleteMany({ where: { userId: admin.id } })
    ).count;

    if (workspaceIds.length) {
      counts.webhookLog = (
        await tx.webhookLog.deleteMany({
          where: { workspaceId: { in: workspaceIds } },
        })
      ).count;
    } else counts.webhookLog = 0;

    if (courseIds.length) {
      counts.menuItem = (
        await tx.menuItem.deleteMany({
          where: { courseId: { in: courseIds } },
        })
      ).count;
      counts.review = (
        await tx.review.deleteMany({
          where: { courseId: { in: courseIds } },
        })
      ).count;
      counts.certificate = (
        await tx.certificate.deleteMany({
          where: { courseId: { in: courseIds } },
        })
      ).count;
      counts.enrollment = (
        await tx.enrollment.deleteMany({
          where: { courseId: { in: courseIds } },
        })
      ).count;
    } else {
      counts.menuItem = 0;
      counts.review = 0;
      counts.certificate = 0;
      counts.enrollment = 0;
    }

    if (lessonIds.length) {
      counts.lesson = (
        await tx.lesson.deleteMany({ where: { id: { in: lessonIds } } })
      ).count;
    } else counts.lesson = 0;

    if (moduleIds.length) {
      counts.module = (
        await tx.module.deleteMany({ where: { id: { in: moduleIds } } })
      ).count;
    } else counts.module = 0;

    if (courseIds.length) {
      counts.section = (
        await tx.section.deleteMany({
          where: { courseId: { in: courseIds } },
        })
      ).count;
      counts.course = (
        await tx.course.deleteMany({ where: { id: { in: courseIds } } })
      ).count;
    } else {
      counts.section = 0;
      counts.course = 0;
    }

    if (workspaceIds.length) {
      counts.collaborator = (
        await tx.collaborator.deleteMany({
          where: { workspaceId: { in: workspaceIds } },
        })
      ).count;
      counts.workspace = (
        await tx.workspace.deleteMany({
          where: { id: { in: workspaceIds } },
        })
      ).count;
    } else {
      counts.collaborator = 0;
      counts.workspace = 0;
    }

    counts.integrationRequest = (
      await tx.integrationRequest.deleteMany({})
    ).count;
  });

  console.log("\nDeletados:");
  for (const [table, n] of Object.entries(counts)) {
    console.log(`  ${table.padEnd(22)} ${n}`);
  }

  if (admin.role !== "ADMIN") {
    await prisma.user.update({
      where: { id: admin.id },
      data: { role: "ADMIN" },
    });
    console.log(`\nRole do admin atualizada para ADMIN.`);
  } else {
    console.log(`\nUser preservado como ADMIN.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
