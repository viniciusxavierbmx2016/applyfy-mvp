"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

export interface SidebarLesson {
  id: string;
  title: string;
  completed: boolean;
  locked?: boolean;
  releaseDate?: string | null;
  daysRemaining?: number;
}

export interface SidebarModule {
  id: string;
  title: string;
  thumbnailUrl?: string | null;
  lessons: SidebarLesson[];
  locked?: boolean;
  releaseDate?: string | null;
  daysRemaining?: number;
}

function formatReleaseDate(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

interface Props {
  courseSlug: string;
  courseTitle: string;
  modules: SidebarModule[];
  currentLessonId: string;
}

function moduleProgress(mod: SidebarModule): number {
  if (mod.lessons.length === 0) return 0;
  const done = mod.lessons.filter((l) => l.completed).length;
  return Math.round((done / mod.lessons.length) * 100);
}

function LessonLink({
  courseSlug,
  lesson,
  isCurrent,
}: {
  courseSlug: string;
  lesson: SidebarLesson;
  isCurrent: boolean;
}) {
  if (lesson.locked) {
    return (
      <div
        className="flex items-start gap-3 px-3 py-2 rounded-lg text-sm border border-transparent text-gray-400 dark:text-gray-500 opacity-70 cursor-not-allowed"
        title={`Disponível em ${formatReleaseDate(lesson.releaseDate)}`}
      >
        <div className="pt-0.5 flex-shrink-0">
          <svg
            className="w-4 h-4 text-gray-400 dark:text-gray-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="line-clamp-2">{lesson.title}</p>
          <p className="text-[10px] mt-0.5">
            Disponível em {formatReleaseDate(lesson.releaseDate)}
          </p>
        </div>
      </div>
    );
  }
  return (
    <Link
      href={`/course/${courseSlug}/lesson/${lesson.id}`}
      className={`flex items-start gap-3 px-3 py-2 rounded-lg text-sm transition ${
        isCurrent
          ? "bg-blue-600/20 text-white border border-blue-600/40"
          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 border border-transparent"
      }`}
    >
      <div className="pt-0.5 flex-shrink-0">
        {lesson.completed ? (
          <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
            <svg
              className="w-3 h-3 text-gray-900 dark:text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        ) : (
          <div className="w-4 h-4 rounded-full border-2 border-gray-400 dark:border-gray-600" />
        )}
      </div>
      <span className="line-clamp-2 flex-1">{lesson.title}</span>
    </Link>
  );
}

export function LessonsSidebar({
  courseSlug,
  courseTitle,
  modules,
  currentLessonId,
}: Props) {
  // Which module contains current lesson — keep open by default
  const currentModuleId = modules.find((m) =>
    m.lessons.some((l) => l.id === currentLessonId)
  )?.id;

  const [openModules, setOpenModules] = useState<Set<string>>(
    new Set(currentModuleId ? [currentModuleId] : [])
  );

  const toggle = (id: string) => {
    setOpenModules((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <aside className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden flex flex-col">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800">
        <Link
          href={`/course/${courseSlug}`}
          className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
        >
          ← Voltar ao curso
        </Link>
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white mt-1 line-clamp-2">
          {courseTitle}
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto max-h-[70vh] lg:max-h-[calc(100vh-12rem)] p-2 space-y-1">
        {modules.map((mod) => {
          const isOpen = openModules.has(mod.id);
          const prog = moduleProgress(mod);
          return (
            <div key={mod.id}>
              <button
                type="button"
                onClick={() => toggle(mod.id)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-left"
              >
                <svg
                  className={`w-4 h-4 text-gray-600 dark:text-gray-400 transition-transform ${
                    isOpen ? "rotate-90" : ""
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
                {mod.thumbnailUrl && (
                  <div className="relative w-10 h-7 rounded overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                    <Image src={mod.thumbnailUrl} alt={mod.title} fill sizes="40px" className="object-cover" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium line-clamp-1 flex items-center gap-1.5 ${mod.locked ? "text-gray-400 dark:text-gray-500" : "text-gray-900 dark:text-white"}`}>
                    {mod.locked && (
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    )}
                    {mod.title}
                  </p>
                  {mod.locked ? (
                    <p className="text-[10px] text-gray-500 mt-1">
                      Libera em {mod.daysRemaining} dia{mod.daysRemaining === 1 ? "" : "s"}
                    </p>
                  ) : (
                    <div className="flex items-center gap-2 mt-1">
                      <div className="flex-1 h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500"
                          style={{ width: `${prog}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-gray-500">
                        {prog}%
                      </span>
                    </div>
                  )}
                </div>
              </button>
              {isOpen && (
                <div className="ml-4 mt-1 space-y-0.5">
                  {mod.lessons.map((lesson) => (
                    <LessonLink
                      key={lesson.id}
                      courseSlug={courseSlug}
                      lesson={lesson}
                      isCurrent={lesson.id === currentLessonId}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </aside>
  );
}
