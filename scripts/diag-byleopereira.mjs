// READ-ONLY diagnostics for byleopereira@gmail.com
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const email = "byleopereira@gmail.com";

try {
  console.log("=== 1. User ===");
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      role: true,
      name: true,
      workspaceId: true,
      createdAt: true,
    },
  });
  console.log(user);

  if (!user) process.exit(0);

  console.log("\n=== 2. Subscription ===");
  const subs = await prisma.subscription.findMany({
    where: { userId: user.id },
    select: { id: true, status: true, currentPeriodEnd: true, createdAt: true },
  });
  console.log(subs);

  console.log("\n=== 3. Session ===");
  const sessions = await prisma.session.findMany({
    where: { userId: user.id },
    select: { id: true, expiresAt: true, createdAt: true },
  });
  console.log(sessions);

  console.log("\n=== 6. Workspaces owned ===");
  const workspaces = await prisma.workspace.findMany({
    where: { ownerId: user.id },
    select: { id: true, slug: true, name: true },
  });
  console.log(workspaces);

  console.log("\n=== 7. WorkspaceCredentials ===");
  const wcred = await prisma.workspaceCredential.findMany({
    where: { userId: user.id },
    select: { id: true, workspaceId: true, createdAt: true },
  });
  console.log(wcred);

  console.log("\n=== 8. Collaborator rows ===");
  const collab = await prisma.collaborator.findMany({
    where: { userId: user.id },
    select: { id: true, workspaceId: true, status: true },
  });
  console.log(collab);

  console.log("\n=== 9. AdminCollaborator ===");
  const adminCollab = await prisma.adminCollaborator.findUnique({
    where: { userId: user.id },
    select: { id: true, status: true },
  });
  console.log(adminCollab);
} finally {
  await prisma.$disconnect();
}
