/**
 * SEED DO PALCO DE STAGING — elenco completo para as matrizes de persona.
 *
 * Idempotente: rodar N vezes converge ao mesmo estado. Cada bloco confere
 * existência antes de criar, e o que já existe é reportado como "já existia".
 *
 * ⛔ SÓ RODA EM STAGING. A prova dupla aborta se o REF for produção.
 *
 *   npx dotenv -e .env.staging -- node scripts/seed-staging.mjs
 *
 * Caminho REAL sempre que existe rota (registro, convite, aceite, criação de
 * curso/workspace/post). O que é semeado por Prisma está marcado com
 * ⚠️ FORA DO CAMINHO REAL e tem o motivo escrito ao lado — são três casos:
 *   1. Subscription EXEMPT — não há rota (é checkout de verdade);
 *   2. role=ADMIN — não há rota que promova alguém a ADMIN de plataforma;
 *   3. escopo de curso do colaborador — o POST cria com escopo total; o
 *      PATCH ajusta, e usá-lo é caminho real (a tela faz isso).
 *
 * PRÉ-REQUISITO: `npm run dev:staging` de pé em http://localhost:3000.
 */
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { PrismaClient } = require("@prisma/client");

const PROD = "wyamxwmdgbvqrfcqfbyh", STG = "wxynnsyartxcvglqwmdw";
const DB = process.env.DIRECT_URL || process.env.DATABASE_URL || "";
const SB = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const refs = [...new Set([...(DB + " " + SB).matchAll(/([a-z]{20})/g)].map((m) => m[1]))].filter((r) => r === PROD || r === STG);
console.log("SUPABASE_REF: " + refs.join(",") + (refs.includes(STG) && !refs.includes(PROD) ? " = STAGING ✅" : " 🔴"));
if (refs.includes(PROD) || !refs.includes(STG)) { console.error("🔴 ABORTANDO — alvo não é staging"); process.exit(1); }

const BASE = process.env.SEED_BASE_URL || "http://localhost:3000";
const SENHA = "Staging@2026!";
const p = new PrismaClient({ datasources: { db: { url: DB } } });

function jar() { const c = {}; return {
  set(r) { for (const s of r.headers.getSetCookie?.() ?? []) { const [kv] = s.split(";"); const i = kv.indexOf("="); c[kv.slice(0, i)] = kv.slice(i + 1); } },
  header() { return Object.entries(c).map(([k, v]) => k + "=" + v).join("; "); } }; }
async function req(m, path, body, ck) {
  const r = await fetch(BASE + path, { method: m,
    headers: { "Content-Type": "application/json", ...(ck ? { Cookie: ck.header() } : {}) },
    body: body ? JSON.stringify(body) : undefined });
  const t = await r.text(); if (ck) ck.set(r);
  let j = null; try { j = JSON.parse(t); } catch {}
  return { status: r.status, body: j ?? t.slice(0, 140) };
}
async function login(email) {
  const j = jar();
  const r = await fetch(BASE + "/api/auth/producer-login", { method: "POST",
    headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password: SENHA }) });
  j.set(r);
  if (r.status !== 200) throw new Error(`login ${email} → ${r.status}`);
  return j;
}
const ok = (s) => s >= 200 && s < 300;

// ─── registro de produtor (caminho real) + assinatura EXEMPT ────────────────
async function garanteProdutor(email, nome) {
  const ja = await p.user.findUnique({ where: { email }, select: { id: true } });
  if (!ja) {
    const r = await req("POST", "/api/auth/register-producer", {
      email, password: SENHA, name: nome, phone: "11999990000",
      businessType: "INFOPRODUTOR", niche: "TESTE",
    });
    console.log(`   register-producer ${email} → ${r.status}`);
  } else console.log(`   ${email} já existia`);
  const u = await p.user.findUnique({ where: { email }, select: { id: true } });
  // ⚠️ FORA DO CAMINHO REAL: não há rota para assinar plano (é checkout).
  // Sem isto, POST /api/workspaces devolve 403 "Assine um plano para continuar".
  const plano = await p.plan.findFirst({ where: { name: "Staging Free" }, select: { id: true } });
  const sub = await p.subscription.findFirst({ where: { userId: u.id } });
  if (!sub) {
    await p.subscription.create({ data: { userId: u.id, planId: plano.id, status: "ACTIVE", exempt: true } });
    console.log(`   ⚠️ Subscription EXEMPT semeada por Prisma (não há rota)`);
  } else if (!sub.exempt || sub.status !== "ACTIVE") {
    await p.subscription.update({ where: { id: sub.id }, data: { status: "ACTIVE", exempt: true } });
    console.log(`   ⚠️ Subscription ajustada para ACTIVE/exempt`);
  }
  return u.id;
}

