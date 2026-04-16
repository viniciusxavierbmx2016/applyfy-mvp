"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type CourseEditTab =
  | "info"
  | "content"
  | "students"
  | "menu"
  | "settings";

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
  const pathname = usePathname();
  const prefix = pathname.startsWith("/admin") ? "/admin" : "/producer";
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
            href={`${prefix}/courses/${courseId}/edit`}
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
            href={`${prefix}/courses/${courseId}/edit?tab=content`}
            className={`${baseCls} ${active === "content" ? activeCls : inactiveCls}`}
          >
            {contentLabel}
          </Link>
        )}

        <Link
          href={`${prefix}/courses/${courseId}/students`}
          className={`${baseCls} ${active === "students" ? activeCls : inactiveCls}`}
        >
          {studentsLabel}
        </Link>

        <Link
          href={`${prefix}/courses/${courseId}/menu`}
          className={`${baseCls} ${active === "menu" ? activeCls : inactiveCls}`}
        >
          Menu lateral
        </Link>

        <Link
          href={`${prefix}/courses/${courseId}/settings`}
          className={`${baseCls} inline-flex items-center gap-1.5 ${active === "settings" ? activeCls : inactiveCls}`}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-4 h-4"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          Configurações
        </Link>
      </div>
    </div>
  );
}
