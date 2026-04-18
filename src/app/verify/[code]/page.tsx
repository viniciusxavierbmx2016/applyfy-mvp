import { prisma } from "@/lib/prisma";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Verificar Certificado · Members Club",
  description: "Confirme a autenticidade de um certificado emitido pela Members Club.",
};

interface PageProps {
  params: { code: string };
}

export default async function VerifyPage({ params }: PageProps) {
  const code = params.code.trim().toUpperCase();

  const cert = await prisma.certificate.findUnique({
    where: { code },
    include: {
      user: { select: { name: true } },
      course: { select: { title: true } },
    },
  });

  const valid = !!cert;

  return (
    <main className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white flex flex-col">
      <header className="border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-blue-500">
            Members Club
          </Link>
          <span className="text-xs text-gray-500">Verificação de certificado</span>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-xl">
          {valid && cert ? (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-8 sm:p-10">
              <div className="flex flex-col items-center text-center">
                <div className="w-14 h-14 rounded-full bg-green-500/15 flex items-center justify-center mb-4">
                  <svg
                    className="w-7 h-7 text-green-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  Certificado autêntico
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Este certificado foi emitido pela Members Club e é válido.
                </p>
              </div>

              <dl className="mt-8 space-y-4 text-sm">
                <Row label="Aluno" value={cert.user.name} />
                <Row label="Curso" value={cert.course.title} />
                <Row
                  label="Emitido em"
                  value={new Date(cert.issuedAt).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                />
                <Row label="Código" value={cert.code} mono />
              </dl>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-8 sm:p-10 text-center">
              <div className="w-14 h-14 rounded-full bg-red-500/15 flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-7 h-7 text-red-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                Certificado não encontrado
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                O código{" "}
                <span className="font-mono text-gray-700 dark:text-gray-300">{code}</span> não
                corresponde a nenhum certificado emitido.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function Row({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 border-b border-gray-200 dark:border-gray-800 pb-3 last:border-0 last:pb-0">
      <dt className="text-xs uppercase tracking-wider text-gray-500">{label}</dt>
      <dd
        className={`text-sm text-gray-900 dark:text-white sm:text-right ${
          mono ? "font-mono" : ""
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
