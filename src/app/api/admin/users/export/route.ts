import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireStaff, requirePermission, getStaffCourseIds } from "@/lib/auth";
import { resolveStaffWorkspace } from "@/lib/workspace";

function csvEscape(v: string | number | null | undefined): string {
  const s = v == null ? "" : String(v);
  if (/[",\n\r;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function formatDate(d: Date | null | undefined): string {
  if (!d) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function slugifyForFile(s: string): string {
  return (
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "export"
  );
}

function accessStatus(
  status: string,
  expiresAt: Date | null | undefined
): string {
  if (status !== "ACTIVE") return "Expirado";
  if (!expiresAt) return "Vitalício";
  const now = Date.now();
  const ms = expiresAt.getTime() - now;
  if (ms <= 0) return "Expirado";
  const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
  return `Expira em ${days}d`;
}

export async function GET(request: Request) {
  try {
    const staff = await requireStaff();
    if (staff.role === "COLLABORATOR") {
      await requirePermission(staff, "MANAGE_STUDENTS");
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() ?? "";
    const courseIdFilter = searchParams.get("courseId")?.trim() || null;

    const searchClause = q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { email: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {};

    const { workspace, scoped } = await resolveStaffWorkspace(staff);
    const workspaceId = scoped && workspace ? workspace.id : null;

    if (staff.role !== "ADMIN" && !workspaceId) {
      return new NextResponse("", {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="alunos-vazio.csv"`,
        },
      });
    }

    const collabScope = await getStaffCourseIds(staff);
    const workspaceCourseIds = workspaceId
      ? (
          await prisma.course.findMany({
            where: { workspaceId },
            select: { id: true },
          })
        ).map((c) => c.id)
      : null;
    const scopedCourseIds =
      collabScope !== null
        ? workspaceCourseIds
          ? collabScope.filter((id) => workspaceCourseIds.includes(id))
          : collabScope
        : workspaceCourseIds;

    const effectiveCourseIds =
      courseIdFilter &&
      (scopedCourseIds === null || scopedCourseIds.includes(courseIdFilter))
        ? [courseIdFilter]
        : scopedCourseIds;

    const courseFilterActive = !!courseIdFilter;

    const where = courseFilterActive
      ? {
          ...searchClause,
          enrollments: {
            some: {
              courseId: { in: effectiveCourseIds || [] },
              status: "ACTIVE" as const,
            },
          },
        }
      : workspaceId
        ? staff.role === "COLLABORATOR"
          ? {
              ...searchClause,
              enrollments: {
                some: {
                  courseId: { in: scopedCourseIds || [] },
                  status: "ACTIVE" as const,
                },
              },
            }
          : {
              ...searchClause,
              OR: [
                { workspaceId },
                {
                  enrollments: {
                    some: {
                      courseId: { in: scopedCourseIds || [] },
                      status: "ACTIVE" as const,
                    },
                  },
                },
              ],
            }
        : searchClause;

    const users = await prisma.user.findMany({
      where,
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        email: true,
        enrollments: {
          where: courseFilterActive
            ? { courseId: { in: effectiveCourseIds || [] } }
            : workspaceId
              ? { courseId: { in: scopedCourseIds || [] } }
              : {},
          select: {
            id: true,
            courseId: true,
            status: true,
            expiresAt: true,
            createdAt: true,
            course: {
              select: {
                id: true,
                title: true,
                modules: {
                  select: {
                    lessons: { select: { id: true } },
                  },
                },
              },
            },
          },
        },
      },
      take: 5000,
    });

    // Collect all relevant lessonIds so we can fetch progress in bulk
    const lessonIdsSet = new Set<string>();
    for (const u of users) {
      for (const e of u.enrollments) {
        for (const m of e.course.modules) {
          for (const l of m.lessons) lessonIdsSet.add(l.id);
        }
      }
    }
    const userIds = users.map((u) => u.id);
    const progress =
      userIds.length > 0 && lessonIdsSet.size > 0
        ? await prisma.lessonProgress.findMany({
            where: {
              userId: { in: userIds },
              lessonId: { in: Array.from(lessonIdsSet) },
            },
            select: {
              userId: true,
              lessonId: true,
              completed: true,
              lastAccessedAt: true,
            },
          })
        : [];

    // Index progress by user
    const progressByUser = new Map<
      string,
      { completedLessons: Set<string>; lastAccessed: Date | null }
    >();
    for (const p of progress) {
      let entry = progressByUser.get(p.userId);
      if (!entry) {
        entry = { completedLessons: new Set(), lastAccessed: null };
        progressByUser.set(p.userId, entry);
      }
      if (p.completed) entry.completedLessons.add(p.lessonId);
      if (
        p.lastAccessedAt &&
        (!entry.lastAccessed || p.lastAccessedAt > entry.lastAccessed)
      ) {
        entry.lastAccessed = p.lastAccessedAt;
      }
    }

    const headers = [
      "Nome",
      "Email",
      "Curso",
      "Data de matrícula",
      "Progresso",
      "Aulas concluídas",
      "Último acesso",
      "Status do acesso",
    ];
    const lines: string[] = [headers.map(csvEscape).join(",")];

    for (const u of users) {
      if (u.enrollments.length === 0) continue;
      const courseTitles = u.enrollments.map((e) => e.course.title).join(", ");
      const allLessonIds = u.enrollments.flatMap((e) =>
        e.course.modules.flatMap((m) => m.lessons.map((l) => l.id))
      );
      const totalLessons = allLessonIds.length;
      const userProgress = progressByUser.get(u.id);
      const completedCount = userProgress
        ? allLessonIds.filter((id) => userProgress.completedLessons.has(id)).length
        : 0;
      const percent =
        totalLessons > 0
          ? Math.round((completedCount / totalLessons) * 100)
          : 0;
      const lastAccessed = userProgress?.lastAccessed ?? null;

      // Enrollment date: earliest ACTIVE enrollment in scope
      const sortedByDate = [...u.enrollments].sort(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
      );
      const enrolledAt = sortedByDate[0]?.createdAt ?? null;

      // Access status: most permissive across enrollments (Vitalício > Expira em > Expirado)
      let status = "Expirado";
      let minDaysLeft: number | null = null;
      let hasLifetime = false;
      for (const e of u.enrollments) {
        if (e.status !== "ACTIVE") continue;
        if (!e.expiresAt) {
          hasLifetime = true;
          break;
        }
        const ms = e.expiresAt.getTime() - Date.now();
        if (ms > 0) {
          const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
          if (minDaysLeft === null || days < minDaysLeft) minDaysLeft = days;
        }
      }
      if (hasLifetime) status = "Vitalício";
      else if (minDaysLeft !== null) status = `Expira em ${minDaysLeft}d`;
      else {
        // Single-enrollment case (filtered by course), use that enrollment directly
        if (courseFilterActive && u.enrollments.length === 1) {
          status = accessStatus(
            u.enrollments[0].status,
            u.enrollments[0].expiresAt
          );
        }
      }

      lines.push(
        [
          csvEscape(u.name),
          csvEscape(u.email),
          csvEscape(courseTitles),
          csvEscape(formatDate(enrolledAt)),
          csvEscape(`${percent}%`),
          csvEscape(`${completedCount} de ${totalLessons}`),
          csvEscape(lastAccessed ? formatDate(lastAccessed) : "Nunca acessou"),
          csvEscape(status),
        ].join(",")
      );
    }

    // Filename
    const today = new Date();
    const dateStr = `${String(today.getDate()).padStart(2, "0")}-${String(today.getMonth() + 1).padStart(2, "0")}-${today.getFullYear()}`;
    let filenameBase = "alunos-todos";
    if (courseFilterActive) {
      const course = await prisma.course.findUnique({
        where: { id: courseIdFilter! },
        select: { title: true, slug: true },
      });
      const base = course?.slug || slugifyForFile(course?.title || "curso");
      filenameBase = `alunos-${base}`;
    }
    const filename = `${filenameBase}-${dateStr}.csv`;

    const BOM = "\uFEFF";
    const body = BOM + lines.join("\r\n");

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("GET /api/admin/users/export error:", error);
    const msg = error instanceof Error ? error.message : "";
    const status =
      msg === "Unauthorized" ? 401 : msg === "Forbidden" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}
