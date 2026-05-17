import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canManageStudentsOfCourse, requireStaff } from "@/lib/auth";
import {
  ensureUserByEmail,
  sendWorkspaceAccessEmail,
} from "@/lib/webhook-helpers";
import { createNotification } from "@/lib/notifications";
import { processAutomations } from "@/lib/automation-engine";
import { sendEmail } from "@/lib/email";
import { staffAccessGranted, studentAccessGranted } from "@/lib/email-templates";
import { logger } from "@/lib/logger";
import { enrollCourseStudentSchema, validateBody } from "@/lib/validations";
import {
  generateSalt,
  generateTempPassword,
  hashPassword,
} from "@/lib/workspace-auth";

const PAGE_SIZE = 20;

export async function GET(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const staff = await requireStaff();
    if (!(await canManageStudentsOfCourse(staff, params.id))) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") || "").trim();
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const skip = (page - 1) * PAGE_SIZE;

    const course = await prisma.course.findUnique({
      where: { id: params.id },
      include: {
        modules: { include: { lessons: { select: { id: true } } } },
      },
    });
    if (!course) {
      return NextResponse.json(
        { error: "Curso não encontrado" },
        { status: 404 }
      );
    }
    const lessonIds = course.modules.flatMap((m) =>
      m.lessons.map((l) => l.id)
    );
    const totalLessons = lessonIds.length;

    const whereUser = q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { email: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {};

    const [total, enrollments] = await Promise.all([
      prisma.enrollment.count({
        where: {
          courseId: params.id,
          user: whereUser,
          status: { in: ["ACTIVE", "EXPIRED"] },
        },
      }),
      prisma.enrollment.findMany({
        where: {
          courseId: params.id,
          user: whereUser,
          status: { in: ["ACTIVE", "EXPIRED"] },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: PAGE_SIZE,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              avatarUrl: true,
              userTags: {
                include: { tag: { select: { id: true, name: true, color: true } } },
                orderBy: { createdAt: "desc" },
              },
            },
          },
        },
      }),
    ]);

    const userIds = enrollments.map((e) => e.userId);

    const [completedRows, lastViewedRows] = await Promise.all([
      lessonIds.length && userIds.length
        ? prisma.lessonProgress.groupBy({
            by: ["userId"],
            where: {
              userId: { in: userIds },
              lessonId: { in: lessonIds },
              completed: true,
            },
            _count: { lessonId: true },
          })
        : Promise.resolve([] as Array<{ userId: string; _count: { lessonId: number } }>),
      lessonIds.length && userIds.length
        ? prisma.lessonProgress.groupBy({
            by: ["userId"],
            where: {
              userId: { in: userIds },
              lessonId: { in: lessonIds },
            },
            _max: { completedAt: true },
          })
        : Promise.resolve(
            [] as Array<{ userId: string; _max: { completedAt: Date | null } }>
          ),
    ]);

    const completedMap = new Map(
      completedRows.map((r) => [r.userId, r._count.lessonId])
    );
    const lastViewedMap = new Map(
      lastViewedRows.map((r) => [r.userId, r._max.completedAt])
    );

    const now = Date.now();
    const students = enrollments.map((e) => {
      const completed = completedMap.get(e.userId) ?? 0;
      const progress =
        totalLessons > 0 ? Math.round((completed / totalLessons) * 100) : 0;
      const isExpired =
        !!e.expiresAt && e.expiresAt.getTime() < now;
      return {
        enrollmentId: e.id,
        userId: e.user.id,
        name: e.user.name,
        email: e.user.email,
        phone: e.user.phone,
        avatarUrl: e.user.avatarUrl,
        enrolledAt: e.createdAt,
        expiresAt: e.expiresAt,
        status: e.status,
        isExpired,
        progress,
        lessonsCompleted: completed,
        totalLessons,
        lastViewedAt: lastViewedMap.get(e.userId) || null,
        tags: e.user.userTags.map((ut) => ut.tag),
      };
    });

    return NextResponse.json({
      students,
      page,
      pageSize: PAGE_SIZE,
      total,
      totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    });
  } catch (error) {
    console.error("GET /api/courses/[id]/students error:", error);
    const msg = error instanceof Error ? error.message : "";
    const status =
      msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}

