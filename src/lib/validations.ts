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

export const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(6, "Senha deve ter pelo menos 6 caracteres")
    .max(128, "Senha muito longa"),
});

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Senha atual obrigatória").max(128),
  newPassword: z
    .string()
    .min(6, "A nova senha precisa ter pelo menos 6 caracteres")
    .max(128, "Senha muito longa"),
});

export const impersonateSessionSchema = z.object({
  token: z.string().min(1, "Token obrigatório").max(200),
});

const mfaFactorId = z.string().min(1, "Factor ID obrigatório").max(100);
const mfaCode = z.string().min(6, "Código inválido").max(8);

export const mfaUnenrollSchema = z.object({ factorId: mfaFactorId });
export const mfaChallengeSchema = z.object({
  factorId: mfaFactorId,
  code: mfaCode,
});
export const mfaVerifySchema = z.object({
  factorId: mfaFactorId,
  code: mfaCode,
});

// ─── Webhooks (Applyfy) ────────────────────────────────────────────
// Covers /api/webhooks/applyfy, /api/webhooks/members-club, and the
// workspace-scoped /api/webhooks/applyfy/[slug]. All three receive
// the same Applyfy payload shape (members-club adds an optional
// `subscription` block). passthrough() keeps unknown gateway fields.

export const applyfyWebhookSchema = z
  .object({
    event: z.string().min(1).max(100).optional(),
    token: z.string().max(500).optional(),
    offerCode: z.string().max(200).optional(),
    client: z
      .object({
        id: z.string().max(200).optional(),
        name: z.string().max(255).optional(),
        email: z.string().email().max(255).optional(),
        phone: z.string().max(50).optional(),
      })
      .passthrough()
      .optional(),
    transaction: z
      .object({
        id: z.string().max(200).optional(),
        status: z.string().max(50).optional(),
        paymentMethod: z.string().max(50).optional(),
        amount: z.number().optional(),
        payedAt: z.string().max(50).optional(),
      })
      .passthrough()
      .optional(),
    subscription: z
      .object({
        id: z.string().max(200).optional(),
        status: z.string().max(50).optional(),
        intervalType: z.string().max(50).optional(),
        intervalCount: z.number().optional(),
        cycle: z.number().optional(),
      })
      .passthrough()
      .nullable()
      .optional(),
    orderItems: z
      .array(
        z
          .object({
            id: z.string().max(200).optional(),
            price: z.number().optional(),
            product: z
              .object({
                id: z.string().max(200).optional(),
                name: z.string().max(255).optional(),
                externalId: z.string().max(200).optional(),
              })
              .passthrough()
              .optional(),
          })
          .passthrough()
      )
      .optional(),
  })
  .passthrough();

// ─── Billing / Subscription (admin) ────────────────────────────────

export const createProducerSubscriptionSchema = z.object({
  planId: z.string().min(1, "planId obrigatório").max(100),
  exempt: z.boolean().optional(),
  exemptReason: z.string().max(500).optional().nullable(),
});

export const subscriptionActionSchema = z
  .object({
    action: z.enum([
      "activate",
      "suspend",
      "cancel",
      "reactivate",
      "exempt",
      "remove_exempt",
      "change_plan",
      "extend",
    ]),
    reason: z.string().max(500).optional(),
    planId: z.string().min(1).max(100).optional(),
    // `extend` parses days via parseInt — accept number or numeric string.
    days: z.union([z.number(), z.string()]).optional(),
  })
  .passthrough();

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
