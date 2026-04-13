"use client";

import { useEffect, useMemo, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

interface AdminUserEnrollment {
  id: string;
  courseId: string;
  course: { id: string; title: string; slug: string };
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: "STUDENT" | "ADMIN";
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
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
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
    const url = debounced
      ? `/api/admin/users?q=${encodeURIComponent(debounced)}`
      : "/api/admin/users";
    fetch(url)
      .then((r) => (r.ok ? r.json() : { users: [], courses: [] }))
      .then((d) => {
        if (!cancelled) {
          setUsers(d.users || []);
          setCourses(d.courses || []);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  const availableCoursesByUser = useMemo(() => {
    const map: Record<string, CourseOption[]> = {};
    for (const u of users) {
      const enrolledIds = new Set(u.enrollments.map((e) => e.courseId));
      map[u.id] = courses.filter((c) => !enrolledIds.has(c.id));
    }
    return map;
  }, [users, courses]);

  async function changeRole(userId: string, role: "STUDENT" | "ADMIN") {
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (res.ok) {
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role } : u))
      );
      showToast("Role atualizada");
    } else {
      const body = await res.json().catch(() => ({}));
      showToast(body.error || "Erro");
    }
  }

  async function addEnrollment(userId: string) {
    const courseId = enrollCourseId[userId];
    if (!courseId) return;
    const res = await fetch(`/api/admin/users/${userId}/enrollments`, {
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

  async function removeEnrollment(userId: string, courseId: string) {
    if (!confirm("Remover acesso a este curso?")) return;
    const res = await fetch(
      `/api/admin/users/${userId}/enrollments?courseId=${courseId}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? {
                ...u,
                enrollments: u.enrollments.filter(
                  (e) => e.courseId !== courseId
                ),
              }
            : u
        )
      );
      showToast("Acesso removido");
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Usuários</h1>

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
          className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg pl-9 pr-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:border-blue-500"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-8 text-center">
          <p className="text-gray-500 text-sm">Nenhum usuário encontrado.</p>
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
                        {u.enrollments.length} curso
                        {u.enrollments.length !== 1 && "s"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <select
                      value={u.role}
                      onChange={(e) =>
                        changeRole(u.id, e.target.value as "STUDENT" | "ADMIN")
                      }
                      className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="STUDENT">Aluno</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => setExpanded(isOpen ? null : u.id)}
                      className="px-3 py-1.5 text-xs font-medium text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg"
                    >
                      {isOpen ? "Fechar" : "Gerenciar acesso"}
                    </button>
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t border-gray-200 dark:border-gray-800 p-4 bg-gray-950/40">
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                      Cursos com acesso
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
                            <span className="text-sm text-gray-900 dark:text-white truncate">
                              {e.course.title}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeEnrollment(u.id, e.courseId)}
                              className="text-xs text-red-400 hover:text-red-300 flex-shrink-0"
                            >
                              Remover
                            </button>
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
                      <button
                        type="button"
                        onClick={() => addEnrollment(u.id)}
                        disabled={!enrollCourseId[u.id]}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg disabled:opacity-50"
                      >
                        Liberar
                      </button>
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