// ─── convite + aceite (caminho real) ────────────────────────────────────────
async function garanteColaborador({ donoJar, wsId, email, nome, permissions, courseIds = [], jaTemConta = false }) {
  // ⚠️ O workspace-alvo vem por PARÂMETRO, resolvido do Prisma pelo dono.
  // A 1ª versão perguntava a /api/auth/me e recebia `workspace` undefined para o
  // produtor, então o guard nunca reconhecia o vínculo existente e o seed
  // tentava convidar de novo (409 "Já existe um convite ativo"). Idempotência
  // que depende de um campo que pode vir vazio não é idempotência.
  const existente = await p.collaborator.findFirst({ where: { email, workspaceId: wsId }, select: { id: true, status: true } });
  if (existente?.status === "ACCEPTED") { console.log(`   ${email.padEnd(32)} já era colaborador neste ws ✅`); return; }
  if (existente) {
    // convite pendente de execução anterior: aceitar em vez de recriar
    const acc = jaTemConta
      ? await req("POST", `/api/invite/${existente.id}/accept`, {}, await login(email))
      : await req("POST", `/api/invite/${existente.id}/accept`, { mode: "signup", name: nome, password: SENHA });
    console.log(`   ${email.padEnd(32)} convite pendente reaproveitado · aceite ${acc.status}${ok(acc.status) ? " ✅" : " 🔴"}`);
    return;
  }

  const inv = await req("POST", "/api/producer/collaborators", { email, name: nome, permissions, courseIds }, donoJar);
  const id = inv.body?.collaborator?.id;
  if (!id) { console.log(`   🔴 convite ${email} → ${inv.status} ${JSON.stringify(inv.body).slice(0, 90)}`); return; }

  let acc;
  if (jaTemConta) {
    // Quem JÁ tem conta aceita LOGADO como ele mesmo — a rota exige que o email
    // da sessão bata com o do convite (accept/route.ts:38-49).
    const j = await login(email);
    acc = await req("POST", `/api/invite/${id}/accept`, {}, j);
  } else {
    acc = await req("POST", `/api/invite/${id}/accept`, { mode: "signup", name: nome, password: SENHA });
  }
  console.log(`   ${email.padEnd(32)} convite ${inv.status} · aceite ${acc.status}${ok(acc.status) ? " ✅" : " 🔴 " + JSON.stringify(acc.body).slice(0, 70)}`);
}

// ════════════════════════════════════════════════════════════════════════════
console.log("\n══ WORKSPACE A (staging-teste) ══");
const donoA = await login("producer-staging@staging.test");
const wsAId = (await p.workspace.findUnique({ where: { slug: "staging-teste" }, select: { id: true } })).id;
const cursoA1 = await p.course.findUnique({ where: { slug: "curso-teste" }, select: { id: true } });

// 2º curso em A — necessário para a persona de ESCOPO RESTRITO ter o que restringir
let cursoA2 = await p.course.findUnique({ where: { slug: "curso-teste-2" }, select: { id: true } });
if (!cursoA2) {
  const r = await req("POST", "/api/courses", { title: "Curso de Teste 2 (staging)", slug: "curso-teste-2", description: "segundo curso, para escopo restrito", supportEmail: "suporte@staging.test", supportWhatsapp: "11999990000" }, donoA);
  console.log(`   2º curso em A → ${r.status}`);
  cursoA2 = await p.course.findUnique({ where: { slug: "curso-teste-2" }, select: { id: true } });
} else console.log("   2º curso em A já existia");

