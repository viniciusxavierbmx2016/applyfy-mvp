// Usage: node scripts/make-admin.mjs <email>
// Promotes a user to ADMIN role in the database.

import { PrismaClient } from "@prisma/client";

const email = process.argv[2];
if (!email) {
  console.error("Usage: node scripts/make-admin.mjs <email>");
  process.exit(1);
}

const prisma = new PrismaClient();

try {
  const user = await prisma.user.update({
    where: { email },
    data: { role: "ADMIN" },
  });
  console.log(`✅ ${user.email} promovido para ADMIN`);
} catch (err) {
  if (err.code === "P2025") {
    console.error(`❌ Usuário com email "${email}" não encontrado`);
  } else {
    console.error("Erro:", err.message);
  }
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
