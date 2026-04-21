"use client";

// TODO: Stripe webhook secret é ADMIN_ONLY no backend. Se futuramente
// cada producer tiver seu próprio Stripe, migrar chave para Settings por workspace.

export default function AdminSettingsPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white mb-2">
        Configurações
      </h1>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        Configure as integrações da sua área. Tokens e segredos são armazenados
        com segurança no banco e nunca são exibidos em texto puro após salvar.
      </p>

      <div className="space-y-6">
        <section className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-6">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
            Como vincular os produtos
          </h3>
          <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-1.5 list-decimal list-inside">
            <li>
              Em <strong>Cursos</strong>, edite cada curso e preencha{" "}
              <em>ID externo do produto</em> com o ID do produto no Applyfy ou
              Stripe.
            </li>
            <li>
              No Stripe, inclua <code>courseId</code> em <em>metadata</em> do
              checkout session (ou <code>externalProductId</code>) para
              roteamento automático.
            </li>
            <li>
              No Applyfy, o roteamento usa o ID do produto contido no payload.
            </li>
          </ol>
        </section>
      </div>
    </div>
  );
}
