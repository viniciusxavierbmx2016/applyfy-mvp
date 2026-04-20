import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import {
  welcomeProducer,
  welcomeStudent,
  studentAccessGranted,
  passwordReset,
  collaboratorInvite,
  subscriptionActivated,
  subscriptionExpiring,
  subscriptionSuspended,
} from "@/lib/email-templates";

const TEMPLATES: Record<string, () => { subject: string; htmlContent: string }> = {
  welcomeProducer: () => welcomeProducer("Teste Producer"),
  welcomeStudent: () => welcomeStudent("Teste Aluno", "Workspace Teste", "https://example.com/login"),
  studentAccessGranted: () => studentAccessGranted("Teste Aluno", "Curso Teste", "Workspace Teste", "https://example.com/login", "temp1234"),
  passwordReset: () => passwordReset("Teste User", "https://example.com/reset"),
  collaboratorInvite: () => collaboratorInvite("Teste Collab", "Workspace Teste", "https://example.com/invite", ["MANAGE_COURSES", "MANAGE_STUDENTS"]),
  subscriptionActivated: () => subscriptionActivated("Teste Producer", "Pro", "R$ 97,00/mês"),
  subscriptionExpiring: () => subscriptionExpiring("Teste Producer", 7),
  subscriptionSuspended: () => subscriptionSuspended("Teste Producer"),
};

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const { to, template } = await request.json();

    if (!to || !template) {
      return NextResponse.json({ error: "to e template obrigatórios" }, { status: 400 });
    }

    const buildTemplate = TEMPLATES[template];
    if (!buildTemplate) {
      return NextResponse.json({
        error: `Template não encontrado. Disponíveis: ${Object.keys(TEMPLATES).join(", ")}`,
      }, { status: 400 });
    }

    const { subject, htmlContent } = buildTemplate();
    const result = await sendEmail({ to: { email: to }, subject, htmlContent });

    if (result.success) {
      return NextResponse.json({ success: true, messageId: result.messageId });
    }
    return NextResponse.json({ error: "Falha ao enviar", detail: String(result.error) }, { status: 500 });
  } catch (error) {
    console.error("POST /api/admin/test-email error:", error);
    const msg = error instanceof Error ? error.message : "";
    const status = msg === "Não autorizado" ? 401 : msg === "Sem permissão" ? 403 : 500;
    return NextResponse.json({ error: msg || "Erro interno" }, { status });
  }
}