console.log("\n══ PERSONAS DE PERMISSÃO ISOLADA (workspace A) ══");
for (const [email, nome, perms] of [
  ["colab-students@staging.test", "Colab Students", ["MANAGE_STUDENTS"]],
  ["colab-lessons@staging.test", "Colab Lessons", ["MANAGE_LESSONS"]],
  ["colab-automations@staging.test", "Colab Automations", ["MANAGE_AUTOMATIONS"]],
]) await garanteColaborador({ donoJar: donoA, wsId: wsAId, email, nome, permissions: perms });

// escopo restrito: SÓ o 2º curso
await garanteColaborador({ donoJar: donoA, wsId: wsAId, email: "colab-escopo@staging.test", nome: "Colab Escopo Restrito",
  permissions: ["MANAGE_STUDENTS", "MANAGE_LESSONS"], courseIds: cursoA2 ? [cursoA2.id] : [] });
// Convergência: se a persona nasceu antes do 2º curso existir, ela ficou com
// escopo TOTAL. O PATCH é o caminho real da tela de edição de colaborador.
if (cursoA2) {
  const ce = await p.collaborator.findFirst({ where: { email: "colab-escopo@staging.test" }, select: { id: true, courseIds: true } });
  if (ce && (ce.courseIds.length !== 1 || ce.courseIds[0] !== cursoA2.id)) {
    const r = await req("PATCH", `/api/producer/collaborators/${ce.id}`, { permissions: ["MANAGE_STUDENTS", "MANAGE_LESSONS"], courseIds: [cursoA2.id] }, donoA);
    console.log(`   escopo de colab-escopo ajustado para 1 curso → ${r.status}`);
  }
}

console.log("\n══ WORKSPACE B (cross-tenant) ══");
const donoBId = await garanteProdutor("dono-b@staging.test", "Dono do Workspace B");
const donoB = await login("dono-b@staging.test");
let wsB = await p.workspace.findUnique({ where: { slug: "workspace-b-staging" }, select: { id: true } });
if (!wsB) {
  const r = await req("POST", "/api/workspaces", { name: "Workspace B (staging)", slug: "workspace-b-staging" }, donoB);
  console.log(`   criar workspace B → ${r.status} ${ok(r.status) ? "✅" : JSON.stringify(r.body).slice(0, 80)}`);
  wsB = await p.workspace.findUnique({ where: { slug: "workspace-b-staging" }, select: { id: true } });
} else console.log("   workspace B já existia");

let cursoB = await p.course.findUnique({ where: { slug: "curso-b" }, select: { id: true } });
if (!cursoB && wsB) {
  const r = await req("POST", "/api/courses", { title: "Curso B (staging)", slug: "curso-b", description: "curso do workspace B", supportEmail: "suporte-b@staging.test", supportWhatsapp: "11999990001" }, donoB);
  console.log(`   curso B → ${r.status}`);
  cursoB = await p.course.findUnique({ where: { slug: "curso-b" }, select: { id: true } });
} else if (cursoB) console.log("   curso B já existia");

if (cursoB) {
  await p.course.update({ where: { id: cursoB.id }, data: { communityEnabled: true } });
  const alunoB = await req("POST", `/api/courses/${cursoB.id}/students`, { email: "aluno-b@staging.test", name: "Aluno do B" }, donoB);
  console.log(`   aluno-b matriculado → ${alunoB.status}`);
  const temPost = await p.post.count({ where: { courseId: cursoB.id } });
  if (!temPost) {
    const np = await req("POST", "/api/posts", { content: "<p>post inicial do workspace B (staging)</p>", type: "FREE", courseId: cursoB.id }, donoB);
    console.log(`   post inicial em B → ${np.status}`);
  } else console.log(`   B já tinha ${temPost} post(s)`);
}

