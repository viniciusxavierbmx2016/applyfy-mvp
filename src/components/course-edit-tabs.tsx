"use client";

import Link from "next/link";

export type CourseEditTab = "info" | "content" | "students" | "menu";

interface Props {
  courseId: string;
  active: CourseEditTab;
  modulesCount?: number;
  studentsCount?: number;
  // When provided, info/content tabs become buttons that flip in-page state
  // (used on the edit page itself). Otherwise they navigate to /edit.
  onSelectInfo?: () => void;
  onSelectContent?: () => void;
}

const baseCls =
  "px-4 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap";
const inactiveCls =
  "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white";
const activeCls = "border-blue-500 text-gray-900 dark:text-white";

export function CourseEditTabs({
  courseId,
  active,
  modulesCount,
  studentsCount,
  onSelectInfo,
  onSelectContent,
}: Props) {
  const infoLabel = "Informações";
  const contentLabel =
    typeof modulesCount === "number"
      ? `Conteúdo (${modulesCount})`
      : "Conteúdo";
  const studentsLabel =
    typeof studentsCount === "number"
      ? `Alunos (${studentsCount})`
      : "Alunos";

  return (
    <div className="-mx-4 sm:mx-0 mb-6 border-b border-gray-200 dark:border-gray-800">
      <div className="flex gap-1 px-4 sm:px-0 overflow-x-auto">
        {onSelectInfo ? (
          <button
            type="button"
            onClick={onSelectInfo}
            className={`${baseCls} ${active === "info" ? activeCls : inactiveCls}`}
          >
            {infoLabel}
          </button>
        ) : (
          <Link
            href={`/admin/courses/${courseId}/edit`}
            className={`${baseCls} ${active === "info" ? activeCls : inactiveCls}`}
          >
            {infoLabel}
          </Link>
        )}

        {onSelectContent ? (
          <button
            type="button"
            onClick={onSelectContent}
            className={`${baseCls} ${active === "content" ? activeCls : inactiveCls}`}
          >
            {contentLabel}
          </button>
        ) : (
          <Link
            href={`/admin/courses/${courseId}/edit?tab=content`}
            className={`${baseCls} ${active === "content" ? activeCls : inactiveCls}`}
          >
            {contentLabel}
          </Link>
        )}

        <Link
          href={`/admin/courses/${courseId}/students`}
          className={`${baseCls} ${active === "students" ? activeCls : inactiveCls}`}
        >
          {studentsLabel}
        </Link>

        <Link
          href={`/admin/courses/${courseId}/menu`}
          className={`${baseCls} ${active === "menu" ? activeCls : inactiveCls}`}
        >
          Menu lateral
        </Link>
      </div>
    </div>
  );
}
