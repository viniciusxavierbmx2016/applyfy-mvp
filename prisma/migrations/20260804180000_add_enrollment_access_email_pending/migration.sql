-- FASE 6B (reenvio na reativacao, fatia A) — marca explicita de acesso represado.
--
-- NOT NULL com DEFAULT false: o Postgres preenche TODAS as matriculas existentes
-- (22.378 em producao no momento do desenho) com false na propria migracao. Sem
-- backfill, e sem nenhuma delas entrar na lista de reenvio — elas ja receberam email.
--
-- A coluna nasce INERTE: nenhum codigo escreve nem le ate a fatia B.

-- AlterTable
ALTER TABLE "Enrollment" ADD COLUMN "accessEmailPending" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
-- Indice PARCIAL: a fila e a excecao, nao a regra. Um B-tree completo sobre um
-- boolean com 100% de false nao seria usado pelo planner (seq scan e mais barato);
-- o parcial indexa so as linhas em fila e ocupa quase nada.
-- ⚠️ O Prisma nao modela indice parcial, por isso NAO ha @@index no schema.
-- Se algum dia rodar `migrate diff`, esta e a divergencia esperada.
CREATE INDEX "Enrollment_accessEmailPending_idx"
  ON "Enrollment"("accessEmailPending") WHERE "accessEmailPending" = true;
