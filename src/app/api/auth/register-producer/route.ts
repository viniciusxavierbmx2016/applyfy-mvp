import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@/lib/supabase-route";
import { createAdminClient } from "@/lib/supabase-admin";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { welcomeProducer } from "@/lib/email-templates";
import { rateLimit } from "@/lib/rate-limit";
import { registerSchema, validateBody } from "@/lib/validations";
import { encrypt } from "@/lib/encryption";

export async function POST(request: Request) {
  const limited = rateLimit(request);
  if (limited) return limited;

  try {
    const body = await request.json();
    const v = validateBody(registerSchema, body);
    if (!v.success) return v.error;
    const {
      email, password, name, phone, businessType, niche,
      monthlyRevenue, referralSource, document,
    } = v.data as typeof v.data & {
      phone?: string; businessType?: string; niche?: string;
      monthlyRevenue?: string; referralSource?: string; document?: string;
    };
    if (!name) {
      return NextResponse.json(
        { error: "Nome obrigatório" },
        { status: 400 }
      );
    }

    const supabase = await createRouteHandlerClient();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, role: "PRODUCER" } },
    });
    if (error) {
      console.error("[AUTH] Register producer error:", error.message);
      const msg = error.message ?? "";
      if (
        msg.includes("already registered") ||
        msg.includes("already been registered")
      ) {
        // The email already exists in Supabase Auth. This is the common case
        // of a STUDENT (created by the Applyfy webhook when they bought a
        // course) who now wants a producer account. Attempt an in-place
        // upgrade instead of dead-ending with a 409. Enrollments and
        // WorkspaceCredentials are left untouched — student access is
        // preserved (course/workspace gates are enrollment-based, not role).
        const normalizedEmail = email.trim().toLowerCase();
        const existingUser = await prisma.user.findFirst({
          where: { email: normalizedEmail },
        });

        // Auth identity with no Prisma row → orphaned/edge case. Keep 409.
        if (!existingUser) {
          return NextResponse.json(
            { error: "Este email já está cadastrado. Tente fazer login." },
            { status: 409 }
          );
        }

        // Already staff → nothing to upgrade; same message as before.
        if (
          existingUser.role === "PRODUCER" ||
          existingUser.role === "ADMIN" ||
          existingUser.role === "ADMIN_COLLABORATOR"
        ) {
          return NextResponse.json(
            { error: "Este email já está cadastrado. Tente fazer login." },
            { status: 409 }
          );
        }

        // Collaborator (by role or by an accepted Collaborator row) is staff
        // of another producer — converting would tangle that binding. Block
        // and route to support. NOTE: the model uses status:"ACCEPTED", there
        // is no boolean `accepted` field.
        const acceptedCollab = await prisma.collaborator.findFirst({
          where: { userId: existingUser.id, status: "ACCEPTED" },
          select: { id: true },
        });
        if (existingUser.role === "COLLABORATOR" || acceptedCollab) {
          return NextResponse.json(
            {
              error:
                "Este email está vinculado como colaborador de outro produtor. Entre em contato com o suporte para converter sua conta.",
            },
            { status: 409 }
          );
        }

        // Pure STUDENT → upgrade to PRODUCER.
        try {
          // a. Prisma first (role + subscription) so a Supabase password
          //    failure below can't leave us with a producer password but a
          //    student role. Worst case after this commit: role=PRODUCER with
          //    the old password — recoverable via "esqueci minha senha".
          await prisma.$transaction(async (tx) => {
            await tx.user.update({
              where: { id: existingUser.id },
              data: {
                role: "PRODUCER",
                ...(name && !existingUser.name ? { name } : {}),
                ...(phone && !existingUser.phone ? { phone } : {}),
                ...(businessType ? { businessType } : {}),
                ...(niche ? { niche } : {}),
                ...(monthlyRevenue ? { monthlyRevenue } : {}),
                ...(referralSource ? { referralSource } : {}),
                // Encrypt like the new-account path; only fill when empty so
                // we never clobber an existing encrypted document.
                ...(document && !existingUser.document
                  ? { document: encrypt(document) }
                  : {}),
              },
            });

            const existingSub = await tx.subscription.findFirst({
              where: { userId: existingUser.id },
              select: { id: true },
            });
            if (!existingSub) {
              const defaultPlan = await tx.plan.findFirst({
                where: { active: true },
                orderBy: { price: "asc" },
              });
              if (defaultPlan) {
                await tx.subscription.create({
                  data: {
                    userId: existingUser.id,
                    planId: defaultPlan.id,
                    status: "PENDING",
                  },
                });
              }
            }
          });

          // b. Supabase: set the password they just chose (admin client, since
          //    we're not authenticated as this user). User.id === Supabase
          //    auth id (the webhook creates the Prisma row with id=authId).
          const admin = createAdminClient();
          const { error: pwError } = await admin.auth.admin.updateUserById(
            existingUser.id,
            { password }
          );
          if (pwError) {
            console.error(
              "[REGISTER_PRODUCER] Failed to set password for upgraded user:",
              pwError.message
            );
            // Non-fatal: role is already PRODUCER. The user can use
            // "esqueci minha senha" to set a password and log in.
          }

          // c. Welcome email (fire-and-forget, same as the new-account path).
          const template = welcomeProducer(existingUser.name || name);
          sendEmail({
            to: { email, name: existingUser.name || name },
            ...template,
          }).catch((err) =>
            console.error(
              "[EMAIL_ERROR] welcomeProducer (upgrade) to:",
              email,
              err?.message || err
            )
          );

          return NextResponse.json(
            {
              user: {
                id: existingUser.id,
                email,
                name: existingUser.name || name,
              },
              upgraded: true,
            },
            { status: 200 }
          );
        } catch (upgradeError) {
          console.error("[REGISTER_PRODUCER] Upgrade failed:", upgradeError);
          return NextResponse.json(
            {
              error:
                "Erro ao converter conta. Tente novamente ou contate o suporte.",
            },
            { status: 500 }
          );
        }
      }
      return NextResponse.json(
        { error: "Não foi possível criar a conta. Tente novamente." },
        { status: 400 }
      );
    }

    if (data.user) {
      await prisma.user.create({
        data: {
          id: data.user.id,
          email: email.trim().toLowerCase(),
          name,
          role: "PRODUCER",
          phone: phone || null,
          businessType: businessType || null,
          niche: niche || null,
          monthlyRevenue: monthlyRevenue || null,
          referralSource: referralSource || null,
          document: document ? encrypt(document) : null,
        },
      });

      const defaultPlan = await prisma.plan.findFirst({
        where: { active: true },
        orderBy: { price: "asc" },
      });
      if (defaultPlan) {
        await prisma.subscription.create({
          data: {
            userId: data.user.id,
            planId: defaultPlan.id,
            status: "PENDING",
          },
        });
      }

      const template = welcomeProducer(name);
      sendEmail({ to: { email, name }, ...template }).catch((err) => console.error("[EMAIL_ERROR] welcomeProducer to:", email, err?.message || err));
    }

    return NextResponse.json(
      { message: "Conta de produtor criada", user: data.user },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/auth/register-producer error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