console.log("\n══ PERSONAS DO ÉPICO 9.74 ══");
// (a) ADMIN de plataforma
const adminId = await garanteProdutor("admin-staging@staging.test", "Admin da Plataforma");
const adm = await p.user.findUnique({ where: { id: adminId }, select: { role: true } });
if (adm.role !== "ADMIN") {
  // ⚠️ FORA DO CAMINHO REAL: não existe rota que promova a ADMIN de plataforma.
  await p.user.update({ where: { id: adminId }, data: { role: "ADMIN" } });
  console.log("   ⚠️ admin-staging promovido a ADMIN por Prisma (não há rota)");
} else console.log("   admin-staging já era ADMIN");

// (b) dono do B que TAMBÉM colabora no A — o retrato do applyfybr
await garanteColaborador({ donoJar: donoA, wsId: wsAId, email: "dono-b@staging.test", nome: "Dono do Workspace B",
  permissions: ["MANAGE_COMMUNITY", "VIEW_ANALYTICS"], jaTemConta: true });

// (c) colaborador nos DOIS workspaces — o caso que torna o findFirst sem orderBy indeterminado
await garanteColaborador({ donoJar: donoA, wsId: wsAId, email: "colab-duplo@staging.test", nome: "Colab Duplo", permissions: ["REPLY_COMMENTS"] });
if (wsB) await garanteColaborador({ donoJar: donoB, wsId: wsB.id, email: "colab-duplo@staging.test", nome: "Colab Duplo", permissions: ["MANAGE_COMMUNITY"], jaTemConta: true });

// ════════════════════════════════════════════════════════════════════════════
// E3.0 — FIDELIDADE DO ELENCO (9.91 + 9.93) e PALCO dos grupos seguintes
// ════════════════════════════════════════════════════════════════════════════

console.log("\n══ 9.93 — User.workspaceId (espelhar produção) ══");
// Produção NUNCA deixa este campo nulo num aluno com matrícula ACTIVE: 0 de 22.449
// (medido 16/08/26). A regra é `workspaceId = o workspace onde o aluno entrou`.
// Um elenco que diverge aqui faz a home da raiz dizer "não está matriculado em
// nenhum curso" — e isso já foi lido como falha de GATE, custando um ciclo inteiro.
const semWs = await p.$queryRawUnsafe(`
  SELECT u.id, u.email, c."workspaceId" ws
  FROM "User" u
  JOIN "Enrollment" e ON e."userId"=u.id AND e.status='ACTIVE'
  JOIN "Course" c ON c.id=e."courseId"
  WHERE u.role='STUDENT' AND u."workspaceId" IS NULL`);
for (const a of semWs) {
  await p.user.update({ where: { id: a.id }, data: { workspaceId: a.ws } });
  console.log(`   ✏️  ${a.email} → workspaceId preenchido`);
}
console.log(`   alunos ACTIVE com workspaceId nulo: ${semWs.length ? "corrigidos " + semWs.length : "0 ✅"}`);

console.log("\n══ 9.91 — a persona SEM VÍNCULO NENHUM (o atacante padrão) ══");
// Conta autenticada com ZERO vínculo: nenhum workspace, curso, matrícula ou
// colaboração. É o negativo de todo teste de gate — sem ela, "403 para quem não
// tem nada" não é testável, e o teste do A2 teve de criá-la à mão.
// ⚠️ Criada pela rota PÚBLICA de propósito: é assim que um estranho nasce.
const ATACANTE = "sem-vinculo@staging.test";
if (!(await p.user.findUnique({ where: { email: ATACANTE }, select: { id: true } }))) {
  const r = await req("POST", "/api/auth/register-producer", {
    email: ATACANTE, password: SENHA, name: "Sem Vinculo",
    phone: "11999999999", businessType: "INFOPRODUTO", niche: "teste",
  });
  console.log(`   registro pela rota pública → ${r.status} ${ok(r.status) ? "✅" : "🔴"}`);
} else console.log("   já existia ✅");
{
  const u = await p.user.findUnique({ where: { email: ATACANTE }, select: { id: true } });
  const [w, c, e, cl] = await Promise.all([
    p.workspace.count({ where: { ownerId: u.id } }), p.course.count({ where: { ownerId: u.id } }),
    p.enrollment.count({ where: { userId: u.id } }), p.collaborator.count({ where: { userId: u.id } }),
  ]);
  console.log(`   vínculos: ws=${w} cursos=${c} matrículas=${e} colaborações=${cl} ${w + c + e + cl === 0 ? "✅ zerado" : "🔴 tem vínculo"}`);
}

