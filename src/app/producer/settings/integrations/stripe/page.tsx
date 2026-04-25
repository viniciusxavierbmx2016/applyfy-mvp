"use client";

import Link from "next/link";

export default function StripeIntegrationPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <Link
        href="/producer/settings/integrations"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white mb-4 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Voltar às integrações
      </Link>

      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-xl bg-[#635BFF] flex items-center justify-center flex-shrink-0">
          <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.918 3.757 7.038c0 4.072 2.484 5.857 6.334 7.29 2.484.913 3.365 1.577 3.365 2.559 0 .906-.806 1.439-2.136 1.439-1.817 0-4.746-.945-6.59-2.198l-.89 5.555c1.817 1.013 4.515 1.731 7.476 1.731 2.62 0 4.791-.654 6.334-1.928 1.636-1.365 2.463-3.327 2.463-5.66 0-4.125-2.52-5.869-6.137-7.255z" />
          </svg>
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Stripe
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Configure o Stripe para receber pagamentos e liberar cursos automaticamente.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <section className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-xl p-6">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
            Como vincular os produtos
          </h3>
          <ol className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold flex items-center justify-center">
                1
              </span>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Configure o ID externo no curso</p>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Em <strong>Cursos</strong>, edite cada curso e preencha o campo{" "}
                  <em>ID externo do produto</em> com o ID do produto (price) no Stripe.
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold flex items-center justify-center">
                2
              </span>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Adicione metadata no checkout</p>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  No Stripe, inclua <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-white/5 rounded text-xs font-mono">courseId</code> em{" "}
                  <em>metadata</em> do Checkout Session (ou use{" "}
                  <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-white/5 rounded text-xs font-mono">externalProductId</code>)
                  para roteamento automático.
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 text-xs font-bold flex items-center justify-center">
                3
              </span>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">Configure o webhook</p>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  No painel do Stripe, adicione um webhook apontando para a URL da sua plataforma
                  com os eventos <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-white/5 rounded text-xs font-mono">checkout.session.completed</code> e{" "}
                  <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-white/5 rounded text-xs font-mono">charge.refunded</code>.
                </p>
              </div>
            </li>
          </ol>
        </section>

        <section className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-xl p-5">
          <div className="flex gap-3">
            <svg className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm">
              <p className="font-medium text-amber-800 dark:text-amber-200">Dica importante</p>
              <p className="text-amber-700 dark:text-amber-300 mt-1">
                O roteamento automático depende do campo <code className="px-1 py-0.5 bg-amber-100 dark:bg-amber-900/40 rounded text-xs font-mono">externalProductId</code> no
                curso corresponder ao <code className="px-1 py-0.5 bg-amber-100 dark:bg-amber-900/40 rounded text-xs font-mono">price_id</code> ou{" "}
                <code className="px-1 py-0.5 bg-amber-100 dark:bg-amber-900/40 rounded text-xs font-mono">product_id</code> do Stripe.
                Certifique-se de que os IDs estão corretos.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
