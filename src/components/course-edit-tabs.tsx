"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUserStore } from "@/stores/user-store";

export type CourseEditTab =
  | "info"
  | "content"
  | "students"
  | "comments"
  | "customize";

interface Props {
  courseId: string;
  active: CourseEditTab;
  modulesCount?: number;
  studentsCount?: number;
  onSelectInfo?: () => void;
  onSelectContent?: () => void;
}

const baseCls =
  "px-4 py-2.5 text-sm font-medium border-b-2 transition whitespace-nowrap";
const inactiveCls =
  "border-transparent text-gray-600 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-300";
const activeCls = "border-indigo-500 text-gray-900 dark:text-white";

type TabDef = {
  key: CourseEditTab;
  label: string;
  requires?: string;
};

export function CourseEditTabs({
  courseId,
  active,
  modulesCount,
  studentsCount,
  onSelectInfo,
  onSelectContent,
}: Props) {
  const pathname = usePathname();
  const { user, collaborator } = useUserStore();
  const prefix = pathname.startsWith("/admin") ? "/admin" : "/producer";

  const perms = collaborator?.permissions ?? [];
  const isCollaborator = user?.role === "COLLABORATOR";

  const contentLabel =
    typeof modulesCount === "number"
      ? `Conteúdo (${modulesCount})`
      : "Conteúdo";
  const studentsLabel =
    typeof studentsCount === "number"
      ? `Alunos (${studentsCount})`
      : "Alunos";

  const allTabs: TabDef[] = [
    { key: "info", label: "Informações", requires: "MANAGE_LESSONS" },
    { key: "content", label: contentLabel, requires: "MANAGE_LESSONS" },
    { key: "students", label: studentsLabel, requires: "MANAGE_STUDENTS" },
    { key: "comments", label: "Comentários", requires: "REPLY_COMMENTS" },
    { key: "customize", label: "Personalizar Curso", requires: "MANAGE_LESSONS" },
  ];

  const visibleTabs = isCollaborator
    ? allTabs.filter((t) => !t.requires || perms.includes(t.requires))
    : allTabs;

  function href(tab: CourseEditTab) {
    if (tab === "info") return `${prefix}/courses/${courseId}/edit`;
    if (tab === "content") return `${prefix}/courses/${courseId}/edit?tab=content`;
    return `${prefix}/courses/${courseId}/${tab}`;
  }

  return (
    <div className="-mx-4 sm:mx-0 mb-6 border-b border-gray-200 dark:border-[#1a1e2e]">
      <div className="flex gap-1 px-4 sm:px-0 overflow-x-auto">
        {visibleTabs.map((tab) => {
          const cls = `${baseCls} ${active === tab.key ? activeCls : inactiveCls}`;

          if (tab.key === "info" && onSelectInfo) {
            return (
              <button key={tab.key} type="button" onClick={onSelectInfo} className={cls}>
                {tab.label}
              </button>
            );
          }
          if (tab.key === "content" && onSelectContent) {
            return (
              <button key={tab.key} type="button" onClick={onSelectContent} className={cls}>
                {tab.label}
              </button>
            );
          }

          if (tab.key === "customize") {
            return (
              <Link key={tab.key} href={href(tab.key)} className={`${cls} inline-flex items-center gap-1.5`}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <path d="M12 2a10 10 0 0 0 0 20 2 2 0 0 0 2-2v-1a2 2 0 0 1 2-2h1a2 2 0 0 0 2-2 10 10 0 0 0-7-13z" />
                  <circle cx="8" cy="8" r="1" /><circle cx="12" cy="6" r="1" /><circle cx="16" cy="8" r="1" /><circle cx="9" cy="12" r="1" />
                </svg>
                {tab.label}
              </Link>
            );
          }

          return (
            <Link key={tab.key} href={href(tab.key)} className={cls}>
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