export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const staff = await requireStaff();
    if (!(await canManageStudentsOfCourse(staff, params.id))) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const raw = await request.json().catch(() => ({}));
    const v = validateBody(enrollCourseStudentSchema, raw);
    if (!v.success) return v.error;
    const { email, name, days, phone } = v.data;

    const course = await prisma.course.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        title: true,
        slug: true,
        workspace: {
          select: { id: true, name: true, slug: true, masterPassword: true },
        },
      },
    });
    if (!course) {
      return NextResponse.json(
        { error: "Curso não encontrado" },
        { status: 404 }
      );
    }

    const { user, tempPassword, isStaff } = await ensureUserByEmail(
      email,
      name,
      course.workspace.id,
      phone?.trim() || undefined
    );

    const expiresAt =
      typeof days === "number" && days > 0
        ? new Date(Date.now() + days * 24 * 60 * 60 * 1000)
        : null;

    const existing = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId: user.id, courseId: course.id } },
    });
    const wasActive = existing?.status === "ACTIVE";

    const enrollment = await prisma.enrollment.upsert({
      where: { userId_courseId: { userId: user.id, courseId: course.id } },
      create: {
        userId: user.id,
        courseId: course.id,
        status: "ACTIVE",
        expiresAt,
      },
      update: { status: "ACTIVE", expiresAt },
    });

    if (!wasActive) {
      await createNotification({
        userId: user.id,
        type: "ENROLLMENT",
        message: `Você foi matriculado no curso ${course.title}`,
        link: `/course/${course.slug}`,
      });
      processAutomations({
        type: "STUDENT_ENROLLED",
        workspaceId: course.workspace.id,
        courseId: course.id,
        userId: user.id,
      }).catch(() => {});
    }

    const baseUrl = new URL(request.url).origin;
    const accessLink = await sendWorkspaceAccessEmail(
      user.email,
      course.workspace.slug,
      baseUrl
    );

    // Build a shareable credential block for the producer to hand to the
    // student. Rules:
    //  - Staff buyers (PRODUCER/ADMIN/COLLAB) keep their existing global
    //    Members Club password — we NEVER rotate it (would lock them out
    //    of their own account). Email uses the staff template that points
    //    them at their existing credential.
    //  - Pure STUDENTs only get a fresh password on a new/reactivated
    //    enrollment. On a re-enrollment of an already-ACTIVE student we
    //    leave the WorkspaceCredential intact (rotating it without sending
    //    a new email would silently lock them out).
    //  - Master password (if configured) is preserved on the workspace for
    //    the producer's own use but never leaves the server.
    let sharedPassword: string | null = null;
    if (!wasActive && !isStaff) {
      try {
        if (tempPassword) {
          // ensureUserByEmail just created the WorkspaceCredential with
          // this mc-XXXXXX — reuse it instead of rotating again.
          sharedPassword = tempPassword;
        } else {
          // Existing credential — rotate it with a fresh mc-XXXXXX.
          sharedPassword = generateTempPassword();
          const salt = generateSalt();
          const passwordHash = hashPassword(sharedPassword, salt);
          await prisma.workspaceCredential.upsert({
            where: {
              userId_workspaceId: {
                userId: user.id,
                workspaceId: course.workspace.id,
              },
            },
            create: {
              userId: user.id,
              workspaceId: course.workspace.id,
              passwordHash,
              salt,
            },
            update: { passwordHash, salt },
          });
        }
      } catch (e) {
        logger.error("ENROLL", "rotate temp password failed", {
          email,
          error: e instanceof Error ? e.message : String(e),
        });
        sharedPassword = null;
      }
    }

    const workspaceUrl = `${baseUrl}/w/${course.workspace.slug}`;

    if (!wasActive) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || baseUrl;
      const loginUrl = `${appUrl}/w/${course.workspace.slug}/login`;
      const template = isStaff
        ? staffAccessGranted(
            user.name || email,
            course.title,
            course.workspace.name,
            loginUrl
          )
        : studentAccessGranted(
            user.name || email,
            course.title,
            course.workspace.name,
            loginUrl,
            sharedPassword || undefined
          );
      sendEmail({
        to: { email, name: user.name || undefined },
        ...template,
        senderName: course.workspace.name,
      }).catch((err) =>
        logger.error("ENROLL", "email failed", {
          email,
          error: err instanceof Error ? err.message : String(err),
        })
      );
    }

    return NextResponse.json({
      enrollment,
      accessLink,
      access: {
        email: user.email,
        password: sharedPassword,
        workspaceUrl,
        isMaster: false,
      },
    });
  } catch (error) {
    console.error("POST /api/courses/[id]/students error:", error);
    const msg = error instanceof Error ? error.message : "";
    const status =
      msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro" }, { status });
  }
}
