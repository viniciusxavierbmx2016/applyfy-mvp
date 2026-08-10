// Esqueleto de rota da comunidade.
//
// ⚠️ As BARRAS usam `dark:bg-gray-800/60`, e não o `dark:bg-gray-800` puro. No
// `.course-customized` o puro é remapeado para `--member-card` (globals.css:341)
// — a mesma variável dos cartões que as envolvem (`dark:bg-gray-900`, :335). As
// barras ficavam da cor exata do cartão e o esqueleto SUMIA no tema escuro
// customizado. A variante com alpha não está no ruleset e sobrevive.
//
// ⚠️ Os CONTAINERS (a caixa do composer e o cartão do post) seguem com as classes
// cobertas de propósito: eles DEVEM acompanhar o tema do produtor. Só as barras
// precisam contrastar com eles.
//
// É o mesmo par do irmão `course/[slug]/page.tsx:343-347` e do FeedSkeleton em
// `community/page.tsx`, que resolveram isto antes.
export default function Loading() {
  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 max-w-3xl mx-auto w-full animate-pulse">
      <div className="h-6 w-40 bg-gray-200 dark:bg-gray-800/60 rounded mb-4" />
      <div className="h-32 w-full rounded-xl bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 mb-6" />
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-4 mb-3"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-800/60" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-1/3 bg-gray-200 dark:bg-gray-800/60 rounded" />
              <div className="h-2 w-1/4 bg-gray-200 dark:bg-gray-800/60 rounded" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-3 w-full bg-gray-200 dark:bg-gray-800/60 rounded" />
            <div className="h-3 w-4/5 bg-gray-200 dark:bg-gray-800/60 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
