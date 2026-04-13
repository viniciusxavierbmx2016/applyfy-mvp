// Usage: node scripts/create-workspace.mjs <producer-email> <slug> <name>
// Creates a Workspace owned by the given PRODUCER (or ADMIN) user.

import { PrismaClient } from "@prisma/client";

const [email, slug, ...nameParts] = process.argv.slice(2);
const name = nameParts.join(" ");

if (!email || !slug || !name) {
  console.error(
    'Usage: node scripts/create-workspace.mjs <producer-email> <slug> "<name>"'
  );
  process.exit(1);
}

if (!/^[a-z0-9-]+$/.test(slug)) {
  console.error("❌ Slug inválido: use apenas letras minúsculas, números e hífens");
  process.exit(1);
}

const prisma = new PrismaClient();

try {
  const owner = await prisma.user.findUnique({ where: { email } });
  if (!owner) {
    console.error(`❌ Usuário com email "${email}" não encontrado`);
    process.exit(1);
  }
  if (owner.role !== "PRODUCER" && owner.role !== "ADMIN") {
    console.error(
      `❌ Usuário precisa ter role PRODUCER ou ADMIN (atual: ${owner.role})`
    );
    process.exit(1);
  }

  const existing = await prisma.workspace.findUnique({ where: { slug } });
  if (existing) {
    console.error(`❌ Slug "${slug}" já está em uso`);
    process.exit(1);
  }

  const workspace = await prisma.workspace.create({
    data: { slug, name, ownerId: owner.id },
  });

  console.log(`✅ Workspace criado: ${workspace.name}`);
  console.log(`   Slug:  ${workspace.slug}`);
  console.log(`   URL:   /w/${workspace.slug}`);
  console.log(`   Owner: ${owner.email}`);
} catch (err) {
  console.error("Erro:", err.message);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
