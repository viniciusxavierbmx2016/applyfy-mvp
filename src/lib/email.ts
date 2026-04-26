import { BrevoClient } from "@getbrevo/brevo";

const DEFAULT_SENDER = {
  name: "Members Club",
  email: "noreply@mymembersclub.com.br",
};

interface SendEmailParams {
  to: { email: string; name?: string };
  subject: string;
  htmlContent: string;
  textContent?: string;
  senderName?: string;
}

export async function sendEmail({
  to,
  subject,
  htmlContent,
  textContent,
  senderName,
}: SendEmailParams) {
  if (!to?.email || !to.email.includes("@")) {
    console.error("[email] Email inválido:", to?.email);
    return { success: false, error: "Email inválido" };
  }

  if (!process.env.BREVO_API_KEY) {
    console.warn("[email] BREVO_API_KEY not set, skipping email to", to.email);
    return { success: false, error: "BREVO_API_KEY not configured" };
  }

  try {
    const client = new BrevoClient({ apiKey: process.env.BREVO_API_KEY });

    const result = await client.transactionalEmails.sendTransacEmail({
      sender: { name: senderName || DEFAULT_SENDER.name, email: DEFAULT_SENDER.email },
      to: [{ email: to.email, name: to.name || to.email }],
      subject,
      htmlContent,
      textContent,
    });

    console.log("[email] sent to", to.email, "subject:", subject);
    return {
      success: true,
      messageId: (result as Record<string, unknown>)?.messageId,
    };
  } catch (error) {
    console.error("[email] failed to send to", to.email, error);
    return { success: false, error };
  }
}
