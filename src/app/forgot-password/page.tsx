"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";

function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const workspace = searchParams.get("workspace");
  const loginHref = workspace ? `/w/${workspace}/login` : "/login";
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const supabase = createClient();
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/reset-password`,
      });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      setSent(true);
    } catch {
      setError("Erro ao conectar com o servidor");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Recuperar senha
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Enviaremos um link para seu email
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 shadow-xl border border-gray-200 dark:border-gray-800">
          {sent ? (
            <div className="text-center">
              <div className="mx-auto w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
                <svg
                  className="w-7 h-7 text-green-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <p className="text-gray-900 dark:text-white font-medium mb-2">
                Enviamos um link para seu email
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Verifique também a pasta de spam
              </p>
              <Link
                href={loginHref}
                className="mt-6 inline-block text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                Voltar ao login
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
                  {error}
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="seu@email.com"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg transition"
                >
                  {loading ? "Enviando..." : "Enviar link de recuperação"}
                </button>
              </form>
              <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
                <Link
                  href={loginHref}
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Voltar ao login
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense>
      <ForgotPasswordForm />
    </Suspense>
  );
}
