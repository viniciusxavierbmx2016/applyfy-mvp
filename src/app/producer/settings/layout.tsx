export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white mb-1">
        Personalizar Painel
      </h1>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        Personalize as cores e o visual do seu painel de trabalho
      </p>
      {children}
    </div>
  );
}
