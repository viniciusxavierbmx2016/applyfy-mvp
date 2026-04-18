import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase-admin";
import { createNotification } from "@/lib/notifications";
import { resolveStaffWorkspace } from "@/lib/workspace";

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
    const courseMap = new Map(courses.map((c) => [c.id, c]));

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { slug: true, masterPassword: true },
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

    const admin = createAdminClient();
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

    const csvResultRows: string[][] = [
      ["Nome", "Email", "Status", "Senha", "Link de Acesso", "Cursos Matriculados", "Erro"],
    ];

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
        csvResultRows.push([name, rawEmail, "Erro", "", "", "", "Email inválido"]);
        continue;
      }

      try {
        let user = await prisma.user.findUnique({
          where: { email },
        });
        const isNewUser = !user;
        let accessLink = "";
        let sharedPassword = "";

        if (!user) {
          let authId: string | undefined;

          const { data: createData, error: createError } =
            await admin.auth.admin.createUser({
              email,
              password:
                Math.random().toString(36).slice(2) +
                Math.random().toString(36).slice(2),
              email_confirm: true,
              user_metadata: { name },
            });

          if (createError) {
            if (
              createError.message?.includes("already been registered") ||
              createError.message?.includes("already exists")
            ) {
              const { data: listData } = await admin.auth.admin.listUsers();
              const found = listData?.users.find(
                (u) => u.email?.toLowerCase() === email
              );
              authId = found?.id;
            }
            if (!authId) {
              summary.errors.push({
                line: lineNum,
                email,
                reason: `Supabase: ${createError.message}`,
              });
              csvResultRows.push([
                name,
                email,
                "Erro",
                "",
                "",
                "",
                createError.message,
              ]);
              continue;
            }
          } else {
            authId = createData.user.id;
          }

          user = await prisma.user.create({
            data: {
              id: authId!,
              email,
              name,
              workspaceId,
            },
          });

          if (workspace.masterPassword) {
            sharedPassword = workspace.masterPassword;
            try {
              await admin.auth.admin.updateUserById(user.id, {
                password: workspace.masterPassword,
              });
            } catch {}
          } else {
            const tempPw = generateTempPassword();
            try {
              await admin.auth.admin.updateUserById(user.id, {
                password: tempPw,
              });
              sharedPassword = tempPw;
            } catch {}
          }

          try {
            const { data: linkData } = await admin.auth.admin.generateLink({
              type: "recovery",
              email,
              options: {
                redirectTo: `${baseUrl}/reset-password?next=/w/${workspace.slug}`,
              },
            });
            accessLink = linkData?.properties?.action_link || "";
          } catch {}

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

        const enrolledCourseNames: string[] = [];
        for (const courseId of courseIds) {
          const existing = await prisma.enrollment.findUnique({
            where: {
              userId_courseId: { userId: user.id, courseId },
            },
          });

          if (!existing) {
            await prisma.enrollment.create({
              data: { userId: user.id, courseId, status: "ACTIVE" },
            });
            summary.enrollmentsCreated++;
            enrolledCourseNames.push(courseMap.get(courseId)!.title);

            const course = courseMap.get(courseId)!;
            await createNotification({
              userId: user.id,
              type: "ENROLLMENT",
              message: `Você foi matriculado no curso ${course.title}`,
              link: `/course/${course.slug}`,
            }).catch(() => {});
          } else if (existing.status === "CANCELLED") {
            await prisma.enrollment.update({
              where: { id: existing.id },
              data: { status: "ACTIVE" },
            });
            summary.reactivated++;
            summary.enrollmentsCreated++;
            enrolledCourseNames.push(courseMap.get(courseId)!.title);
          } else {
            summary.enrollmentsSkipped++;
          }
        }

        csvResultRows.push([
          name,
          email,
          isNewUser ? "Criado" : "Já existia",
          isNewUser ? sharedPassword : "",
          isNewUser ? accessLink : "",
          enrolledCourseNames.join(", ") || "Já matriculado",
          "",
        ]);
      } catch (err) {
        const reason =
          err instanceof Error ? err.message : "Erro desconhecido";
        summary.errors.push({ line: lineNum, email, reason });
        csvResultRows.push([name, email, "Erro", "", "", "", reason]);
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
      msg === "Unauthorized" ? 401 : msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro na importação" }, { status });
  }
}

function generateTempPassword(len = 8): string {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}
