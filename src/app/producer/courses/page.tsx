"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface AdminCourse {
  id: string;
  title: string;
  slug: string;
  description: string;
  thumbnail: string | null;
  isPublished: boolean;
  showInStore: boolean;
  _count: { modules: number; enrollments: number };
}

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<AdminCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();

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

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja excluir este curso? Essa ação é irreversível.")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/courses/${id}`, { method: "DELETE" });
      if (res.ok) {
        setCourses((prev) => prev.filter((c) => c.id !== id));
      } else {
        alert("Erro ao excluir curso");
      }
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Cursos</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Gerencie seus cursos, módulos e aulas
          </p>
        </div>
        <Link
          href="/producer/courses/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Novo curso
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : courses.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-12 text-center">
          <p className="text-gray-500 mb-4">Nenhum curso cadastrado ainda</p>
          <Link
            href="/producer/courses/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
          >
            Criar primeiro curso
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((course) => (
            <div
              key={course.id}
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden hover:border-gray-400 dark:hover:border-gray-700 transition"
            >
              <div className="relative aspect-video bg-gray-100 dark:bg-gray-800">
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
                </div>
              </div>

              <div className="p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-1">
                  {course.title}
                </h3>
                <p className="text-xs text-gray-500 mt-1">/{course.slug}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mt-2">
                  {course.description}
                </p>

                <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                  <span>{course._count.modules} módulos</span>
                  <span>•</span>
                  <span>{course._count.enrollments} alunos</span>
                </div>

                <div className="flex gap-2 mt-4">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                    onClick={() => router.push(`/producer/courses/${course.id}/edit`)}
                  >
                    Editar
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDelete(course.id)}
                    disabled={deletingId === course.id}
                  >
                    {deletingId === course.id ? "..." : "Excluir"}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
