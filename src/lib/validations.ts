import { z } from "zod";
import { NextResponse } from "next/server";

// IDs in this codebase are uuid for most models, cuid for some — accept either via min/max.
const idString = z.string().min(1).max(100);

// CPF (11 digits) or CNPJ (14 digits). Accepts the masked form
// (e.g. 000.000.000-00) and validates the digit count after stripping
// non-numerics. Empty/undefined is allowed — the field stays optional.
export const cpfCnpjSchema = z
  .string()
  .max(20)
  .refine(
    (val) => {
      const digits = val.replace(/\D/g, "");
      return digits.length === 11 || digits.length === 14;
    },
    { message: "CPF (11 dígitos) ou CNPJ (14 dígitos) inválido" }
  );

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
    document: cpfCnpjSchema.optional(),
  })
  .passthrough();

export const forgotPasswordSchema = z.object({
  email: z.string().email("Email inválido").max(255),
  from: z.string().max(50).optional(),
  workspace: z.string().max(200).optional(),
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
    offerCode: z.string().max(200).nullable().optional(),
    // Applyfy frequently sends `null` for optional sub-objects and scalars
    // (no CNPJ, no payment installments, no externalId on test products).
    // Every field below allows null so a missing-vs-null distinction in the
    // payload doesn't reject the webhook.
    client: z
      .object({
        id: z.string().max(200).nullable().optional(),
        name: z.string().max(255).nullable().optional(),
        // Email comes from Applyfy in shapes that don't always pass strict
        // RFC validation (extra spaces, missing TLD on test orders, etc.).
        // We accept any string here and revalidate downstream.
        email: z.string().max(255).nullable().optional(),
        phone: z.string().max(50).nullable().optional(),
        cnpj: z.string().max(50).nullable().optional(),
        cpf: z.string().max(50).nullable().optional(),
        address: z.unknown().nullable().optional(),
      })
      .passthrough()
      .nullable()
      .optional(),
    transaction: z
      .object({
        id: z.string().max(200).nullable().optional(),
        status: z.string().max(50).nullable().optional(),
        paymentMethod: z.string().max(50).nullable().optional(),
        // Applyfy sometimes serializes amounts as strings ("99.90"), so we
        // coerce numeric fields. Same for installments / exchange rate.
        amount: z.coerce.number().nullable().optional(),
        installments: z.coerce.number().nullable().optional(),
        exchangeRate: z.coerce.number().nullable().optional(),
        payedAt: z.string().max(50).nullable().optional(),
        pixInformation: z.unknown().nullable().optional(),
        boletoInformation: z.unknown().nullable().optional(),
      })
      .passthrough()
      .nullable()
      .optional(),
    subscription: z
      .object({
        id: z.string().max(200).nullable().optional(),
        status: z.string().max(50).nullable().optional(),
        intervalType: z.string().max(50).nullable().optional(),
        intervalCount: z.coerce.number().nullable().optional(),
        cycle: z.coerce.number().nullable().optional(),
      })
      .passthrough()
      .nullable()
      .optional(),
    orderItems: z
      .array(
        z
          .object({
            id: z.string().max(200).nullable().optional(),
            price: z.coerce.number().nullable().optional(),
            product: z
              .object({
                id: z.string().max(200).nullable().optional(),
                name: z.string().max(255).nullable().optional(),
                externalId: z.string().max(200).nullable().optional(),
              })
              .passthrough()
              .nullable()
              .optional(),
          })
          .passthrough()
      )
      .nullable()
      .optional(),
    trackProps: z
      .object({
        ip: z.string().max(100).nullable().optional(),
        user_agent: z.string().max(500).nullable().optional(),
        affiliate_code: z.string().max(200).nullable().optional(),
      })
      .passthrough()
      .nullable()
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

// ─── Producer — settings & generic ─────────────────────────────────

export const producerSettingsSchema = z.object({
  settings: z.record(z.string(), z.union([z.string(), z.null()])),
});

export const reorderItemsSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().min(1).max(100),
      order: z.number().int().min(0),
    })
  ),
});

export const onboardingSchema = z
  .object({
    type: z.string().max(100).optional().nullable(),
  })
  .passthrough();

// ─── Producer — collaborators ──────────────────────────────────────

export const createCollaboratorSchema = z.object({
  email: z.string().email("Email inválido").max(255),
  name: z.string().max(255).optional().nullable(),
  permissions: z.array(z.string().max(50)).optional(),
  courseIds: z.array(idString).optional(),
});

