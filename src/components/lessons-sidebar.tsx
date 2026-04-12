"use client";

import { useState } from "react";
import Link from "next/link";

export interface SidebarLesson {
  id: string;
  title: string;
  completed: boolean;
}

export interface SidebarModule {
  id: string;
  title: string;
  lessons: SidebarLesson[];
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
  return (
    <Link
      href={`/course/${courseSlug}/lesson/${lesson.id}`}
      className={`flex items-start gap-3 px-3 py-2 rounded-lg text-sm transition ${
        isCurrent
          ? "bg-blue-600/20 text-white border border-blue-600/40"
          : "text-gray-300 hover:bg-gray-800 border border-transparent"
      }`}
    >
      <div className="pt-0.5 flex-shrink-0">
        {lesson.completed ? (
          <div className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center">
            <svg
              className="w-3 h-3 text-white"
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
          <div className="w-4 h-4 rounded-full border-2 border-gray-600" />
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
    <aside className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden flex flex-col">
      <div className="px-4 py-3 border-b border-gray-800">
        <Link
          href={`/course/${courseSlug}`}
          className="text-xs text-gray-400 hover:text-white"
        >
          ← Voltar ao curso
        </Link>
        <h2 className="text-sm font-semibold text-white mt-1 line-clamp-2">
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
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-800 text-left"
              >
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform ${
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
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white line-clamp-1">
                    {mod.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500"
                        style={{ width: `${prog}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-gray-500">
                      {prog}%
                    </span>
                  </div>
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
