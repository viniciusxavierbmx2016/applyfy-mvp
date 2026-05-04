"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useUserStore } from "@/stores/user-store";
import { useConfirm } from "@/hooks/use-confirm";
import { HelpTooltip } from "@/components/help-tooltip";

interface AdminCourse {
  id: string;
  title: string;
  slug: string;
  description: string;
  thumbnail: string | null;
  isPublished: boolean;
  showInStore: boolean;
  featured: boolean;
  category: string | null;
  order: number;
  _count: { modules: number; enrollments: number };
}

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<AdminCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [reorderMode, setReorderMode] = useState(false);
  const [orderedCourses, setOrderedCourses] = useState<AdminCourse[]>([]);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [savingOrder, setSavingOrder] = useState(false);
  const { confirm, ConfirmDialog } = useConfirm();

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }
  const router = useRouter();
  const { user, collaborator } = useUserStore();
  const collabPerms = collaborator?.permissions ?? [];
  // C6: STUDENT with Collaborator row counts as collaborator.
  const isCollaborator =
    user?.role === "COLLABORATOR" ||
    (user?.role === "STUDENT" && !!collaborator);
  const hasManageLessons = !isCollaborator || collabPerms.includes("MANAGE_LESSONS");

  function courseHref(id: string) {
    if (isCollaborator && !collabPerms.includes("MANAGE_LESSONS")) {
      return `/producer/courses/${id}/comments`;
    }
    return `/producer/courses/${id}/edit`;
  }

  useEffect(() => {
    loadCourses();
  }, []);

  async function loadCourses() {
    setLoading(true);
    try {
      const res = await fetch("/api/courses?filter=all");
      if (res.ok) {
        const data = await res.json();
        setCourses(data.courses || []);
      }
    } finally {
      setLoading(false);
    }
  }

  function enterReorder() {
    setOrderedCourses([...courses]);
    setReorderMode(true);
  }

  function cancelReorder() {
    setReorderMode(false);
    setOrderedCourses([]);
    setDragIdx(null);
  }

  function handleDragOver(targetIdx: number) {
    if (dragIdx === null || dragIdx === targetIdx) return;
    setOrderedCourses((prev) => {
      const next = [...prev];
      const [item] = next.splice(dragIdx, 1);
      next.splice(targetIdx, 0, item);
      return next;
    });
    setDragIdx(targetIdx);
  }

  async function saveOrder() {
    setSavingOrder(true);
    try {
      const items = orderedCourses.map((c, i) => ({ id: c.id, order: i }));
      const res = await fetch("/api/producer/courses/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      if (res.ok) {
        setCourses(orderedCourses.map((c, i) => ({ ...c, order: i })));
        setReorderMode(false);
        showToast("Ordem salva com sucesso");
      } else {
        showToast("Erro ao salvar ordem");
      }
    } finally {
      setSavingOrder(false);
    }
  }

  async function handleDelete(id: string) {
    if (!(await confirm({ title: "Excluir curso", message: "Tem certeza que deseja excluir este curso? Essa ação é irreversível.", variant: "danger", confirmText: "Excluir" }))) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/courses/${id}`, { method: "DELETE" });
      if (res.ok) {
        setCourses((prev) => prev.filter((c) => c.id !== id));
      } else {
        showToast("Erro ao excluir curso");
      }
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Cursos
            <HelpTooltip text="Lista de todos os cursos do seu workspace. Crie, edite e gerencie seus cursos aqui." />
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Gerencie seus cursos, módulos e aulas
          </p>
        </div>
        {hasManageLessons && (
          <div className="flex items-center gap-2">
            {reorderMode ? (
              <>
                <button
                  onClick={cancelReorder}
                  className="px-4 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveOrder}
                  disabled={savingOrder}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition"
                >
                  {savingOrder ? "Salvando..." : "Salvar ordem"}
                </button>
              </>
            ) : (
              <>
                {courses.length > 1 && (
                  <button
                    onClick={enterReorder}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg transition"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                    </svg>
                    Reordenar
                  </button>
                )}
                <div className="flex items-center gap-0">
                  <Link
                    href="/producer/courses/new"
                    data-tour="create-course-btn"
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Novo curso
                  </Link>
                  <HelpTooltip text="Crie um novo curso para o seu workspace. Defina título, descrição, módulos e aulas." />
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl overflow-hidden">
              <div className="aspect-video bg-gray-200 dark:bg-white/[0.04] animate-pulse" />
              <div className="p-4 space-y-3">
                <div className="h-4 w-3/4 bg-gray-200 dark:bg-white/[0.06] rounded animate-pulse" />
                <div className="h-3 w-full bg-gray-200 dark:bg-white/[0.06] rounded animate-pulse" />
                <div className="h-3 w-1/2 bg-gray-200 dark:bg-white/[0.06] rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : courses.length === 0 ? (
        <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-12 text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-blue-500/10 flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <p className="text-gray-500 mb-4">Nenhum curso cadastrado ainda</p>
          <Link
            href="/producer/courses/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Criar primeiro curso
          </Link>
        </div>
      ) : reorderMode ? (
        <div className="space-y-2">
          {orderedCourses.map((course, i) => (
            <div
              key={course.id}
              draggable
              onDragStart={() => setDragIdx(i)}
              onDragOver={(e) => { e.preventDefault(); handleDragOver(i); }}
              onDragEnd={() => setDragIdx(null)}
              className={`flex items-center gap-4 p-3 rounded-xl border transition ${
                dragIdx === i
                  ? "opacity-50 border-dashed border-blue-400 dark:border-blue-500"
                  : "border-gray-200 dark:border-white/[0.06] bg-white dark:bg-white/[0.03]"
              }`}
            >
              <svg className="w-5 h-5 text-gray-400 cursor-grab flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
              </svg>
              <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-100 dark:bg-white/[0.04] flex-shrink-0">
                {course.thumbnail ? (
                  <Image src={course.thumbnail} alt={course.title} fill sizes="48px" className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs">—</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{course.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {course.featured && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-500 font-medium">Destaque</span>
                  )}
                  {course.category && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-white/[0.06] text-gray-500">{course.category}</span>
                  )}
                </div>
              </div>
              <span className="text-xs text-gray-400 flex-shrink-0">#{i + 1}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((course) => (
            <div
              key={course.id}
              className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl overflow-hidden hover:border-gray-400 dark:hover:border-white/[0.1] transition"
            >
              <div className="relative aspect-video bg-gray-100 dark:bg-white/[0.04]">
                {course.thumbnail ? (
                  <Image
                    src={course.thumbnail}
                    alt={course.title}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-600">
                    Sem thumbnail
                  </div>
                )}
                <div className="absolute top-2 left-2 flex gap-1">
                  {course.isPublished ? (
                    <span className="px-2 py-1 bg-green-500/90 text-white text-xs font-medium rounded-full">
                      Publicado
                    </span>
                  ) : (
                    <span className="px-2 py-1 bg-yellow-500/90 text-white text-xs font-medium rounded-full">
                      Rascunho
                    </span>
                  )}
                  {course.featured && (
                    <span className="px-2 py-1 bg-amber-500/90 text-white text-xs font-medium rounded-full">
                      Destaque
                    </span>
                  )}
                </div>
              </div>

              <div className="p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-1">
                  {course.title}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs text-gray-500">/{course.slug}</p>
                  {course.category && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-white/[0.06] text-gray-500 dark:text-gray-400">{course.category}</span>
                  )}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mt-2">
                  {course.description}
                </p>

                <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                  <span>{course._count.modules} módulos</span>
                  <span>&middot;</span>
                  <span>{course._count.enrollments} alunos</span>
                </div>

                <div className="flex gap-2 mt-4">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                    onClick={() => router.push(courseHref(course.id))}
                  >
                    {hasManageLessons ? "Editar" : "Comentários"}
                  </Button>
                  {hasManageLessons && (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDelete(course.id)}
                      disabled={deletingId === course.id}
                    >
                      {deletingId === course.id ? "..." : "Excluir"}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium rounded-lg shadow-lg">
          {toast}
        </div>
      )}
      <ConfirmDialog />
    </div>
  );
}
