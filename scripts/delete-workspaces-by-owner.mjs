// Usage: node scripts/delete-workspaces-by-owner.mjs <producer-email>
import { PrismaClient } from "@prisma/client";

const email = process.argv[2];
if (!email) {
  console.error("Usage: node scripts/delete-workspaces-by-owner.mjs <email>");
  process.exit(1);
}

const prisma = new PrismaClient();

try {
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, role: true },
  });
  if (!user) {
    console.error(`❌ Usuário "${email}" não encontrado`);
    process.exit(1);
  }

  const workspaces = await prisma.workspace.findMany({
    where: { ownerId: user.id },
    select: { id: true, slug: true, name: true },
  });

  if (workspaces.length === 0) {
    console.log("Nenhum workspace para remover.");
    process.exit(0);
  }

  for (const w of workspaces) {
    const result = await prisma.workspace.delete({ where: { id: w.id } });
    console.log(`🗑️  Removido: ${result.name} (slug: ${result.slug}, id: ${result.id})`);
  }

  console.log(`\n✅ ${workspaces.length} workspace(s) removido(s) do owner ${user.email}`);
} catch (err) {
  console.error("Erro:", err.message);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
