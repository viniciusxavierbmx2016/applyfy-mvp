"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

export interface ListLesson {
  id: string;
  title: string;
  completed: boolean;
  locked?: boolean;
}

export interface ListModule {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  lessonsTotal: number;
  lessonsDone: number;
  progressPct: number;
  locked: boolean;
  hideTitle?: boolean;
  lessons: ListLesson[];
  resumeHref: string;
}

interface SectionGroup {
  title?: string;
  modules: ListModule[];
}

interface Props {
  groups: SectionGroup[];
  courseSlug: string;
}

export function ModuleListView({ groups, courseSlug }: Props) {
  const [openModules, setOpenModules] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setOpenModules((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="space-y-10 mb-12">
      {groups.map((group, idx) => (
        <section key={group.title || `g-${idx}`}>
          {group.title && (
            <h2 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white mb-4 px-1">
              {group.title}
            </h2>
          )}
          <div className="space-y-2">
            {group.modules.map((mod) => {
              const isOpen = openModules.has(mod.id);
              const hasLessons = mod.lessons.length > 0;
              return (
                <div key={mod.id}>
                  <button
                    type="button"
                    onClick={() => hasLessons && !mod.locked && toggle(mod.id)}
                    disabled={mod.locked}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-colors duration-200 text-left ${
                      mod.locked
                        ? "opacity-60 cursor-not-allowed border-gray-200 dark:border-white/5 bg-gray-50 dark:bg-white/5"
                        : "border-gray-200 dark:border-white/5 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-white/5 cursor-pointer"
                    }`}
                  >
                    {mod.thumbnailUrl ? (
                      <div className="relative w-16 h-20 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex-shrink-0 ring-1 ring-black/5 dark:ring-white/10">
                        <Image
                          src={mod.thumbnailUrl}
                          alt={mod.title}
                          fill
                          sizes="64px"
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-16 h-20 rounded-lg bg-gray-100 dark:bg-gray-800 flex-shrink-0 flex items-center justify-center ring-1 ring-black/5 dark:ring-white/10">
                        <svg className="w-6 h-6 text-gray-400 dark:text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {mod.locked && (
                          <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        )}
                        {!mod.hideTitle && (
                          <p className="text-base font-semibold text-gray-900 dark:text-white truncate">
                            {mod.title}
                          </p>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {mod.lessonsTotal} aula{mod.lessonsTotal !== 1 && "s"}
                        {mod.lessonsDone > 0 && (
                          <> · {mod.lessonsDone} concluída{mod.lessonsDone !== 1 && "s"}</>
                        )}
                      </p>
                      {!mod.locked && mod.lessonsTotal > 0 && (
                        <div className="mt-2 h-1 bg-gray-200 dark:bg-white/5 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-500"
                            style={{ width: `${mod.progressPct}%` }}
                          />
                        </div>
                      )}
                    </div>
                    {hasLessons && !mod.locked && (
                      <svg
                        className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    )}
                  </button>
                  {isOpen && (
                    <div className="ml-20 mt-1 space-y-0.5 pb-2">
                      {mod.lessons.map((lesson) => {
                        if (lesson.locked) {
                          return (
                            <div
                              key={lesson.id}
                              className="flex items-center gap-3 py-2.5 px-3 rounded-lg text-sm text-gray-500 cursor-not-allowed"
                            >
                              <svg className="w-4 h-4 text-gray-400 dark:text-gray-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                              </svg>
                              <span className="truncate">{lesson.title}</span>
                            </div>
                          );
                        }
                        return (
                          <Link
                            key={lesson.id}
                            href={`/course/${courseSlug}/lesson/${lesson.id}`}
                            className="flex items-center gap-3 py-2.5 px-3 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-white/5 transition-colors duration-200"
                          >
                            {lesson.completed ? (
                              <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                                <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            ) : (
                              <div className="w-4 h-4 rounded-full border border-gray-300 dark:border-gray-600 flex-shrink-0" />
                            )}
                            <span className={`truncate ${lesson.completed ? "text-gray-500" : "text-gray-700 dark:text-gray-300"}`}>
                              {lesson.title}
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
