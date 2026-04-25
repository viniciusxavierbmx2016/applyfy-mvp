"use client";

import { useEffect, useMemo, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ImportStudentsModal } from "@/components/import-students-modal";
import { useConfirm } from "@/hooks/use-confirm";
import { CustomSelect } from "@/components/custom-select";

type EnrollmentStatus = "ACTIVE" | "EXPIRED" | "CANCELLED";

interface AdminUserEnrollment {
  id: string;
  courseId: string;
  status: EnrollmentStatus;
  course: { id: string; title: string; slug: string };
}

type Role = "STUDENT" | "PRODUCER" | "ADMIN";

interface TagInfo {
  id: string;
  name: string;
  color: string;
}

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
  tags?: TagInfo[];
}

interface CourseOption {
  id: string;
  title: string;
  slug: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [allTags, setAllTags] = useState<TagInfo[]>([]);
  const [viewerRole, setViewerRole] = useState<Role | null>(null);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [courseFilter, setCourseFilter] = useState<string>("");
  const [tagFilter, setTagFilter] = useState<string>("");
  const [exporting, setExporting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [enrollCourseId, setEnrollCourseId] = useState<Record<string, string>>(
    {}
  );
  const [selectedTagId, setSelectedTagId] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const { confirm, ConfirmDialog } = useConfirm();

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
    if (tagFilter) params.set("tagId", tagFilter);
    const qs = params.toString();
    const url = qs
      ? `/api/producer/students?${qs}`
      : "/api/producer/students";
    fetch(url)
      .then((r) => (r.ok ? r.json() : { users: [], courses: [], tags: [] }))
      .then((d) => {
        if (!cancelled) {
          setUsers(d.users || []);
          setCourses(d.courses || []);
          setAllTags(d.tags || []);
          setViewerRole(d.viewerRole || null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debounced, courseFilter, tagFilter]);

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
    if (!(await confirm({ title: "Remover acesso", message: "Remover acesso a este curso?", variant: "danger", confirmText: "Remover" }))) return;
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            {viewerRole === "PRODUCER" ? "Meus Alunos" : "Usuários"}
          </h1>
          <p className="text-sm text-gray-500 mt-1">Gerencie todos os alunos do workspace</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setImportOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M16 8l-4-4-4 4M12 4v12" />
            </svg>
            <span>Importar CSV</span>
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={exporting || loading}
            className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 text-sm font-medium rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-gray-900/50 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white transition disabled:opacity-60 disabled:cursor-not-allowed"
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
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
        <div className="relative flex-1">
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
            className="w-full bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-white/10 rounded-lg pl-9 pr-9 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-blue-500/50 transition-colors"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Limpar busca"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        {courses.length > 0 && (
          <CustomSelect
            value={courseFilter}
            onChange={setCourseFilter}
            className="sm:w-[180px]"
            options={[
              { value: "", label: "Todos os cursos" },
              ...courses.map((c) => ({ value: c.id, label: c.title })),
            ]}
          />
        )}
        {allTags.length > 0 && (
          <CustomSelect
            value={tagFilter}
            onChange={setTagFilter}
            className="sm:w-[150px]"
            options={[
              { value: "", label: "Todas as tags" },
              ...allTags.map((t) => ({ value: t.id, label: t.name })),
            ]}
          />
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-xl p-10 text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-blue-500/10 flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <p className="text-gray-500 text-sm">
            {debounced
              ? `Nenhum aluno encontrado para "${debounced}"`
              : "Nenhum aluno matriculado ainda."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {users.map((u) => {
            const isOpen = expanded === u.id;
            return (
              <div
                key={u.id}
                className={`bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-xl ${isOpen ? "overflow-visible" : "overflow-hidden"}`}
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
                    {u.tags && u.tags.length > 0 && u.tags.map((t) => (
                      <span
                        key={t.id}
                        className="text-[10px] font-medium px-1.5 py-0.5 rounded-full border"
                        style={{
                          backgroundColor: `${t.color}15`,
                          color: t.color,
                          borderColor: `${t.color}40`,
                        }}
                      >
                        {t.name}
                      </span>
                    ))}
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
                  <div className="border-t border-gray-200 dark:border-white/5 p-4 bg-gray-50 dark:bg-white/[0.025]">
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
                            className="flex items-center justify-between gap-2 bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2"
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
                      <CustomSelect
                        value={enrollCourseId[u.id] || ""}
                        onChange={(v) =>
                          setEnrollCourseId((prev) => ({
                            ...prev,
                            [u.id]: v,
                          }))
                        }
                        className="flex-1"
                        options={[
                          { value: "", label: "Escolha um curso..." },
                          ...(availableCoursesByUser[u.id] || []).map((c) => ({ value: c.id, label: c.title })),
                        ]}
                      />
                      <Button
                        variant="primary"
                        size="md"
                        onClick={() => addEnrollment(u.id)}
                        disabled={!enrollCourseId[u.id]}
                      >
                        Liberar
                      </Button>
                    </div>

                    {allTags.length > 0 && (
                      <>
                        <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2 mt-4">
                          Tags
                        </p>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {(u.tags || []).map((t) => (
                            <span
                              key={t.id}
                              className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border"
                              style={{
                                backgroundColor: `${t.color}15`,
                                color: t.color,
                                borderColor: `${t.color}40`,
                              }}
                            >
                              {t.name}
                              <button
                                type="button"
                                onClick={async () => {
                                  await fetch(`/api/producer/students/${u.id}/tags?tagId=${t.id}`, { method: "DELETE" });
                                  setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, tags: (x.tags || []).filter((tt) => tt.id !== t.id) } : x));
                                }}
                                className="hover:opacity-70"
                              >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                              </button>
                            </span>
                          ))}
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <CustomSelect
                            value={selectedTagId[u.id] || ""}
                            onChange={(v) => setSelectedTagId((prev) => ({ ...prev, [u.id]: v }))}
                            className="flex-1"
                            options={[
                              { value: "", label: "Escolha uma tag..." },
                              ...allTags.filter((t) => !(u.tags || []).some((ut) => ut.id === t.id)).map((t) => ({ value: t.id, label: t.name })),
                            ]}
                          />
                          <Button
                            variant="secondary"
                            size="md"
                            disabled={!selectedTagId[u.id]}
                            onClick={async () => {
                              const tagId = selectedTagId[u.id];
                              if (!tagId) return;
                              const res = await fetch(`/api/producer/students/${u.id}/tags`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ tagId }),
                              });
                              if (res.ok) {
                                const addedTag = allTags.find((t) => t.id === tagId);
                                if (addedTag) {
                                  setUsers((prev) => prev.map((x) => x.id === u.id ? { ...x, tags: [...(x.tags || []), addedTag] } : x));
                                }
                                setSelectedTagId((prev) => ({ ...prev, [u.id]: "" }));
                                showToast("Tag adicionada");
                              }
                            }}
                          >
                            Adicionar
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <ImportStudentsModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        courses={courses}
      />

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 bg-blue-600 text-white rounded-lg shadow-xl text-sm font-medium">
          {toast}
        </div>
      )}
      <ConfirmDialog />
    </div>
  );
}
