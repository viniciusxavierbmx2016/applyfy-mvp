"use client";

import { useEffect, useMemo, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type EnrollmentStatus = "ACTIVE" | "EXPIRED" | "CANCELLED";

interface AdminUserEnrollment {
  id: string;
  courseId: string;
  status: EnrollmentStatus;
  course: { id: string; title: string; slug: string };
}

type Role = "STUDENT" | "PRODUCER" | "ADMIN";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: Role;
  points: number;
  level: number;
  createdAt: string;
  enrollments: AdminUserEnrollment[];
}

interface CourseOption {
  id: string;
  title: string;
  slug: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [viewerRole, setViewerRole] = useState<Role | null>(null);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [courseFilter, setCourseFilter] = useState<string>("");
  const [exporting, setExporting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [enrollCourseId, setEnrollCourseId] = useState<Record<string, string>>(
    {}
  );
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams();
    if (debounced) params.set("q", debounced);
    if (courseFilter) params.set("courseId", courseFilter);
    const qs = params.toString();
    const url = qs
      ? `/api/producer/students?${qs}`
      : "/api/producer/students";
    fetch(url)
      .then((r) => (r.ok ? r.json() : { users: [], courses: [] }))
      .then((d) => {
        if (!cancelled) {
          setUsers(d.users || []);
          setCourses(d.courses || []);
          setViewerRole(d.viewerRole || null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debounced, courseFilter]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  const availableCoursesByUser = useMemo(() => {
    const map: Record<string, CourseOption[]> = {};
    for (const u of users) {
      const blockedIds = new Set(
        u.enrollments
          .filter((e) => e.status !== "CANCELLED")
          .map((e) => e.courseId)
      );
      map[u.id] = courses.filter((c) => !blockedIds.has(c.id));
    }
    return map;
  }, [users, courses]);

  async function addEnrollment(userId: string) {
    const courseId = enrollCourseId[userId];
    if (!courseId) return;
    const res = await fetch(`/api/producer/students/${userId}/enrollments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId }),
    });
    if (res.ok) {
      const body = await res.json();
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? {
                ...u,
                enrollments: [
                  ...u.enrollments.filter((e) => e.courseId !== courseId),
                  {
                    id: body.enrollment.id,
                    courseId,
                    status: "ACTIVE" as const,
                    course: body.enrollment.course,
                  },
                ],
              }
            : u
        )
      );
      setEnrollCourseId((prev) => ({ ...prev, [userId]: "" }));
      showToast("Acesso liberado");
    }
  }

  async function handleExportCsv() {
    if (exporting) return;
    setExporting(true);
    try {
      const params = new URLSearchParams();
      if (debounced) params.set("q", debounced);
      if (courseFilter) params.set("courseId", courseFilter);
      const qs = params.toString();
      const url = qs
        ? `/api/producer/students/export?${qs}`
        : "/api/producer/students/export";
      const res = await fetch(url);
      if (!res.ok) throw new Error("fail");
      const disposition = res.headers.get("Content-Disposition") || "";
      const match = /filename="([^"]+)"/.exec(disposition);
      const filename = match?.[1] || "alunos.csv";
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
      showToast("CSV exportado");
    } catch {
      showToast("Erro ao exportar CSV");
    } finally {
      setExporting(false);
    }
  }

  async function removeEnrollment(userId: string, courseId: string) {
    if (!confirm("Remover acesso a este curso?")) return;
    try {
      const res = await fetch(
        `/api/producer/students/${userId}/enrollments?courseId=${courseId}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === userId
              ? {
                  ...u,
                  enrollments: u.enrollments.map((e) =>
                    e.courseId === courseId
                      ? { ...e, status: "CANCELLED" as const }
                      : e
                  ),
                }
              : u
          )
        );
        showToast("Acesso removido");
      } else {
        const data = await res.json().catch(() => ({}));
        console.error(
          "removeEnrollment failed:",
          `/api/producer/students/${userId}/enrollments?courseId=${courseId}`,
          res.status,
          data
        );
        showToast("Erro: " + (data.error || `Status ${res.status}`));
      }
    } catch (err) {
      console.error("removeEnrollment network error:", err);
      showToast("Erro de rede ao remover acesso");
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white mb-4">
        {viewerRole === "PRODUCER" ? "Meus Alunos" : "Usuários"}
      </h1>

      <div className="mb-3 flex flex-col sm:flex-row sm:items-end gap-2">
        {courses.length > 0 && (
          <div className="flex-1 sm:max-w-sm">
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
              Curso
            </label>
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
            >
              <option value="">Todos os cursos</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
        )}
        <button
          type="button"
          onClick={handleExportCsv}
          disabled={exporting || loading}
          className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {exporting ? (
            <svg
              className="w-4 h-4 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="3"
                className="opacity-25"
              />
              <path
                d="M4 12a8 8 0 018-8"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3"
              />
            </svg>
          )}
          <span>{exporting ? "Exportando..." : "Exportar CSV"}</span>
        </button>
      </div>

      <div className="relative mb-6">
        <svg
          className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por nome ou email..."
          className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg pl-9 pr-9 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-blue-500"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Limpar busca"
            className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-8 text-center">
          <p className="text-gray-500 text-sm">
            {debounced
              ? `Nenhum aluno encontrado para "${debounced}"`
              : "Nenhum usuário encontrado."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {users.map((u) => {
            const isOpen = expanded === u.id;
            return (
              <div
                key={u.id}
                className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar src={u.avatarUrl} name={u.name} size="md" />
                    <div className="min-w-0">
                      <p className="text-gray-900 dark:text-white font-medium text-sm truncate">
                        {u.name}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {u.email}
                      </p>
                      <p className="text-xs text-gray-600 mt-0.5">
                        Nv {u.level} · {u.points} pts ·{" "}
                        {(() => {
                          const active = u.enrollments.filter(
                            (e) => e.status !== "CANCELLED"
                          ).length;
                          return `${active} curso${active !== 1 ? "s" : ""}`;
                        })()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={cn(
                        "text-[11px] font-medium px-2 py-0.5 rounded-full border",
                        u.role === "ADMIN"
                          ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30"
                          : u.role === "PRODUCER"
                          ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30"
                          : "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-400/30"
                      )}
                    >
                      {u.role === "ADMIN"
                        ? "Admin"
                        : u.role === "PRODUCER"
                        ? "Produtor"
                        : "Aluno"}
                    </span>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setExpanded(isOpen ? null : u.id)}
                    >
                      {isOpen ? "Fechar" : "Gerenciar acesso"}
                    </Button>
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t border-gray-200 dark:border-gray-800 p-4 bg-gray-950/40">
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                      Cursos
                    </p>
                    {u.enrollments.length === 0 ? (
                      <p className="text-xs text-gray-500 mb-4">
                        Nenhum curso liberado.
                      </p>
                    ) : (
                      <ul className="space-y-1.5 mb-4">
                        {u.enrollments.map((e) => (
                          <li
                            key={e.id}
                            className="flex items-center justify-between gap-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2"
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <span
                                className={cn(
                                  "text-sm truncate",
                                  e.status === "CANCELLED"
                                    ? "text-gray-400 dark:text-gray-500 line-through"
                                    : "text-gray-900 dark:text-white"
                                )}
                              >
                                {e.course.title}
                              </span>
                              <span
                                className={cn(
                                  "text-[10px] font-medium px-1.5 py-0.5 rounded-full border flex-shrink-0",
                                  e.status === "ACTIVE"
                                    ? "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30"
                                    : e.status === "EXPIRED"
                                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                                    : "bg-gray-500/10 text-gray-500 dark:text-gray-400 border-gray-400/30"
                                )}
                              >
                                {e.status === "ACTIVE"
                                  ? "Ativo"
                                  : e.status === "EXPIRED"
                                  ? "Expirado"
                                  : "Histórico"}
                              </span>
                            </div>
                            {e.status !== "CANCELLED" && (
                              <button
                                type="button"
                                onClick={() => removeEnrollment(u.id, e.courseId)}
                                className="text-xs text-red-400 hover:text-red-300 flex-shrink-0"
                              >
                                Remover
                              </button>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}

                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                      Liberar acesso manual
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <select
                        value={enrollCourseId[u.id] || ""}
                        onChange={(e) =>
                          setEnrollCourseId((prev) => ({
                            ...prev,
                            [u.id]: e.target.value,
                          }))
                        }
                        className="flex-1 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                      >
                        <option value="">Escolha um curso...</option>
                        {(availableCoursesByUser[u.id] || []).map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.title}
                          </option>
                        ))}
                      </select>
                      <Button
                        variant="primary"
                        size="md"
                        onClick={() => addEnrollment(u.id)}
                        disabled={!enrollCourseId[u.id]}
                      >
                        Liberar
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 bg-blue-600 text-white rounded-lg shadow-xl text-sm font-medium">
          {toast}
        </div>
      )}
    </div>
  );
}
