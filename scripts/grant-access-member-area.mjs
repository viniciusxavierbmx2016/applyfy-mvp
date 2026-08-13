/**
 * Retroatividade do ACCESS_MEMBER_AREA (COMANDO B2).
 *
 * Concede a permissão a todo Collaborator ACCEPTED que ainda não a tem — é o
 * acesso que eles JÁ EXERCEM hoje (o vínculo abria a área de membros sem
 * controle nenhum); a permissão só tornou isso revogável pelo dono.
 *
 * ⚠️ ORDEM DE DEPLOY (runbook da casa): rodar ANTES do push do merge. O código
 * novo exige a permissão nas 3 portas; se ele chegar primeiro, os colaboradores
 * existentes perdem a entrada até o script rodar.
 *
 * IDEMPOTENTE: `NOT (permissions @> ARRAY[...])` — rodar duas vezes não duplica
 * e a segunda execução afeta 0 linhas.
 *
 *   DRY-RUN:  node scripts/grant-access-member-area.mjs
 *   EXECUTAR: node scripts/grant-access-member-area.mjs APLICAR
 *   (staging:  npx dotenv -e .env.staging -- node scripts/... )
 */
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { PrismaClient } = require("@prisma/client");

const PROD = "wyamxwmdgbvqrfcqfbyh", STG = "wxynnsyartxcvglqwmdw";
const PERM = "ACCESS_MEMBER_AREA";
const DB = process.env.DIRECT_URL || process.env.DATABASE_URL || "";
const ref = (DB.match(/([a-z]{20})/) || [])[1];
const alvo = ref === PROD ? "PRODUÇÃO" : ref === STG ? "staging" : "DESCONHECIDO";
console.log(`SUPABASE_REF: ${ref} = ${alvo}`);
if (alvo === "DESCONHECIDO") {
  console.error("🔴 REF não reconhecido — ABORTANDO");
  process.exit(1);
}

const APLICAR = process.argv[2] === "APLICAR";
console.log(`MODO: ${APLICAR ? "🔴 APLICAR (escrita)" : "DRY-RUN (nenhuma escrita)"}`);

const p = new PrismaClient({ datasources: { db: { url: DB } } });

const antes = await p.$queryRawUnsafe(`
  SELECT c.email, w.slug AS ws, (c.permissions @> ARRAY['${PERM}']) AS ja_tem
  FROM "Collaborator" c JOIN "Workspace" w ON w.id = c."workspaceId"
  WHERE c.status = 'ACCEPTED' ORDER BY w.slug, c.email`);
const faltando = antes.filter((r) => !r.ja_tem);

console.log(`\n  ACCEPTED total: ${antes.length}`);
console.log(`  já têm ${PERM}: ${antes.length - faltando.length}`);
console.log(`  RECEBERÃO agora: ${faltando.length}`);
for (const r of faltando) console.log(`    + ${r.email.padEnd(36)} ws=${r.ws}`);

if (!APLICAR) {
  console.log("\n  DRY-RUN encerrado. Nada escrito.");
  await p.$disconnect();
  process.exit(0);
}

const n = await p.$executeRawUnsafe(`
  UPDATE "Collaborator"
  SET permissions = array_append(permissions, '${PERM}')
  WHERE status = 'ACCEPTED' AND NOT (permissions @> ARRAY['${PERM}'])`);
console.log(`\n  linhas atualizadas: ${n}`);

const depois = await p.$queryRawUnsafe(`
  SELECT COUNT(*)::int AS n FROM "Collaborator"
  WHERE status = 'ACCEPTED' AND NOT (permissions @> ARRAY['${PERM}'])`);
console.log(`  ACCEPTED ainda SEM a permissão: ${depois[0].n} ${depois[0].n === 0 ? "✅" : "🔴"}`);
await p.$disconnect();
