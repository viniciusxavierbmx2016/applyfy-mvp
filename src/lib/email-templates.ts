const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://app.mymembersclub.com.br";

function baseTemplate(content: string, brandName?: string): string {
  const brand = brandName || "Members Club";
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${brand}</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0a1a;font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a1a;">
    <tr>
      <td align="center" style="padding:40px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <span style="font-size:24px;font-weight:bold;color:#ffffff;letter-spacing:-0.5px;">${brand}</span>
            </td>
          </tr>
          <!-- Card -->
          <tr>
            <td style="background-color:#1a1a2e;border-radius:16px;padding:40px 32px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:32px;">
              <p style="margin:0;font-size:13px;color:#6b7280;">
                ${brand} &bull; mymembersclub.com.br
              </p>
              <p style="margin:8px 0 0;font-size:12px;color:#4b5563;">
                Este é um email automático. Não responda a esta mensagem.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function ctaButton(text: string, url: string, color: string = "#3b82f6"): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 0;">
  <tr>
    <td style="background-color:${color};border-radius:10px;">
      <a href="${url}" target="_blank" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">
        ${text}
      </a>
    </td>
  </tr>
</table>`;
}

function heading(text: string): string {
  return `<h1 style="margin:0 0 16px;font-size:22px;font-weight:bold;color:#ffffff;line-height:1.3;">${text}</h1>`;
}

function paragraph(text: string): string {
  return `<p style="margin:0 0 14px;font-size:15px;color:#d1d5db;line-height:1.6;">${text}</p>`;
}

function divider(): string {
  return `<hr style="border:none;border-top:1px solid #2d2d44;margin:24px 0;">`;
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export function welcomeProducer(name: string) {
  const firstName = name.split(" ")[0];
  const html = baseTemplate(`
    ${heading(`Bem-vindo ao Members Club, ${firstName}!`)}
    ${paragraph("Sua conta de produtor foi criada com sucesso. Agora você pode começar a criar sua área de membros.")}
    ${divider()}
    ${paragraph("<strong style='color:#ffffff;'>Próximos passos:</strong>")}
    ${paragraph("1. Crie seu primeiro workspace (sua área de membros)")}
    ${paragraph("2. Adicione seus cursos e módulos")}
    ${paragraph("3. Configure a integração de pagamento")}
    ${paragraph("4. Convide seus alunos")}
    ${ctaButton("Acessar o painel", `${APP_URL}/producer`)}
  `);
  return {
    subject: "Bem-vindo ao Members Club!",
    htmlContent: html,
  };
}

export function welcomeStudent(
  name: string,
  workspaceName: string,
  loginUrl: string
) {
  const firstName = name.split(" ")[0];
  const html = baseTemplate(`
    ${heading(`Olá, ${firstName}!`)}
    ${paragraph(`Seu acesso à área de membros <strong style="color:#ffffff;">${workspaceName}</strong> foi liberado.`)}
    ${paragraph("Acesse a plataforma para começar a estudar seus cursos.")}
    ${ctaButton("Acessar agora", loginUrl)}
  `, workspaceName);
  return {
    subject: `Seu acesso foi liberado - ${workspaceName}`,
    htmlContent: html,
  };
}

export function studentAccessGranted(
  name: string,
  courseName: string,
  workspaceName: string,
  loginUrl: string,
  tempPassword?: string
) {
  const firstName = name.split(" ")[0];
  const credentialsBlock = tempPassword
    ? `${divider()}
       ${paragraph("<strong style='color:#ffffff;'>Suas credenciais de acesso:</strong>")}
       <table role="presentation" cellpadding="0" cellspacing="0" style="background-color:#0f0f23;border-radius:8px;padding:16px;width:100%;margin-bottom:14px;">
         <tr><td style="padding:12px 16px;">
           <p style="margin:0 0 8px;font-size:13px;color:#9ca3af;">Senha temporária:</p>
           <p style="margin:0;font-size:18px;font-weight:bold;color:#ffffff;font-family:monospace;letter-spacing:2px;">${tempPassword}</p>
           <p style="margin:8px 0 0;font-size:12px;color:#6b7280;">Recomendamos alterar sua senha após o primeiro login.</p>
         </td></tr>
       </table>`
    : "";

  const html = baseTemplate(`
    ${heading(`Acesso liberado: ${courseName}`)}
    ${paragraph(`Olá, ${firstName}! Seu acesso ao curso <strong style="color:#ffffff;">${courseName}</strong> na área <strong style="color:#ffffff;">${workspaceName}</strong> foi liberado.`)}
    ${credentialsBlock}
    ${ctaButton("Acessar o curso", loginUrl)}
  `, workspaceName);
  return {
    subject: `Acesso liberado: ${courseName}`,
    htmlContent: html,
  };
}

export function passwordReset(name: string, resetUrl: string) {
  const firstName = name.split(" ")[0];
  const html = baseTemplate(`
    ${heading("Redefinir sua senha")}
    ${paragraph(`Olá, ${firstName}. Recebemos uma solicitação para redefinir a senha da sua conta.`)}
    ${paragraph("Clique no botão abaixo para criar uma nova senha. Este link expira em 1 hora.")}
    ${ctaButton("Redefinir senha", resetUrl)}
    ${divider()}
    ${paragraph("<span style='font-size:13px;color:#6b7280;'>Se você não solicitou esta alteração, ignore este email. Sua senha permanecerá a mesma.</span>")}
  `);
  return {
    subject: "Redefinir sua senha - Members Club",
    htmlContent: html,
  };
}

export function collaboratorInvite(
  name: string,
  workspaceName: string,
  inviteUrl: string,
  permissions: string[]
) {
  const permLabels: Record<string, string> = {
    MANAGE_COURSES: "Gerenciar cursos",
    MANAGE_STUDENTS: "Gerenciar alunos",
    MANAGE_COMMUNITY: "Gerenciar comunidade",
    VIEW_ANALYTICS: "Ver relatórios",
  };
  const permList = permissions
    .map((p) => `<li style="margin:0 0 6px;font-size:14px;color:#d1d5db;">${permLabels[p] || p}</li>`)
    .join("");

  const html = baseTemplate(`
    ${heading(`Convite para colaborar`)}
    ${paragraph(`Olá, ${name}! Você foi convidado para colaborar na área de membros <strong style="color:#ffffff;">${workspaceName}</strong>.`)}
    ${divider()}
    ${paragraph("<strong style='color:#ffffff;'>Suas permissões:</strong>")}
    <ul style="margin:0 0 14px;padding-left:20px;">${permList}</ul>
    ${ctaButton("Aceitar convite", inviteUrl, "#10b981")}
  `, workspaceName);
  return {
    subject: `Convite para colaborar - ${workspaceName}`,
    htmlContent: html,
  };
}

export function ticketReplyToProducer(
  producerName: string,
  ticketSubject: string,
  ticketUrl: string
) {
  const html = baseTemplate(`
    ${heading("Você tem uma resposta no suporte")}
    ${paragraph(`Olá, ${producerName}! O time de suporte respondeu seu ticket <strong style="color:#ffffff;">${ticketSubject}</strong>.`)}
    ${ctaButton("Ver resposta", ticketUrl, "#3b82f6")}
    ${paragraph("Ou abra o chat de suporte direto na plataforma pelo ícone no canto inferior direito.")}
  `);
  return {
    subject: `Resposta do suporte: ${ticketSubject}`,
    htmlContent: html,
  };
}

export function adminCollaboratorInvite(
  name: string,
  inviterName: string,
  inviteUrl: string,
  permissions: string[]
) {
  const permLabels: Record<string, string> = {
    SUPPORT: "Suporte",
    MANAGE_PRODUCERS: "Gerenciar produtores",
    MANAGE_PLANS: "Gerenciar planos",
    MANAGE_BILLING: "Gerenciar assinaturas",
    VIEW_REPORTS: "Ver relatórios",
    VIEW_AUDIT: "Ver logs de auditoria",
    FULL_ACCESS: "Acesso total",
  };
  const permList = permissions
    .map((p) => `<li style="margin:0 0 6px;font-size:14px;color:#d1d5db;">${permLabels[p] || p}</li>`)
    .join("");

  const html = baseTemplate(`
    ${heading(`Convite para colaborar no Members Club`)}
    ${paragraph(`Olá, ${name}! ${inviterName} convidou você para ajudar na administração da plataforma Members Club.`)}
    ${divider()}
    ${paragraph("<strong style='color:#ffffff;'>Suas permissões:</strong>")}
    <ul style="margin:0 0 14px;padding-left:20px;">${permList}</ul>
    ${ctaButton("Aceitar convite", inviteUrl, "#3b82f6")}
  `);
  return {
    subject: "Convite de administrador - Members Club",
    htmlContent: html,
  };
}

export function subscriptionActivated(
  name: string,
  planName: string,
  amount: string,
  nextBillingDate?: string
) {
  const firstName = name.split(" ")[0];
  const nextLabel = nextBillingDate || "em 30 dias";
  const html = baseTemplate(`
    ${heading("Assinatura ativada!")}
    ${paragraph(`Olá, ${firstName}! Sua assinatura do plano <strong style="color:#ffffff;">${planName}</strong> foi ativada com sucesso.`)}
    <table role="presentation" cellpadding="0" cellspacing="0" style="background-color:#0f0f23;border-radius:8px;width:100%;margin-bottom:14px;">
      <tr><td style="padding:16px;">
        <p style="margin:0 0 4px;font-size:13px;color:#9ca3af;">Plano</p>
        <p style="margin:0 0 12px;font-size:16px;font-weight:bold;color:#ffffff;">${planName}</p>
        <p style="margin:0 0 4px;font-size:13px;color:#9ca3af;">Valor</p>
        <p style="margin:0 0 12px;font-size:16px;font-weight:bold;color:#10b981;">${amount}/mês</p>
        <p style="margin:0 0 4px;font-size:13px;color:#9ca3af;">Próxima cobrança</p>
        <p style="margin:0;font-size:16px;font-weight:bold;color:#ffffff;">${nextLabel}</p>
      </td></tr>
    </table>
    ${paragraph("Agora você tem acesso completo a todos os recursos da plataforma. Crie seus cursos, adicione alunos e comece a faturar!")}
    ${ctaButton("Acessar o painel", `${APP_URL}/producer`)}
  `);
  return {
    subject: "Assinatura ativada - Members Club",
    htmlContent: html,
  };
}

export function subscriptionRenewed(
  name: string,
  planName: string,
  amount: string,
  nextBillingDate: string
) {
  const firstName = name.split(" ")[0];
  const html = baseTemplate(`
    ${heading("Assinatura renovada!")}
    ${paragraph(`Olá, ${firstName}! Sua assinatura do plano <strong style="color:#ffffff;">${planName}</strong> foi renovada com sucesso.`)}
    <table role="presentation" cellpadding="0" cellspacing="0" style="background-color:#0f0f23;border-radius:8px;width:100%;margin-bottom:14px;">
      <tr><td style="padding:16px;">
        <p style="margin:0 0 4px;font-size:13px;color:#9ca3af;">Plano</p>
        <p style="margin:0 0 12px;font-size:16px;font-weight:bold;color:#ffffff;">${planName}</p>
        <p style="margin:0 0 4px;font-size:13px;color:#9ca3af;">Valor pago</p>
        <p style="margin:0 0 12px;font-size:16px;font-weight:bold;color:#10b981;">${amount}</p>
        <p style="margin:0 0 4px;font-size:13px;color:#9ca3af;">Próxima renovação</p>
        <p style="margin:0;font-size:16px;font-weight:bold;color:#ffffff;">${nextBillingDate}</p>
      </td></tr>
    </table>
    ${paragraph("Obrigado por continuar com a gente! Seu acesso permanece ativo.")}
    ${ctaButton("Acessar o painel", `${APP_URL}/producer`)}
  `);
  return {
    subject: "Assinatura renovada - Members Club",
    htmlContent: html,
  };
}

export function subscriptionExpiring(name: string, daysLeft: number) {
  const firstName = name.split(" ")[0];
  const overdue = daysLeft < 0;
  const absDays = Math.abs(daysLeft);
  const headingText = overdue
    ? `Pagamento atrasado há ${absDays} dia${absDays > 1 ? "s" : ""}`
    : daysLeft === 0
      ? "Sua assinatura vence hoje"
      : `Sua assinatura vence em ${daysLeft} dia${daysLeft > 1 ? "s" : ""}`;
  const bodyText = overdue
    ? `Olá, ${firstName}. Sua assinatura do Members Club está com pagamento em atraso. Regularize para evitar a suspensão da sua área de membros.`
    : `Olá, ${firstName}. Sua assinatura do Members Club está próxima do vencimento. Regularize seu pagamento para continuar com acesso completo.`;
  const subjectText = overdue
    ? `Pagamento atrasado - Members Club`
    : daysLeft === 0
      ? "Sua assinatura vence hoje"
      : `Sua assinatura vence em ${daysLeft} dias`;
  const html = baseTemplate(`
    ${heading(headingText)}
    ${paragraph(bodyText)}
    ${ctaButton("Regularizar agora", `${APP_URL}/producer/settings/billing`, overdue ? "#ef4444" : "#f59e0b")}
  `);
  return {
    subject: subjectText,
    htmlContent: html,
  };
}

export function subscriptionSuspended(name: string) {
  const firstName = name.split(" ")[0];
  const html = baseTemplate(`
    ${heading("Sua conta foi suspensa")}
    ${paragraph(`Olá, ${firstName}. Sua conta no Members Club foi suspensa por falta de pagamento.`)}
    ${paragraph("<strong style='color:#ef4444;'>Seus alunos não conseguem acessar os cursos enquanto a conta estiver suspensa.</strong>")}
    ${paragraph("Regularize seu pagamento para reativar imediatamente o acesso.")}
    ${ctaButton("Regularizar agora", `${APP_URL}/producer/settings/billing`, "#ef4444")}
  `);
  return {
    subject: "Sua conta foi suspensa - Members Club",
    htmlContent: html,
  };
}

function sanitizeHtmlForEmail(html: string): string {
  return html
    .replace(/<p>/g, '<p style="margin:0 0 8px 0;font-size:15px;color:#d1d5db;line-height:1.6;">')
    .replace(/<h2>/g, '<h2 style="font-size:20px;font-weight:bold;color:#ffffff;margin:0 0 8px 0;">')
    .replace(/<h3>/g, '<h3 style="font-size:16px;font-weight:bold;color:#ffffff;margin:0 0 8px 0;">')
    .replace(/<a /g, '<a style="color:#3b82f6;text-decoration:underline;" ')
    .replace(/<ul>/g, '<ul style="margin:0 0 8px 0;padding-left:20px;color:#d1d5db;">')
    .replace(/<ol>/g, '<ol style="margin:0 0 8px 0;padding-left:20px;color:#d1d5db;">')
    .replace(/<li>/g, '<li style="margin:0 0 4px 0;font-size:15px;line-height:1.6;">');
}

export function automationEmail(name: string, subjectText: string, body: string, workspaceName?: string) {
  const firstName = name.split(" ")[0] || "Aluno";
  const isHtml = /<[a-z][\s\S]*>/i.test(body);
  const bodyHtml = isHtml ? sanitizeHtmlForEmail(body) : body.replace(/\n/g, "<br>");
  const bodyBlock = isHtml
    ? `<div style="font-size:15px;color:#d1d5db;line-height:1.6;">${bodyHtml}</div>`
    : paragraph(bodyHtml);
  const html = baseTemplate(`
    ${heading(subjectText)}
    ${paragraph(`Olá, ${firstName}!`)}
    ${bodyBlock}
  `, workspaceName);
  return {
    subject: subjectText,
    htmlContent: html,
  };
}
