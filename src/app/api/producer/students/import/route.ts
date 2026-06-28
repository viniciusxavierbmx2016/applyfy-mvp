import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff, canManageStudentsOfCourse } from "@/lib/auth";
import { ensureUserByEmail } from "@/lib/webhook-helpers";
import { createNotification } from "@/lib/notifications";
import { processAutomations } from "@/lib/automation-engine";
import { resolveStaffWorkspace } from "@/lib/workspace";
import { sendCustomAccessEmail } from "@/lib/email-templates";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const MAX_ROWS = 500;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseCsv(text: string): string[][] {
  const separator = text.indexOf(";") !== -1 ? ";" : ",";
  const lines = text.split(/\r?\n/);
  return lines.map((line) => {
    const cols: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === separator && !inQuotes) {
        cols.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    cols.push(current.trim());
    return cols;
  });
}

function findColumnIndex(
  headers: string[],
  candidates: string[]
): number {
  const lower = headers.map((h) => h.toLowerCase().replace(/[^a-z]/g, ""));
  for (const c of candidates) {
    const idx = lower.indexOf(c);
    if (idx !== -1) return idx;
  }
  return -1;
}

export async function POST(request: Request) {
  try {
    const staff = await requireStaff();

    const { workspace: resolvedWs } = await resolveStaffWorkspace(staff);
    if (!resolvedWs) {
      return NextResponse.json(
        { error: "Workspace não encontrado" },
        { status: 400 }
      );
    }
    const workspaceId = resolvedWs.id;

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const courseIdsRaw = formData.get("courseIds") as string | null;

    if (!file) {
      return NextResponse.json(
        { error: "Arquivo CSV obrigatório" },
        { status: 400 }
      );
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Arquivo excede 10MB" },
        { status: 400 }
      );
    }

    let courseIds: string[] = [];
    try {
      courseIds = JSON.parse(courseIdsRaw || "[]");
      if (!Array.isArray(courseIds) || courseIds.length === 0) {
        return NextResponse.json(
          { error: "Selecione ao menos um curso" },
          { status: 400 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: "courseIds inválido" },
        { status: 400 }
      );
    }

    const courses = await prisma.course.findMany({
      where: { id: { in: courseIds }, workspaceId },
      select: { id: true, title: true, slug: true },
    });
    if (courses.length !== courseIds.length) {
      return NextResponse.json(
        { error: "Um ou mais cursos não pertencem ao seu workspace" },
        { status: 403 }
      );
    }

    // FURO#4 — permissão MANAGE_STUDENTS + course-scope, POR CURSO. Mesma fonte
    // de verdade da matrícula single (courses/[id]/students). PRODUCER/ADMIN
    // bypassam dentro do helper. Barra ANTES de criar qualquer user/matrícula/email.
    for (const cid of courseIds) {
      if (!(await canManageStudentsOfCourse(staff, cid))) {
        const title = courses.find((c) => c.id === cid)?.title ?? cid;
        return NextResponse.json(
          { error: `Sem permissão para gerenciar alunos do curso "${title}"` },
          { status: 403 }
        );
      }
    }

    const courseMap = new Map(courses.map((c) => [c.id, c]));

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { slug: true, name: true, masterPassword: true },
    });
    if (!workspace) {
      return NextResponse.json(
        { error: "Workspace não encontrado" },
        { status: 404 }
      );
    }

    const text = await file.text();
    const rows = parseCsv(text);
    if (rows.length < 2) {
      return NextResponse.json(
        { error: "CSV vazio ou sem dados" },
        { status: 400 }
      );
    }

    const headers = rows[0];
    const emailIdx = findColumnIndex(headers, ["email", "emails", "mail"]);
    if (emailIdx === -1) {
      return NextResponse.json(
        { error: "Coluna de email não encontrada no CSV" },
        { status: 400 }
      );
    }
    const nameIdx = findColumnIndex(headers, ["nome", "name", "nomes"]);

    const dataRows = rows.slice(1).filter((r) => r.some((c) => c.length > 0));
    if (dataRows.length > MAX_ROWS) {
      return NextResponse.json(
        { error: `Limite de ${MAX_ROWS} linhas excedido (${dataRows.length} encontradas)` },
        { status: 400 }
      );
    }

    const baseUrl = new URL(request.url).origin;

    const summary = {
      total: dataRows.length,
      created: 0,
      alreadyExisted: 0,
      reactivated: 0,
      enrollmentsCreated: 0,
      enrollmentsSkipped: 0,
      errors: [] as Array<{ line: number; email: string; reason: string }>,
    };

    const loginUrl = `${baseUrl}/w/${workspace.slug}/login`;

    const csvResultRows: string[][] = [
      ["Nome", "Email", "Status", "Senha", "Link de Login", "Cursos Matriculados", "Erro"],
    ];

    // ── BATCH-PROCESS THE CSV (was N×M queries via nested loops) ──
    // Phase 1 provisions users sequentially because Supabase Auth has no
    // batch API and one bad row must not abort the import (per-row
    // try/catch preserved). Phases 2–7 collapse the enrollment N+1 into
    // 1 findMany + 1 createMany + 1 updateMany while keeping every
    // observable side effect: counts, notifications, automations, emails
    // (1/aluno), and CSV output (original line order).
    type ValidRow = {
      kind: "valid";
      lineNum: number;
      name: string;
      email: string;
      userId: string;
      isNewUser: boolean;
      isStaff: boolean;
      tempPassword: string;
      enrolledCourseNames: string[];
    };
    type FailedRow = {
      kind: "invalid" | "error";
      lineNum: number;
      name: string;
      email: string; // for "invalid" this is the raw value (matches today)
      reason: string;
    };
    type ProcessedRow = ValidRow | FailedRow;
    const processedRows: ProcessedRow[] = [];

    // Phase 1 — per-row user provisioning, sequential. Same try/catch
    // granularity as today so a single Supabase Auth failure is attributed
    // to the right line and the rest of the import proceeds.
    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const rawEmail = row[emailIdx] || "";
      const email = rawEmail.trim().toLowerCase();
      const name =
        nameIdx >= 0 && row[nameIdx]
          ? row[nameIdx].trim()
          : email.split("@")[0] || "Aluno";
      const lineNum = i + 2;

      if (!email || !EMAIL_RE.test(email)) {
        summary.errors.push({
          line: lineNum,
          email: rawEmail,
          reason: "Email inválido",
        });
        processedRows.push({
          kind: "invalid",
          lineNum,
          name,
          email: rawEmail,
          reason: "Email inválido",
        });
        continue;
      }

      try {
        const preExisting = await prisma.user.findUnique({
          where: { email },
          select: { id: true },
        });
        const isNewUser = !preExisting;

        // ensureUserByEmail returns tempPassword (mc-XXXXXX) for newly
        // issued credentials and isStaff=true for staff / accepted-Collab
        // buyers (they auth via global Supabase, not WorkspaceCredential).
        const ensured = await ensureUserByEmail(email, name, workspaceId);
        const user = ensured.user;
        const scopedTemp = ensured.tempPassword;
        const isStaff = ensured.isStaff;
        // Master password (when set) wins because /w/<slug>/login checks
        // it first via magic link. Otherwise show the scoped password.
        const tempPassword = workspace.masterPassword || scopedTemp || "";

        if (isNewUser) {
          summary.created++;
        } else {
          if (!user.workspaceId && user.role === "STUDENT") {
            await prisma.user.update({
              where: { id: user.id },
              data: { workspaceId },
            });
          }
          summary.alreadyExisted++;
        }

        processedRows.push({
          kind: "valid",
          lineNum,
          name,
          email,
          userId: user.id,
          isNewUser,
          isStaff,
          tempPassword,
          enrolledCourseNames: [],
        });
      } catch (err) {
        const reason =
          err instanceof Error ? err.message : "Erro desconhecido";
        summary.errors.push({ line: lineNum, email, reason });
        processedRows.push({
          kind: "error",
          lineNum,
          name,
          email,
          reason,
        });
      }
    }

    // Phase 2 — single batch query for every existing enrollment across
    // all (userId, courseId) pairs (was N×M findUnique calls).
    const validRows = processedRows.filter(
      (r): r is ValidRow => r.kind === "valid"
    );
    const userIds = validRows.map((r) => r.userId);
    const existingEnrollments =
      userIds.length > 0
        ? await prisma.enrollment.findMany({
            where: {
              userId: { in: userIds },
              courseId: { in: courseIds },
            },
            select: {
              id: true,
              userId: true,
              courseId: true,
              status: true,
            },
          })
        : [];
    const enrollMap = new Map<string, { id: string; status: string }>();
    for (const e of existingEnrollments) {
      enrollMap.set(`${e.userId}:${e.courseId}`, {
        id: e.id,
        status: e.status,
      });
    }

    // Phase 3 — in-memory decision per (row, course). Mirrors today's
    // branches exactly: missing → create + emit event; CANCELLED →
    // reactivate + emit event; ACTIVE → skip. Counters increment in the
    // same places.
    const toCreate: Array<{
      userId: string;
      courseId: string;
      status: "ACTIVE";
    }> = [];
    const toReactivate: string[] = [];
    const newEvents: Array<{ userId: string; courseId: string }> = [];
    for (const row of validRows) {
      for (const courseId of courseIds) {
        const existing = enrollMap.get(`${row.userId}:${courseId}`);
        if (!existing) {
          toCreate.push({ userId: row.userId, courseId, status: "ACTIVE" });
          newEvents.push({ userId: row.userId, courseId });
          row.enrolledCourseNames.push(courseMap.get(courseId)!.title);
          summary.enrollmentsCreated++;
        } else if (existing.status === "CANCELLED") {
          toReactivate.push(existing.id);
          newEvents.push({ userId: row.userId, courseId });
          row.enrolledCourseNames.push(courseMap.get(courseId)!.title);
          summary.reactivated++;
          summary.enrollmentsCreated++;
        } else {
          summary.enrollmentsSkipped++;
        }
      }
    }

    // Phase 4 — batch writes. skipDuplicates is defensive against a
    // concurrent retry inserting the same pair.
    if (toCreate.length > 0) {
      await prisma.enrollment.createMany({
        data: toCreate,
        skipDuplicates: true,
      });
    }
    if (toReactivate.length > 0) {
      await prisma.enrollment.updateMany({
        where: { id: { in: toReactivate } },
        data: { status: "ACTIVE" },
      });
    }

    // Phase 5 — fire-and-forget side effects per new enrollment. Same
    // count, same args, same .catch(() => {}) pattern as today; just
    // moved out of the inner loop into a flat iteration.
    for (const ev of newEvents) {
      const course = courseMap.get(ev.courseId)!;
      createNotification({
        userId: ev.userId,
        workspaceId,
        type: "ENROLLMENT",
        message: `Você foi matriculado no curso ${course.title}`,
        link: `/course/${course.slug}`,
      }).catch(() => {});
      processAutomations({
        type: "STUDENT_ENROLLED",
        workspaceId,
        courseId: ev.courseId,
        userId: ev.userId,
      }).catch(() => {});
    }

    // Phase 6 — one access email per valid row that got at least one new
    // enrollment. buildAccessEmail (via sendCustomAccessEmail) picks the
    // right default per recipient (staff vs student) when nothing is
    // customized. Fire-and-forget exactly as before.
    for (const row of validRows) {
      if (row.enrolledCourseNames.length === 0) continue;
      const courseName = row.enrolledCourseNames.join(", ");
      sendCustomAccessEmail({
        workspaceId,
        studentName: row.name,
        studentEmail: row.email,
        courseName,
        tempPassword: row.isNewUser ? row.tempPassword || undefined : undefined,
        loginUrl,
        isStaff: row.isStaff,
      }).catch((err) =>
        console.error(
          "[EMAIL_ERROR] access email to:",
          row.email,
          err?.message || err
        )
      );
    }

    // Phase 7 — CSV result rows in the original CSV line order
    // (processedRows was populated in iteration order during Phase 1).
    for (const row of processedRows) {
      if (row.kind !== "valid") {
        csvResultRows.push([
          row.name,
          row.email,
          "Erro",
          "",
          "",
          "",
          row.reason,
        ]);
      } else {
        csvResultRows.push([
          row.name,
          row.email,
          row.isNewUser ? "Criado" : "Já existia",
          row.isNewUser && !row.isStaff ? row.tempPassword : "",
          row.isNewUser ? loginUrl : "",
          row.enrolledCourseNames.join(", ") || "Já matriculado",
          "",
        ]);
      }
    }

    const csvContent = csvResultRows
      .map((row) =>
        row
          .map((cell) => {
            if (
              cell.includes(",") ||
              cell.includes(";") ||
              cell.includes('"') ||
              cell.includes("\n")
            ) {
              return `"${cell.replace(/"/g, '""')}"`;
            }
            return cell;
          })
          .join(",")
      )
      .join("\n");

    const downloadCsv = Buffer.from(csvContent, "utf-8").toString("base64");

    return NextResponse.json({
      success: true,
      summary,
      downloadCsv,
    });
  } catch (error) {
    console.error("POST /api/producer/students/import error:", error);
    const msg = error instanceof Error ? error.message : "";
    const status =
      msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro na importação" }, { status });
  }
}

