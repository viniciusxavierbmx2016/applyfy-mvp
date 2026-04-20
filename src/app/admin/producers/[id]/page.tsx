"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

interface Producer {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  createdAt: string;
}
interface WorkspaceRow {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  courseCount: number;
  studentCount: number;
}
interface CourseRow {
  id: string;
  title: string;
  thumbnail: string | null;
  workspaceId: string;
  students: number;
  ratingAverage: number;
  ratingCount: number;
  completion: number;
}
interface Subscription {
  id: string;
  status: string;
  exempt: boolean;
  plan: { id: string; name: string; price: number; currency: string };
}
interface DetailResponse {
  producer: Producer;
  workspaces: WorkspaceRow[];
  courses: CourseRow[];
  totalStudents: number;
  subscription: Subscription | null;
}

const ACTIVE_WORKSPACE_COOKIE = "active_workspace_id";

export default function ProducerDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const p = params;
  const router = useRouter();
  const [data, setData] = useState<DetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  useEffect(() => {
    fetch(`/api/admin/producers/${p.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, [p.id]);

  async function handleSuspend() {
    if (!data) return;
    if (
      !confirm(
        "Suspender este produtor? Todos os workspaces dele serão desativados."
      )
    )
      return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/producers/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "suspend" }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
      location.reload();
    } catch {
      showToast("Erro ao suspender");
    } finally {
      setBusy(false);
    }
  }

  function accessWorkspace(workspaceId: string) {
    document.cookie = `${ACTIVE_WORKSPACE_COOKIE}=${workspaceId}; path=/; max-age=${60 * 60 * 24 * 30}`;
    router.push("/admin");
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32" />
        <Skeleton className="h-40" />
      </div>
    );
  }
  if (!data) {
    return (
      <p className="text-sm text-gray-500">Produtor não encontrado.</p>
    );
  }

  const allInactive =
    data.workspaces.length > 0 && data.workspaces.every((w) => !w.isActive);

  return (
    <div className="space-y-6">
      <Link
        href="/admin/producers"
        className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
      >
        ← Voltar
      </Link>

      {/* Producer header */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          {data.producer.avatarUrl ? (
            <img
              src={data.producer.avatarUrl}
              alt={data.producer.name}
              className="w-16 h-16 rounded-full object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-blue-600 text-white flex items-center justify-center text-xl font-semibold">
              {data.producer.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              {data.producer.name}
            </h1>
            <p className="text-sm text-gray-500">{data.producer.email}</p>
            <p className="text-xs text-gray-500">
              Cadastrado em {formatDate(data.producer.createdAt)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/admin/producers/${p.id}/subscription`}
            className="inline-flex items-center justify-center text-sm font-medium rounded-lg px-4 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-700"
          >
            Gerenciar assinatura
          </Link>
          <Button
            variant="danger"
            size="md"
            onClick={handleSuspend}
            disabled={busy || allInactive}
          >
            {allInactive ? "Já suspenso" : busy ? "Suspendendo…" : "Suspender produtor"}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card label="Workspaces" value={data.workspaces.length} accent="text-blue-500 dark:text-blue-400" />
        <Card label="Cursos" value={data.courses.length} accent="text-amber-500 dark:text-amber-400" />
        <Card label="Alunos únicos" value={data.totalStudents} accent="text-emerald-500 dark:text-emerald-400" />
      </div>

      {/* Workspaces */}
      <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
          Workspaces
        </h2>
        {data.workspaces.length === 0 ? (
          <p className="text-sm text-gray-500">Sem workspaces.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-gray-200 dark:border-gray-800 text-xs uppercase tracking-wider text-gray-500">
                  <th className="py-2 pr-4 font-medium">Nome</th>
                  <th className="py-2 pr-4 font-medium">Slug</th>
                  <th className="py-2 pr-4 font-medium">Cursos</th>
                  <th className="py-2 pr-4 font-medium">Alunos</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 pr-4 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {data.workspaces.map((w) => (
                  <tr key={w.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                    <td className="py-3 pr-4 text-gray-900 dark:text-white font-medium">
                      {w.name}
                    </td>
                    <td className="py-3 pr-4 text-gray-500">{w.slug}</td>
                    <td className="py-3 pr-4 text-gray-700 dark:text-gray-300">
                      {w.courseCount}
                    </td>
                    <td className="py-3 pr-4 text-gray-700 dark:text-gray-300">
                      {w.studentCount}
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${
                          w.isActive
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                        }`}
                      >
                        {w.isActive ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-right">
                      <button
                        type="button"
                        onClick={() => accessWorkspace(w.id)}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Acessar workspace
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Courses */}
      <section className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
          Cursos
        </h2>
        {data.courses.length === 0 ? (
          <p className="text-sm text-gray-500">Sem cursos.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.courses.map((c) => (
              <div
                key={c.id}
                className="border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-950"
              >
                {c.thumbnail ? (
                  <img
                    src={c.thumbnail}
                    alt={c.title}
                    className="w-full aspect-video object-cover"
                  />
                ) : (
                  <div className="w-full aspect-video bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white text-xl font-semibold">
                    {c.title.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="p-4">
                  <p className="font-medium text-gray-900 dark:text-white line-clamp-1">
                    {c.title}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
                    <span>{c.students} alunos</span>
                    <span>★ {c.ratingCount > 0 ? c.ratingAverage : "—"}</span>
                    <span>{c.completion}% conclusão</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium rounded-lg shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

function Card({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
      <p className="text-xs font-medium uppercase tracking-wider text-gray-500">
        {label}
      </p>
      <p className={`mt-2 text-3xl font-bold ${accent}`}>{value}</p>
    </div>
  );
}

function formatDate(v: string) {
  try {
    return new Date(v).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}
