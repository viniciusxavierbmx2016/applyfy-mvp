import { z } from "zod";
import { NextResponse } from "next/server";

// IDs in this codebase are uuid for most models, cuid for some — accept either via min/max.
const idString = z.string().min(1).max(100);

// ─── Auth ──────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email("Email inválido").max(255),
  password: z
    .string()
    .min(6, "Senha deve ter pelo menos 6 caracteres")
    .max(128),
});

export const registerSchema = z
  .object({
    email: z.string().email("Email inválido").max(255),
    password: z
      .string()
      .min(6, "Senha deve ter pelo menos 6 caracteres")
      .max(128),
    name: z.string().min(1, "Nome obrigatório").max(255).optional(),
  })
  .passthrough();

export const forgotPasswordSchema = z.object({
  email: z.string().email("Email inválido").max(255),
  from: z.string().max(50).optional(),
});

// ─── Community / posts ─────────────────────────────────────────────

export const createPostSchema = z
  .object({
    content: z.string().min(1, "Conteúdo obrigatório").max(20000),
    courseId: idString.optional(),
    courseSlug: z.string().min(1).max(255).optional(),
    groupId: idString.optional().nullable(),
    type: z.enum(["FREE", "QUESTION", "RESULT", "FEEDBACK"]).optional(),
  })
  .refine((d) => Boolean(d.courseId || d.courseSlug), {
    message: "courseId ou courseSlug obrigatório",
  });

export const createCommentSchema = z.object({
  content: z.string().min(1, "Conteúdo obrigatório").max(5000),
  parentId: idString.optional().nullable(),
});

export const createLessonCommentSchema = z.object({
  content: z.string().min(1, "Conteúdo obrigatório").max(5000),
  parentId: idString.optional().nullable(),
});

// ─── Course (update) ───────────────────────────────────────────────
// passthrough so unknown fields pass through (incremental hardening).

export const updateCourseSchema = z
  .object({
    title: z.string().min(1).max(255).optional(),
    slug: z
      .string()
      .min(1)
      .max(255)
      .regex(/^[a-z0-9-]+$/, "Slug inválido")
      .optional(),
    description: z.string().max(50000).optional().nullable(),
    price: z.union([z.number().min(0), z.string(), z.null()]).optional(),
    priceCurrency: z.string().max(10).optional(),
    isPublished: z.boolean().optional(),
  })
  .passthrough();

// ─── Support tickets ───────────────────────────────────────────────

const attachmentPath = z.string().min(1).max(500);

export const createTicketSchema = z.object({
  subject: z.string().min(1, "Assunto obrigatório").max(200),
  body: z.string().min(1, "Mensagem obrigatória").max(20000),
  attachments: z.array(attachmentPath).max(5).optional(),
});

export const ticketMessageSchema = z.object({
  body: z.string().min(1, "Mensagem obrigatória").max(20000),
  attachments: z.array(attachmentPath).max(5).optional(),
});

export const ticketUpdateSchema = z
  .object({
    status: z
      .enum(["OPEN", "IN_PROGRESS", "WAITING_RESPONSE", "RESOLVED", "CLOSED"])
      .optional(),
    priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).optional(),
    assignedToId: z.union([z.string().min(1).max(100), z.null()]).optional(),
  })
  .refine(
    (d) =>
      d.status !== undefined ||
      d.priority !== undefined ||
      d.assignedToId !== undefined,
    { message: "Nada para atualizar" }
  );

// ─── Moderation ────────────────────────────────────────────────────

export const moderateSchema = z.object({
  items: z
    .array(
      z.object({
        type: z.enum([
          "lesson_comment",
          "community_comment",
          "community_post",
        ]),
        id: idString,
      })
    )
    .min(1)
    .max(100),
  action: z.enum(["approve", "reject"]),
});

// ─── Helper ────────────────────────────────────────────────────────

export function validateBody<T>(
  schema: z.ZodType<T>,
  body: unknown
):
  | { success: true; data: T }
  | { success: false; error: NextResponse } {
  const result = schema.safeParse(body);
  if (!result.success) {
    const firstError = result.error.issues[0]?.message || "Dados inválidos";
    return {
      success: false,
      error: NextResponse.json({ error: firstError }, { status: 400 }),
    };
  }
  return { success: true, data: result.data };
}
