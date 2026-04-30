// Seed staging with admin/producer/student users, a workspace, a course, and an enrollment.
// Idempotent: re-running upserts/upgrades existing records.
//
// Required env:
//   STAGING_SUPABASE_URL — https://<ref>.supabase.co (staging project)
//   STAGING_SERVICE_KEY  — staging service_role JWT
//   STAGING_DB_URL       — postgresql://… (staging direct connection)

import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";

const SUPABASE_URL = process.env.STAGING_SUPABASE_URL;
const SERVICE_KEY = process.env.STAGING_SERVICE_KEY;
const DB_URL = process.env.STAGING_DB_URL;
if (!SUPABASE_URL || !SERVICE_KEY || !DB_URL) {
  console.error(
    "Missing env: STAGING_SUPABASE_URL, STAGING_SERVICE_KEY, STAGING_DB_URL"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
const prisma = new PrismaClient({ datasources: { db: { url: DB_URL } } });

const PASSWORD = "Staging@2026!";
const TARGETS = [
  { email: "admin-staging@mymembersclub.com.br", name: "Admin Staging", role: "ADMIN" },
  { email: "producer-staging@mymembersclub.com.br", name: "Producer Staging", role: "PRODUCER" },
  { email: "student-staging@mymembersclub.com.br", name: "Aluno Staging", role: "STUDENT" },
];

async function getOrCreateAuthUser(email, password) {
  const { data: created, error: createErr } =
    await supabase.auth.admin.createUser({ email, password, email_confirm: true });
  if (created?.user?.id) {
    return { id: created.user.id, status: "created" };
  }
  if (!/already.*registered|already been registered|already exists/i.test(createErr?.message || "")) {
    throw new Error(`createUser ${email}: ${createErr?.message || "unknown"}`);
  }
  for (let page = 1; page <= 20; page++) {
    const { data: list, error: listErr } =
      await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (listErr) throw new Error(`listUsers: ${listErr.message}`);
    const match = list?.users?.find(
      (u) => (u.email ?? "").toLowerCase() === email.toLowerCase()
    );
    if (match) return { id: match.id, status: "existed" };
    if (!list?.users || list.users.length < 200) break;
  }
  throw new Error(`Could not find or create auth user ${email}`);
}

async function main() {
  // 1) Auth users
  const ids = {};
  for (const t of TARGETS) {
    const r = await getOrCreateAuthUser(t.email, PASSWORD);
    ids[t.role] = r.id;
    console.log(`auth ${t.role.padEnd(8)} ${t.email.padEnd(45)} ${r.status} ${r.id}`);
  }

  // 2) Prisma users (upsert by email, ID matches auth)
  for (const t of TARGETS) {
    const u = await prisma.user.upsert({
      where: { email: t.email },
      update: { name: t.name, role: t.role },
      create: { id: ids[t.role], email: t.email, name: t.name, role: t.role },
    });
    console.log(`prisma user ${t.role.padEnd(8)} ${u.id}`);
  }

  // 3) Workspace
  const wsSlug = "staging-academy";
  let workspace = await prisma.workspace.findUnique({ where: { slug: wsSlug } });
  if (!workspace) {
    workspace = await prisma.workspace.create({
      data: { name: "Staging Academy", slug: wsSlug, ownerId: ids.PRODUCER },
    });
    console.log(`workspace created ${workspace.id}`);
  } else {
    console.log(`workspace existed ${workspace.id}`);
  }

  // 4) Course
  const courseSlug = "curso-teste";
  let course = await prisma.course.findUnique({ where: { slug: courseSlug } });
  if (!course) {
    course = await prisma.course.create({
      data: {
        title: "Curso de Teste",
        slug: courseSlug,
        description: "Curso de teste do ambiente staging.",
        workspaceId: workspace.id,
        ownerId: ids.PRODUCER,
        isPublished: true,
      },
    });
    console.log(`course   created ${course.id}`);
  } else {
    console.log(`course   existed ${course.id}`);
  }

  // 5) Enrollment (upsert on the composite unique [userId, courseId])
  const enrollment = await prisma.enrollment.upsert({
    where: { userId_courseId: { userId: ids.STUDENT, courseId: course.id } },
    update: {},
    create: { userId: ids.STUDENT, courseId: course.id, status: "ACTIVE" },
  });
  console.log(`enrollment ${enrollment.id}`);

  console.log("\nDone. Login emails:");
  for (const t of TARGETS) console.log(`  ${t.role}: ${t.email} / ${PASSWORD}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