export const updateCollaboratorSchema = z
  .object({
    name: z.string().max(255).optional().nullable(),
    permissions: z.array(z.string().max(50)).optional(),
    courseIds: z.array(idString).optional(),
  })
  .passthrough();

// ─── Producer — tags ───────────────────────────────────────────────

export const createTagSchema = z.object({
  name: z.string().min(1, "Nome obrigatório").max(100),
  color: z.string().max(20).optional(),
});

export const updateTagSchema = z.object({
  name: z.string().max(100).optional(),
  color: z.string().max(20).optional(),
});

// ─── Producer — theme & customize (loose, passthrough) ─────────────

export const producerThemeSchema = z
  .object({
    mode: z.enum(["dark", "light"]).optional(),
  })
  .passthrough();

export const courseCustomizeSchema = z
  .object({
    memberLayoutStyle: z.string().max(50).optional(),
  })
  .passthrough();

export const vitrineCustomizeSchema = z.object({
  vitrineBgColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida").nullable().optional(),
  vitrineSidebarColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida").nullable().optional(),
  vitrineHeaderColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida").nullable().optional(),
  vitrineCardColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida").nullable().optional(),
  vitrineTextColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida").nullable().optional(),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida").nullable().optional(),
  vitrineWelcomeText: z.string().max(200).nullable().optional(),
  vitrineWelcomeTitle: z.string().max(100).nullable().optional(),
  vitrineWelcomeEnabled: z.boolean().optional(),
  vitrineBannerFadeEnabled: z.boolean().optional(),
  vitrineBannerFadeColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Cor inválida").nullable().optional(),
  vitrineBannerFadeOpacity: z.number().min(0).max(1).nullable().optional(),
  vitrineLayoutStyle: z.enum(["netflix", "list", "grid"]).nullable().optional(),
});

// ─── Producer — automations ────────────────────────────────────────

export const createAutomationSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(255),
  triggerType: z.string().min(1).max(100),
  triggerConfig: z.record(z.string(), z.unknown()).optional(),
  actionType: z.string().min(1).max(100),
  actionConfig: z.record(z.string(), z.unknown()).optional(),
  courseId: idString.optional().nullable(),
});

