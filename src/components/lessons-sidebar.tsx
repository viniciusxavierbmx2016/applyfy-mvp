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

  const totalLessons = modules.reduce((sum, m) => sum + m.lessons.length, 0);
  const totalCompleted = modules.reduce(
    (sum, m) => sum + m.lessons.filter((l) => l.completed).length,
    0
  );
  const overallProgress =
    totalLessons > 0 ? Math.round((totalCompleted / totalLessons) * 100) : 0;

  return (
    <aside className="bg-white dark:bg-[#0f0f12] flex flex-col h-full">
      <div className="px-4 py-3.5 border-b border-gray-200/70 dark:border-white/5 flex-shrink-0">
        <div className="text-sm font-bold text-gray-900 dark:text-white line-clamp-2">
          {courseTitle}
        </div>
        <div className="text-[11px] text-gray-500 mt-0.5">
          {modules.length} módulo{modules.length !== 1 ? "s" : ""} · {totalLessons} aula{totalLessons !== 1 ? "s" : ""} · {overallProgress}% concluído
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {modules.map((mod) => {
          const isOpen = !mod.locked && openModules.has(mod.id);
          const completedCount = mod.lessons.filter((l) => l.completed).length;
          const modProgress =
            mod.lessons.length > 0
              ? Math.round((completedCount / mod.lessons.length) * 100)
              : 0;
          const lockText = mod.lockReason
            ? mod.lockReason
            : mod.releaseDate
              ? `Libera em ${formatReleaseDate(mod.releaseDate)}`
              : mod.daysRemaining
                ? `Libera em ${mod.daysRemaining} dia${mod.daysRemaining === 1 ? "" : "s"}`
                : "Módulo bloqueado";

          return (
            <div key={mod.id} className="border-b border-gray-200/70 dark:border-white/5">
              <div
                onClick={() => !mod.locked && toggle(mod.id)}
                className={`flex items-center gap-2.5 px-4 py-3 transition-colors ${
                  mod.locked
                    ? "opacity-60 cursor-not-allowed"
                    : "cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.03]"
                }`}
                title={mod.locked ? lockText : undefined}
              >
                {mod.thumbnailUrl ? (
                  <div className="relative w-8 h-8 rounded-md overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0">
                    <Image
                      src={mod.thumbnailUrl}
                      alt={mod.title}
                      fill
                      sizes="32px"
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-md bg-gray-100 dark:bg-white/5 flex-shrink-0" />
                )}

                <div className="flex-1 min-w-0">
                  <div
                    className={`text-xs font-semibold truncate ${
                      mod.locked
                        ? "text-gray-400 dark:text-gray-500"
                        : "text-gray-800 dark:text-gray-200"
                    }`}
                  >
                    {mod.title}
                  </div>
                  {mod.locked ? (
                    <div className="text-[10px] text-gray-500 mt-0.5">
                      {lockText}
                    </div>
                  ) : (
                    <div className="text-[10px] text-gray-500 mt-0.5">
                      {completedCount} de {mod.lessons.length} concluída{mod.lessons.length !== 1 ? "s" : ""}
                    </div>
                  )}
                </div>

                {mod.locked ? (
                  <svg
                    className="w-3.5 h-3.5 text-gray-400 dark:text-gray-600 flex-shrink-0"
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
                ) : (
                  <svg
                    className={`w-3.5 h-3.5 text-gray-400 dark:text-gray-600 transition-transform duration-200 flex-shrink-0 ${
                      isOpen ? "rotate-90" : ""
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                )}
              </div>

              <div
                className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
                  isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                }`}
              >
                <div className="overflow-hidden">
                  <div className="mx-4 ml-[58px] mb-1.5">
                    <div className="h-[2px] bg-gray-200/70 dark:bg-white/5 rounded-full">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all duration-500"
                        style={{ width: `${modProgress}%` }}
                      />
                    </div>
                  </div>

                  {mod.lessons.map((lesson) => {
                    const isCurrent = lesson.id === currentLessonId;

                    if (lesson.locked) {
                      return (
                        <div
                          key={lesson.id}
                          className="flex items-center gap-2 px-4 py-2 pl-[58px] text-xs text-gray-400 dark:text-gray-600 cursor-not-allowed"
                          title={
                            lesson.releaseDate
                              ? `Libera em ${formatReleaseDate(lesson.releaseDate)}`
                              : "Aula bloqueada"
                          }
                        >
                          <svg
                            className="w-3 h-3 flex-shrink-0"
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
                          <span className="truncate">{lesson.title}</span>
                          {lesson.releaseDate && (
                            <span className="text-[10px] text-gray-500 ml-auto flex-shrink-0">
                              {formatReleaseDate(lesson.releaseDate)}
                            </span>
                          )}
                        </div>
                      );
                    }

                    return (
                      <Link
                        key={lesson.id}
                        href={`/course/${courseSlug}/lesson/${lesson.id}`}
                        className={`flex items-center gap-2 px-4 py-2 pl-[58px] text-xs transition-colors relative ${
                          isCurrent
                            ? "text-gray-900 dark:text-white bg-blue-50 dark:bg-blue-500/[0.08]"
                            : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/[0.03]"
                        }`}
                      >
                        {isCurrent && (
                          <div className="absolute left-0 top-1 bottom-1 w-[3px] bg-blue-500 rounded-r" />
                        )}
                        <div
                          className={`w-3.5 h-3.5 rounded-full flex-shrink-0 flex items-center justify-center ${
                            lesson.completed
                              ? "bg-emerald-500"
                              : "border-[1.5px] border-gray-300 dark:border-gray-600"
                          }`}
                        >
                          {lesson.completed && (
                            <svg
                              className="w-2 h-2 text-white"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={3.5}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )}
                        </div>
                        <span className="truncate">{lesson.title}</span>
                      </Link>
                    );
                  })}

                  <div className="h-1.5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
