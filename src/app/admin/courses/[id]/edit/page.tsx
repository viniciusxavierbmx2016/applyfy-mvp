"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CourseForm } from "@/components/course-form";
import { ModulesManager, type ModuleData } from "@/components/modules-manager";

interface CourseData {
  id: string;
  title: string;
  slug: string;
  description: string;
  thumbnail: string | null;
  checkoutUrl: string | null;
  externalProductId: string | null;
  isPublished: boolean;
  showInStore: boolean;
  modules: ModuleData[];
}

export default function EditCoursePage({
  params,
}: {
  params: { id: string };
}) {
  const [course, setCourse] = useState<CourseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"info" | "content">("info");

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/courses/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setCourse(data.course);
      }
      setLoading(false);
    }
    load();
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-400">Curso não encontrado</p>
        <Link
          href="/admin/courses"
          className="inline-block mt-4 text-blue-400 hover:text-blue-300"
        >
          Voltar para cursos
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Link
          href="/admin/courses"
          className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white mb-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Voltar
        </Link>
        <h1 className="text-2xl font-bold text-white">{course.title}</h1>
        <p className="text-sm text-gray-400 mt-1">/{course.slug}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-800">
        <button
          onClick={() => setTab("info")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${
            tab === "info"
              ? "border-blue-500 text-white"
              : "border-transparent text-gray-400 hover:text-white"
          }`}
        >
          Informações
        </button>
        <button
          onClick={() => setTab("content")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition ${
            tab === "content"
              ? "border-blue-500 text-white"
              : "border-transparent text-gray-400 hover:text-white"
          }`}
        >
          Conteúdo ({course.modules.length} módulos)
        </button>
      </div>

      {tab === "info" ? (
        <CourseForm
          mode="edit"
          initial={{
            id: course.id,
            title: course.title,
            slug: course.slug,
            description: course.description,
            thumbnail: course.thumbnail,
            checkoutUrl: course.checkoutUrl || "",
            externalProductId: course.externalProductId || "",
            isPublished: course.isPublished,
            showInStore: course.showInStore,
          }}
        />
      ) : (
        <ModulesManager
          courseId={course.id}
          initialModules={course.modules}
        />
      )}
    </div>
  );
}