export const updateAutomationSchema = z
  .object({
    name: z.string().max(255).optional(),
    active: z.boolean().optional(),
    triggerType: z.string().max(100).optional(),
    triggerConfig: z.record(z.string(), z.unknown()).optional(),
    actionType: z.string().max(100).optional(),
    actionConfig: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

// ─── Producer — lives ──────────────────────────────────────────────

const liveBaseFields = {
  title: z.string().max(255),
  description: z.string().max(5000).optional().nullable(),
  platform: z.string().max(50),
  externalUrl: z.string().max(2000),
  embedUrl: z.string().max(2000).optional().nullable(),
  scheduledAt: z.string().max(50),
  courseId: idString.optional().nullable(),
  thumbnailUrl: z.string().max(2000).optional().nullable(),
  recordingUrl: z.string().max(2000).optional().nullable(),
  savedAsLessonId: idString.optional().nullable(),
  visibility: z.enum(["PUBLIC", "COURSE_ONLY"]).optional(),
};

export const createLiveSchema = z.object({
  ...liveBaseFields,
  title: z.string().min(1, "Título é obrigatório").max(255),
  externalUrl: z.string().min(1, "Link da live é obrigatório").max(2000),
  scheduledAt: z.string().min(1, "Data agendada é obrigatória").max(50),
});

export const updateLiveSchema = z
  .object({
    title: z.string().max(255).optional(),
    description: z.string().max(5000).optional().nullable(),
    platform: z.string().max(50).optional(),
    externalUrl: z.string().max(2000).optional(),
    embedUrl: z.string().max(2000).optional().nullable(),
    scheduledAt: z.string().max(50).optional(),
    courseId: idString.optional().nullable(),
    thumbnailUrl: z.string().max(2000).optional().nullable(),
    recordingUrl: z.string().max(2000).optional().nullable(),
    savedAsLessonId: idString.optional().nullable(),
    visibility: z.enum(["PUBLIC", "COURSE_ONLY"]).optional(),
  })
  .passthrough();

export const moderateLiveSchema = z.object({
  roomOpen: z.boolean().optional(),
  chatEnabled: z.boolean().optional(),
});

export const liveStatusSchema = z.object({
  status: z.string().min(1).max(50),
});

export const liveModeratorSchema = z.object({
  userId: z.string().min(1).max(100),
});

// ─── Producer — integrations ───────────────────────────────────────

export const integrationRequestSchema = z
  .object({
    gateway: z.string().max(100).optional(),
    email: z.string().max(255).optional(),
    notes: z.string().max(2000).optional(),
  })
  .passthrough();

export const updateCourseExternalIdSchema = z
  .object({
    externalProductIds: z.array(z.string().max(200)).optional(),
    externalProductId: z.union([z.string().max(200), z.null()]).optional(), // retrocompat
  })
  .passthrough();

// ─── Producer — community groups ───────────────────────────────────

export const createCommunityGroupSchema = z.object({
  courseId: z.string().min(1, "courseId obrigatório").max(100),
  name: z.string().min(1, "name obrigatório").max(255),
  description: z.string().max(2000).optional().nullable(),
  permission: z.enum(["READ_WRITE", "READ_ONLY"]).optional(),
  order: z.number().int().min(0).optional(),
});

export const updateCommunityGroupSchema = z
  .object({
    name: z.string().max(255).optional(),
    description: z.string().max(2000).optional().nullable(),
    permission: z.enum(["READ_WRITE", "READ_ONLY"]).optional(),
    order: z.number().int().min(0).optional(),
  })
  .passthrough();

// ─── Producer — students ───────────────────────────────────────────

export const enrollStudentSchema = z.object({
  courseId: z.string().min(1, "courseId obrigatório").max(100),
});

export const studentTagSchema = z.object({
  tagId: z.string().min(1, "tagId obrigatório").max(100),
});

// ─── Producer — quiz ───────────────────────────────────────────────

export const createQuizSchema = z
  .object({
    title: z.string().max(255).optional().nullable(),
    passingScore: z.number().int().min(0).max(100).optional(),
    showAnswers: z.boolean().optional(),
  })
  .passthrough();

export const updateQuizSchema = z
  .object({
    title: z.string().max(255).optional().nullable(),
    passingScore: z.union([z.number(), z.string()]).optional(),
    showAnswers: z.boolean().optional(),
  })
  .passthrough();

const quizOptionShape = z.object({
  text: z.string().min(1, "Texto da opção obrigatório").max(500),
  isCorrect: z.boolean().optional(),
});

export const createQuizQuestionSchema = z.object({
  text: z.string().min(1, "Texto da pergunta obrigatório").max(2000),
  options: z.array(quizOptionShape).min(2, "Mínimo 2 opções").max(6, "Máximo 6 opções"),
});

export const updateQuizQuestionSchema = z
  .object({
    text: z.string().min(1).max(2000).optional(),
    options: z
      .array(quizOptionShape)
      .min(2, "Mínimo 2 opções")
      .max(6, "Máximo 6 opções")
      .optional(),
  })
  .passthrough();

// ─── Public / Student ──────────────────────────────────────────────

export const progressSchema = z.object({
  lessonId: z.string().min(1).max(100),
  completed: z.boolean(),
});

export const pushSubscribeSchema = z.object({
  endpoint: z.string().min(1).max(2000),
  p256dh: z.string().min(1).max(500),
  auth: z.string().min(1).max(500),
  device: z.string().max(500).optional().nullable(),
  workspaceSlug: z.string().max(200).optional().nullable(),
});

export const lessonReactionSchema = z.object({
  type: z.enum(["LIKE", "DISLIKE"]),
  reason: z.string().optional(),
  comment: z.string().max(200).optional(),
});

export const quizAttemptSchema = z.object({
  answers: z
    .array(
      z.object({
        questionId: z.string().min(1).max(100),
        selectedOptionId: z.string().min(1).max(100),
      })
    )
    .min(1),
});

export const liveMessageSchema = z.object({
  content: z.string().min(1, "Mensagem vazia").max(5000),
});

export const courseReviewSchema = z.object({
  rating: z.union([z.number(), z.string()]),
  comment: z.string().max(5000).optional(),
});

export const inviteAcceptSchema = z
  .object({
    mode: z.enum(["login", "signup"]).optional(),
    name: z.string().max(255).optional(),
    password: z.string().max(128).optional(),
  })
  .passthrough();

// ─── Admin — collaborators / users / plans / settings ──────────────

export const createAdminCollaboratorSchema = z.object({
  email: z.string().email("Email inválido").max(255),
  name: z.string().max(255).optional().nullable(),
  permissions: z.array(z.string().max(50)).optional(),
});

export const updateAdminCollaboratorSchema = z
  .object({
    name: z.string().max(255).optional().nullable(),
    permissions: z.array(z.string().max(50)).optional(),
    status: z.string().max(50).optional(),
  })
  .passthrough();

export const createPlanSchema = z.object({
  name: z.string().min(1, "name obrigatório").max(255),
  slug: z.string().min(1, "slug obrigatório").max(100),
  price: z.number(),
  currency: z.string().max(10).optional(),
  interval: z.string().max(50).optional(),
  maxWorkspaces: z.number().int().optional(),
  maxCoursesPerWorkspace: z.number().int().optional(),
  features: z.string().max(50000).optional().nullable(),
});

export const updatePlanSchema = z
  .object({
    name: z.string().max(255).optional(),
    price: z.number().optional(),
    maxWorkspaces: z.number().int().optional(),
    maxCoursesPerWorkspace: z.number().int().optional(),
    features: z.string().max(50000).optional().nullable(),
    active: z.boolean().optional(),
  })
  .passthrough();

export const testEmailSchema = z.object({
  to: z.string().email("Email inválido").max(255),
  template: z.string().min(1).max(100),
});

export const platformSettingsSchema = z
  .object({
    logoUrl: z.string().max(2000).optional().nullable(),
    faviconUrl: z.string().max(2000).optional().nullable(),
  })
  .passthrough();

export const adminUserRoleSchema = z.object({
  role: z.string().min(1).max(50),
});

export const adminProducerActionSchema = z.object({
  action: z.enum(["suspend", "activate"]),
});

export const integrationRequestStatusSchema = z.object({
  status: z.string().min(1).max(50),
});

// ─── Workspaces ────────────────────────────────────────────────────

export const createWorkspaceSchema = z.object({
  name: z.string().min(1, "Nome obrigatório").max(255),
  slug: z.string().min(1, "Slug obrigatório").max(100),
  loginBgColor: z.string().max(20).optional().nullable(),
});

export const updateWorkspaceSchema = z
  .object({
    name: z.string().max(255).optional(),
    logoUrl: z.string().max(2000).optional().nullable(),
    isActive: z.boolean().optional(),
    masterPassword: z.string().max(255).optional().nullable(),
    loginLayout: z.string().max(50).optional(),
    loginBoxOpacity: z.union([z.number(), z.string()]).optional(),
    // Access-email customization. Length caps here; hex/shape validated in
    // the route. emailCustomHtml is raw HTML the producer is responsible for.
    emailLogoUrl: z.string().max(500).optional().nullable(),
    emailPrimaryColor: z.string().max(20).optional().nullable(),
    emailBgColor: z.string().max(20).optional().nullable(),
    emailBoxColor: z.string().max(20).optional().nullable(),
    emailTitle: z.string().max(200).optional().nullable(),
    emailBody: z.string().max(10000).optional().nullable(),
    emailFooter: z.string().max(500).optional().nullable(),
    emailCustomHtml: z.string().max(50000).optional().nullable(),
    emailUseCustomHtml: z.boolean().optional(),
  })
  .passthrough();

// ─── Courses CRUD ──────────────────────────────────────────────────

export const createCourseSchema = z
  .object({
    title: z.string().min(1, "title obrigatório").max(255),
    slug: z.string().min(1, "slug obrigatório").max(255),
    description: z.string().min(1, "description obrigatório").max(110),
    thumbnail: z.string().max(2000).optional().nullable(),
    checkoutUrl: z.string().max(2000).optional().nullable(),
    externalProductId: z.string().max(200).optional().nullable(),
    isPublished: z.boolean().optional(),
    showInStore: z.boolean().optional(),
    featured: z.boolean().optional(),
    category: z.string().max(100).optional().nullable(),
    workspaceId: z.string().max(100).optional(),
    supportEmail: z
      .string()
      .min(1, "Email de suporte obrigatório")
      .email("Email inválido")
      .max(255),
    supportWhatsapp: z
      .string()
      .min(8, "WhatsApp de suporte obrigatório")
      .max(50),
  })
  .passthrough();

export const courseReorderSchema = z
  .object({
    items: z
      .array(
        z.object({
          type: z.string().min(1).max(50),
          id: z.string().min(1).max(100),
        })
      )
      .optional(),
    // Legacy fallback used by older clients
    moduleIds: z.array(z.string().min(1).max(100)).optional(),
  })
  .passthrough();

export const titleOnlySchema = z.object({
  title: z.string().min(1, "Título obrigatório").max(255),
});

export const enrollCourseStudentSchema = z.object({
  email: z.string().email("Email inválido").max(255),
  name: z.string().max(255).optional(),
  days: z.union([z.number(), z.string()]).optional().nullable(),
  phone: z.string().max(50).optional(),
});

export const createMenuItemSchema = z.object({
  label: z.string().min(1, "label obrigatório").max(255),
  icon: z.string().min(1).max(100),
  url: z.string().min(1).max(2000),
});

export const updateMenuItemSchema = z
  .object({
    label: z.string().max(255).optional(),
    icon: z.string().max(100).optional(),
    url: z.string().max(2000).optional(),
    enabled: z.boolean().optional(),
  })
  .passthrough();

export const menuReorderSchema = z.object({
  itemIds: z.array(z.string().min(1).max(100)),
});

export const createCourseModuleSchema = z.object({
  title: z.string().min(1, "Título obrigatório").max(255),
  daysToRelease: z.number().int().min(0).optional(),
});

export const enrollmentUpdateSchema = z
  .object({
    expiresAt: z.union([z.string(), z.null()]).optional(),
  })
  .passthrough();

export const enrollmentOverrideSchema = z
  .object({
    moduleId: z.string().max(100).optional().nullable(),
    lessonId: z.string().max(100).optional().nullable(),
    released: z.boolean().optional(),
  })
  .passthrough();

// ─── Modules / Sections / Lessons CRUD ─────────────────────────────

export const updateSectionSchema = z.object({
  title: z.string().min(1).max(255),
});

export const updateModuleSchema = z
  .object({
    title: z.string().max(255).optional(),
    daysToRelease: z.number().int().min(0).optional(),
    thumbnailUrl: z.string().max(2000).optional().nullable(),
    sectionId: z.string().max(100).optional().nullable(),
    hideTitle: z.boolean().optional(),
    releaseAt: z.union([z.string(), z.null()]).optional(),
  })
  .passthrough();

export const reorderLessonsSchema = z.object({
  lessonIds: z.array(z.string().min(1).max(100)),
});

export const createLessonSchema = z.object({
  title: z.string().min(1, "Título obrigatório").max(255),
  description: z.string().max(50000).optional().nullable(),
  videoUrl: z.string().max(2000).optional().nullable(),
  hideYoutubeChrome: z.boolean().optional(),
  duration: z.union([z.number(), z.null()]).optional(),
  daysToRelease: z.number().int().min(0).optional(),
});

export const updateLessonSchema = z
  .object({
    title: z.string().max(255).optional(),
    description: z.string().max(50000).optional().nullable(),
    videoUrl: z.string().max(2000).optional(),
    hideYoutubeChrome: z.boolean().optional(),
    duration: z.union([z.number(), z.null()]).optional(),
    daysToRelease: z.number().optional(),
  })
  .passthrough();

// ─── Posts (community) ─────────────────────────────────────────────

export const updatePostSchema = z.object({
  content: z.string().min(1).max(20000),
  type: z.enum(["FREE", "QUESTION", "RESULT", "FEEDBACK"]).optional(),
});

// ─── Producer — lesson materials ───────────────────────────────────

export const updateLessonMaterialSchema = z
  .object({
    name: z.string().max(255).optional(),
    sortOrder: z.number().int().min(0).optional(),
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
    description: z.string().max(110).optional().nullable(),
    price: z.union([z.number().min(0), z.string(), z.null()]).optional(),
    priceCurrency: z.string().max(10).optional(),
    isPublished: z.boolean().optional(),
    supportEmail: z
      .string()
      .min(1, "Email de suporte obrigatório")
      .email("Email inválido")
      .max(255)
      .optional(),
    supportWhatsapp: z
      .string()
      .min(8, "WhatsApp de suporte obrigatório")
      .max(50)
      .optional(),
    bannerExtra: z
      .array(
        z.object({
          url: z.string().min(1),
          position: z.object({
            x: z.number().min(0).max(100),
            y: z.number().min(0).max(100),
          }),
        })
      )
      .max(4)
      .optional()
      .nullable(),
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

// ─── Course support (F2 — student↔producer per course) ────────────

export const createCourseSupportTicketSchema = z.object({
  courseId: idString,
  subject: z.string().min(1, "Assunto obrigatório").max(200),
  body: z.string().min(1, "Mensagem obrigatória").max(20000),
  attachments: z.array(attachmentPath).max(5).optional(),
});

export const courseSupportMessageSchema = z.object({
  body: z.string().min(1, "Mensagem obrigatória").max(20000),
  attachments: z.array(attachmentPath).max(5).optional(),
});

export const courseSupportStatusSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"]),
});

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