console.log("\n══ PALCO — conteúdo que os grupos da Camada 3 exigem ══");
const alunoJar = await (async () => {
  const j = jar();
  j.set(await fetch(`${BASE}/api/w/staging-teste/login`, { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "aluno-staging@staging.test", password: SENHA }) }));
  return j;
})();

// 9.48 — "Carregar mais" só existe com página cheia: 2 grupos × 15 posts.
// ⚠️ A moderação do curso está LIGADA, então post de aluno nasce PENDING e o
// aluno NÃO o vê. Semear sem aprovar deixaria o palco com 4 posts visíveis e o
// 9.48 intestável — por isso o seed aprova, e deixa 1 PENDING por grupo de
// propósito (que é justamente o palco do 9.90).
const cursoPalco = await p.course.findUnique({ where: { slug: "curso-teste" }, select: { id: true } });
if (!(await p.communityGroup.findFirst({ where: { courseId: cursoPalco.id, slug: { not: "geral" } } }))) {
  const r = await req("POST", "/api/producer/community/groups", {
    courseId: cursoPalco.id, name: "Turma Avançada", description: "2º grupo do palco (9.48)", permission: "READ_WRITE",
  }, donoA);
  console.log(`   2º grupo criado → ${r.status}`);
} else console.log("   2º grupo já existia ✅");

const gruposPalco = await p.communityGroup.findMany({ where: { courseId: cursoPalco.id }, select: { id: true, slug: true } });
for (const g of gruposPalco) {
  const atual = await p.post.count({ where: { courseId: cursoPalco.id, groupId: g.id } });
  for (let i = atual; i < 15; i++) {
    await req("POST", "/api/posts", { content: `<p>Post de palco ${i + 1} — seed E3.0 (conteúdo obviamente falso)</p>`, type: "FREE", courseSlug: "curso-teste", groupId: g.id }, alunoJar);
  }
}
// Aprova tudo menos 1 por grupo (o PENDING é palco do 9.90, não sobra).
for (const g of gruposPalco) {
  const manter = await p.post.findFirst({ where: { courseId: cursoPalco.id, groupId: g.id, status: "PENDING" }, orderBy: { createdAt: "asc" }, select: { id: true } });
  const aprovar = await p.post.findMany({ where: { courseId: cursoPalco.id, groupId: g.id, status: "PENDING", ...(manter ? { id: { not: manter.id } } : {}) }, select: { id: true } });
  for (let i = 0; i < aprovar.length; i += 20) {
    await req("POST", "/api/producer/moderation", { items: aprovar.slice(i, i + 20).map((x) => ({ type: "community_post", id: x.id })), action: "approve" }, donoA);
  }
  const ap = await p.post.count({ where: { courseId: cursoPalco.id, groupId: g.id, status: "APPROVED" } });
  const pe = await p.post.count({ where: { courseId: cursoPalco.id, groupId: g.id, status: "PENDING" } });
  console.log(`   grupo ${g.slug.padEnd(16)} APPROVED=${String(ap).padStart(2)} PENDING=${pe} ${ap > 10 ? "✅ 'Carregar mais' existe" : "🔴 página não enche"}`);
}

// 9.83 — um convite REVOKED, para testar "editar não reativa / não há botão".
const REVOGADO = "colab-revogado@staging.test";
let convRev = await p.collaborator.findFirst({ where: { email: REVOGADO }, select: { id: true, status: true } });
if (!convRev) {
  await req("POST", "/api/producer/collaborators", { email: REVOGADO, name: "Colab Revogado", permissions: ["REPLY_COMMENTS"], courseIds: [] }, donoA);
  convRev = await p.collaborator.findFirst({ where: { email: REVOGADO }, select: { id: true, status: true } });
}
if (convRev && convRev.status !== "REVOKED") await req("PATCH", `/api/producer/collaborators/${convRev.id}`, { status: "REVOKED" }, donoA);
console.log(`   convite ${REVOGADO}: ${(await p.collaborator.findFirst({ where: { email: REVOGADO }, select: { status: true } }))?.status} ✅`);

