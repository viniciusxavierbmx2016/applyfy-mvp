"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { CourseForm } from "@/components/course-form";
import { CourseEditTabs } from "@/components/course-edit-tabs";
import type { ModuleData, SectionData } from "@/components/modules-manager";

const ModulesManager = dynamic(
  () => import("@/components/modules-manager").then((m) => m.ModulesManager),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/40 animate-pulse" />
    ),
  }
);

interface CourseData {
  id: string;
  title: string;
  slug: string;
  description: string;
  thumbnail: string | null;
  bannerUrl: string | null;
  checkoutUrl: string | null;
  price: number | null;
  priceCurrency: string | null;
  externalProductId: string | null;
  isPublished: boolean;
  showInStore: boolean;
  supportEmail: string | null;
  supportWhatsapp: string | null;
  modules: ModuleData[];
  sections: SectionData[];
}

export default function EditCoursePage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const [course, setCourse] = useState<CourseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"info" | "content">("info");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const t = new URL(window.location.href).searchParams.get("tab");
    if (t === "content") setTab("content");
  }, []);

  function selectTab(next: "info" | "content") {
    setTab(next);
    const url =
      next === "content"
        ? `/admin/courses/${params.id}/edit?tab=content`
        : `/admin/courses/${params.id}/edit`;
    router.replace(url, { scroll: false });
  }

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
        <p className="text-gray-600 dark:text-gray-400">Curso não encontrado</p>
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
          className="inline-flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Voltar
        </Link>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white truncate">
              {course.title}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              /{course.slug}
            </p>
          </div>
          <a
            href={`/course/${course.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 text-sm font-medium rounded-lg transition flex-shrink-0"
          >
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
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
            Pré-visualizar
          </a>
        </div>
      </div>

      <CourseEditTabs
        courseId={course.id}
        active={tab}
        modulesCount={course.modules.length}
        onSelectInfo={() => selectTab("info")}
        onSelectContent={() => selectTab("content")}
      />

      {tab === "info" ? (
        <CourseForm
          mode="edit"
          initial={{
            id: course.id,
            title: course.title,
            slug: course.slug,
            description: course.description,
            thumbnail: course.thumbnail,
            bannerUrl: course.bannerUrl,
            checkoutUrl: course.checkoutUrl || "",
            price: course.price != null ? String(course.price) : "",
            priceCurrency: course.priceCurrency || "BRL",
            externalProductId: course.externalProductId || "",
            isPublished: course.isPublished,
            showInStore: course.showInStore,
            supportEmail: course.supportEmail || "",
            supportWhatsapp: course.supportWhatsapp || "",
          }}
        />
      ) : (
        <ModulesManager
          courseId={course.id}
          initialModules={course.modules}
          initialSections={course.sections || []}
        />
      )}
    </div>
  );
}
