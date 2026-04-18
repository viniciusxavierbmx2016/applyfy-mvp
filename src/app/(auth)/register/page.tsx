import Link from "next/link";

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Members Club
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Cadastro indisponível por aqui
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-xl border border-gray-200 dark:border-gray-800 text-center space-y-4">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Para criar conta de produtor, acesse a página dedicada.
          </p>
          <Link
            href="/producer/register"
            className="inline-flex items-center justify-center w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition"
          >
            Criar conta de produtor
          </Link>
          <p className="text-xs text-gray-500">
            Contas de admin são criadas apenas via script. Alunos acessam pelo
            link fornecido pelo produtor.
          </p>
          <Link
            href="/login"
            className="inline-block text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Voltar ao login
          </Link>
        </div>
      </div>
    </div>
  );
}