console.log("\n══ VERIFICAÇÃO FINAL ══");
const users = await p.user.findMany({ select: { id: true, email: true, role: true }, orderBy: { email: "asc" } });
for (const u of users) {
  const cs = await p.collaborator.findMany({ where: { userId: u.id, status: "ACCEPTED" }, select: { permissions: true, courseIds: true, workspace: { select: { slug: true } } } });
  const es = await p.enrollment.findMany({ where: { userId: u.id }, select: { course: { select: { slug: true } }, status: true } });
  const dono = await p.workspace.findMany({ where: { ownerId: u.id }, select: { slug: true } });
  const partes = [];
  if (dono.length) partes.push("DONO:" + dono.map((w) => w.slug).join("+"));
  for (const c of cs) partes.push(`colab@${c.workspace.slug}[${c.permissions.join(",")}]${c.courseIds.length ? " escopo:" + c.courseIds.length : ""}`);
  if (es.length) partes.push("matr:" + es.map((e) => e.course.slug + "/" + e.status).join(","));
  console.log("   " + u.email.padEnd(32) + u.role.padEnd(10) + partes.join(" · "));
}
console.log("\n   Workspaces: " + (await p.workspace.findMany({ select: { slug: true } })).map((w) => w.slug).join(", "));
console.log("   Courses: " + (await p.course.findMany({ select: { slug: true, communityEnabled: true } })).map((c) => c.slug + (c.communityEnabled ? "(com)" : "")).join(", "));

// ─── ESTADO DO PALCO (o que um handoff de QA precisa ler antes de testar) ────
console.log("\n══ ESTADO DO PALCO ══");
for (const c of await p.course.findMany({ select: { slug: true, communityEnabled: true, communityModerationEnabled: true, lessonCommentsModerationEnabled: true } })) {
  console.log(`   ${c.slug.padEnd(16)} comunidade=${c.communityEnabled ? "ON " : "off"} moderação: comunidade=${c.communityModerationEnabled ? "ON " : "off"} aulas=${c.lessonCommentsModerationEnabled ? "ON" : "off"}`);
}
for (const g of await p.communityGroup.findMany({ select: { slug: true, permission: true, course: { select: { slug: true } } } })) {
  const ap = await p.post.count({ where: { groupId: (await p.communityGroup.findFirst({ where: { slug: g.slug, course: { slug: g.course.slug } }, select: { id: true } })).id, status: "APPROVED" } });
  console.log(`   grupo ${g.course.slug}/${g.slug} permission=${g.permission} posts visíveis=${ap}`);
}
console.log(`   posts PENDING: ${await p.post.count({ where: { status: "PENDING" } })} · comentários PENDING: ${await p.comment.count({ where: { status: "PENDING" } })}`);
console.log(`   convites REVOKED: ${await p.collaborator.count({ where: { status: "REVOKED" } })}`);

// ─── auth.users × Prisma (o órfão que ninguém vê) ────────────────────────────
// ⚠️ Apagar a linha do Prisma NÃO apaga o usuário do Supabase Auth. O órfão
// resultante muda o ramo do register-producer ("email já cadastrado") e envenena
// o próximo teste. Conferir aqui é barato; descobrir depois, não.
try {
  const { createClient } = require("@supabase/supabase-js");
  const s = createClient(SB, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const { data } = await s.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const emails = new Set(users.map((u) => u.email.toLowerCase()));
  const orfaos = (data?.users ?? []).filter((u) => u.email && !emails.has(u.email.toLowerCase()));
  console.log(`\n   auth.users=${data?.users?.length ?? "?"} · Prisma=${users.length} ${orfaos.length === 0 ? "✅ batendo" : "🔴 órfãos: " + orfaos.map((o) => o.email).join(", ")}`);
} catch (e) { console.log("   (checagem auth×Prisma indisponível: " + e.message.slice(0, 60) + ")"); }

await p.$disconnect();
