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
  lockReason?: string | null;
  releaseDate?: string | null;
  daysRemaining?: number;
}

function formatReleaseDate(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
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
        className="relative flex items-start gap-3 pl-4 pr-3 py-2 rounded-[10px] text-sm text-gray-500 cursor-not-allowed"
        title={lesson.releaseDate ? `Libera em ${formatReleaseDate(lesson.releaseDate)}` : "Aula bloqueada"}
      >
        <div className="pt-[3px] flex-shrink-0">
          <svg
            className="w-3.5 h-3.5 text-gray-400 dark:text-gray-600"
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
          <p className="line-clamp-2 leading-snug">{lesson.title}</p>
          <p className="text-[10px] mt-0.5 text-gray-500">
            {lesson.releaseDate ? `Libera em ${formatReleaseDate(lesson.releaseDate)}` : "Aula bloqueada"}
          </p>
        </div>
      </div>
    );
  }
  return (
    <Link
      href={`/course/${courseSlug}/lesson/${lesson.id}`}
      className={`relative flex items-start gap-3 pl-4 pr-3 py-2 rounded-[10px] text-sm transition-colors duration-200 ${
        isCurrent
          ? "bg-blue-500/10 dark:bg-blue-500/15 text-gray-900 dark:text-white shadow-sm"
          : lesson.completed
            ? "text-gray-500 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white"
            : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white"
      }`}
    >
      {isCurrent && (
        <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-blue-500 shadow-sm shadow-blue-500/50" />
      )}
      <div className="pt-[3px] flex-shrink-0">
        {lesson.completed ? (
          <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center shadow-sm shadow-emerald-500/30 transition-colors duration-300">
            <svg
              className="w-2.5 h-2.5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        ) : (
          <div className="w-3.5 h-3.5 rounded-full border border-gray-300 dark:border-gray-600" />
        )}
      </div>
      <span className="line-clamp-2 flex-1 leading-snug">{lesson.title}</span>
    </Link>
  );
}

export function LessonsSidebar({
  courseSlug,
  courseTitle,
  modules,
  currentLessonId,
}: Props) {
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
    <aside className="bg-white dark:bg-gray-900 border border-gray-200/70 dark:border-white/5 rounded-2xl overflow-hidden flex flex-col shadow-sm">
      <div className="px-4 py-3.5 border-b border-gray-200/70 dark:border-white/5">
        <Link
          href={`/course/${courseSlug}`}
          className="group inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors duration-200"
        >
          <svg className="w-3.5 h-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Voltar ao curso
        </Link>
        <h2 className="text-sm font-semibold tracking-tight text-gray-900 dark:text-white mt-1.5 line-clamp-2">
          {courseTitle}
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto max-h-[70vh] lg:max-h-[calc(100vh-9rem)] p-2 space-y-1 scroll-smooth">
        {modules.map((mod) => {
          const isOpen = !mod.locked && openModules.has(mod.id);
          const prog = moduleProgress(mod);
          const lockText = mod.lockReason
            ? mod.lockReason
            : mod.releaseDate
              ? `Libera em ${formatReleaseDate(mod.releaseDate)}`
              : mod.daysRemaining
                ? `Libera em ${mod.daysRemaining} dia${mod.daysRemaining === 1 ? "" : "s"}`
                : "Módulo bloqueado";
          return (
            <div key={mod.id}>
              <button
                type="button"
                onClick={() => !mod.locked && toggle(mod.id)}
                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-[10px] text-left transition-colors duration-200 ${
                  mod.locked
                    ? "opacity-60 cursor-not-allowed"
                    : "hover:bg-gray-100 dark:hover:bg-white/5"
                }`}
                title={mod.locked ? lockText : undefined}
              >
                {mod.locked ? (
                  <svg
                    className="w-3 h-3 text-gray-400 dark:text-gray-600 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                ) : (
                  <svg
                    className={`w-3 h-3 text-gray-400 dark:text-gray-500 transition-transform duration-200 flex-shrink-0 ${
                      isOpen ? "rotate-90" : ""
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2.5}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                )}
                {mod.thumbnailUrl && (
                  <div className="relative w-8 h-8 rounded-md overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0 ring-1 ring-black/5 dark:ring-white/10">
                    <Image src={mod.thumbnailUrl} alt={mod.title} fill sizes="32px" className="object-cover" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-[13px] font-semibold tracking-tight line-clamp-1 ${
                      mod.locked
                        ? "text-gray-400 dark:text-gray-500"
                        : "text-gray-900 dark:text-white"
                    }`}
                  >
                    {mod.title}
                  </p>
                  {mod.locked ? (
                    <p className="text-[10px] text-gray-500 mt-1">
                      {lockText}
                    </p>
                  ) : (
                    <div className="mt-1.5 h-[3px] bg-gray-200/70 dark:bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-blue-400 transition-[width] duration-500"
                        style={{ width: `${prog}%` }}
                      />
                    </div>
                  )}
                </div>
              </button>
              <div className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                <div className="overflow-hidden">
                  <div className="ml-3 mt-0.5 space-y-0.5 border-l border-gray-200/70 dark:border-white/5 pl-1">
                    {mod.lessons.map((lesson) => (
                      <LessonLink
                        key={lesson.id}
                        courseSlug={courseSlug}
                        lesson={lesson}
                        isCurrent={lesson.id === currentLessonId}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
