import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { canManageStudentsOfCourse, requireStaff } from "@/lib/auth";
import {
  ensureUserByEmail,
  sendWorkspaceAccessEmail,
} from "@/lib/webhook-helpers";
import { createAdminClient } from "@/lib/supabase-admin";
import { createNotification } from "@/lib/notifications";
import { sendEmail } from "@/lib/email";
import { studentAccessGranted } from "@/lib/email-templates";

function randomTempPassword(len = 8) {
  const alphabet = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

const PAGE_SIZE = 20;

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
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
              avatarUrl: true,
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
        avatarUrl: e.user.avatarUrl,
        enrolledAt: e.createdAt,
        expiresAt: e.expiresAt,
        status: e.status,
        isExpired,
        progress,
        lessonsCompleted: completed,
        totalLessons,
        lastViewedAt: lastViewedMap.get(e.userId) || null,
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

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const staff = await requireStaff();
    if (!(await canManageStudentsOfCourse(staff, params.id))) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    const { email, name, days } = (await request.json()) as {
      email?: string;
      name?: string;
      days?: number | null;
    };
    if (!email) {
      return NextResponse.json({ error: "Email obrigatório" }, { status: 400 });
    }

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

    const user = await ensureUserByEmail(email, name, course.workspace.id);

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
    }

    const baseUrl = new URL(request.url).origin;
    const accessLink = await sendWorkspaceAccessEmail(
      user.email,
      course.workspace.slug,
      baseUrl
    );

    // Build a shareable credential block so the producer can hand the access
    // directly to the student. Master password (if set) wins so the student
    // can reuse the same credential the producer already shares; otherwise we
    // generate a fresh 8-char password and rotate the Supabase auth user.
    let sharedPassword: string | null = null;
    if (course.workspace.masterPassword) {
      sharedPassword = course.workspace.masterPassword;
    } else {
      sharedPassword = randomTempPassword(8);
      try {
        const admin = createAdminClient();
        await admin.auth.admin.updateUserById(user.id, {
          password: sharedPassword,
        });
      } catch (e) {
        console.error("rotate temp password error:", e);
        sharedPassword = null;
      }
    }

    const workspaceUrl = `${baseUrl}/w/${course.workspace.slug}`;

    if (!wasActive) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || baseUrl;
      const loginUrl = `${appUrl}/w/${course.workspace.slug}/login`;
      const template = studentAccessGranted(
        name || email,
        course.title,
        course.workspace.name,
        loginUrl,
        sharedPassword || undefined
      );
      sendEmail({ to: { email: user.email, name: name || undefined }, ...template }).catch(() => {});
    }

    return NextResponse.json({
      enrollment,
      accessLink,
      access: {
        email: user.email,
        password: sharedPassword,
        workspaceUrl,
        isMaster: !!course.workspace.masterPassword,
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
