import { formatWhatsappLink, formatPhoneDisplay } from "@/lib/utils";
import type { BlockContact } from "@/lib/workspace-block";

// FASE 6B fatia 2 — a tela de área indisponível, compartilhada pela vitrine e
// pelo curso. Extraída do molde que já existia inline em w/[slug]/page.tsx:211-231
// (mesmo ícone de cadeado, mesmo layout, mesmo --producer-bg com fallback);
// o que muda é o texto e os contatos do produtor.
//
// Mode A: zero token, cor, fonte ou biblioteca de ícone nova — SVG inline como
// o resto do projeto, .dark variants, e os helpers de telefone que o player já usa.

export function WorkspaceSuspendedNotice({ contact }: { contact: BlockContact }) {
  const wa = formatWhatsappLink(contact.whatsapp);
  const hasContact = !!contact.email || !!wa;

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[var(--producer-bg,#030712)] px-4">
      <div className="text-center max-w-md">
        <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-6">
          <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Área de membros indisponível
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Entre em contato com o produtor
          {contact.name ? ` (${contact.name})` : ""}.
        </p>

        {hasContact && (
          <div className="mt-6 flex flex-col items-center gap-2">
            {contact.email && (
              <a
                href={`mailto:${contact.email}`}
                className="text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white underline underline-offset-2 hover:no-underline break-all"
              >
                {contact.email}
              </a>
            )}
            {wa && (
              <a
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white underline underline-offset-2 hover:no-underline"
              >
                {formatPhoneDisplay(contact.whatsapp)}
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
