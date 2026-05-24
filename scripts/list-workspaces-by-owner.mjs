// Usage: node scripts/list-workspaces-by-owner.mjs <producer-email>
import { PrismaClient } from "@prisma/client";

const email = process.argv[2];
if (!email) {
  console.error("Usage: node scripts/list-workspaces-by-owner.mjs <email>");
  process.exit(1);
}

const prisma = new PrismaClient();

try {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, role: true },
  });
  if (!user) {
    console.error(`❌ Usuário "${email}" não encontrado`);
    process.exit(1);
  }
  console.log("Owner:", user);

  const workspaces = await prisma.workspace.findMany({
    where: { ownerId: user.id },
    select: {
      id: true,
      slug: true,
      name: true,
      createdAt: true,
      _count: {
        select: {
          courses: true,
          members: true,
          collaborators: true,
          transactions: true,
          webhookLogs: true,
          automations: true,
          tags: true,
          lives: true,
          workspaceCredentials: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  console.log(`\nFound ${workspaces.length} workspace(s):`);
  for (const w of workspaces) {
    console.log(JSON.stringify(w, null, 2));
  }
} finally {
  await prisma.$disconnect();
}
