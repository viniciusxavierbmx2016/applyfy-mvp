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
  studentsCount?: number;
}

const baseCls =
  "flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-medium border-b-2 transition whitespace-nowrap";
const inactiveCls =
  "border-transparent text-gray-500 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-300";
const activeCls = "border-blue-500 text-gray-900 dark:text-white";

type TabDef = {
  key: CourseEditTab;
  label: string;
  requires?: string;
  icon: React.ReactNode;
  tourId?: string;
  tooltip?: string;
};

const iconPencil = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
    <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    <path d="m15 5 4 4" />
  </svg>
);

const iconBook = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </svg>
);

const iconUsers = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const iconMessage = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const iconPalette = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
    <path d="M12 2a10 10 0 0 0 0 20 2 2 0 0 0 2-2v-1a2 2 0 0 1 2-2h1a2 2 0 0 0 2-2 10 10 0 0 0-7-13z" />
    <circle cx="8" cy="8" r="1" /><circle cx="12" cy="6" r="1" /><circle cx="16" cy="8" r="1" /><circle cx="9" cy="12" r="1" />
  </svg>
);

export function CourseEditTabs({
  courseId,
  active,
  studentsCount,
}: Props) {
  const pathname = usePathname();
  const { user, collaborator } = useUserStore();
  const prefix = pathname.startsWith("/admin") ? "/admin" : "/producer";

  const perms = collaborator?.permissions ?? [];
  // C6: STUDENT with Collaborator row counts as collaborator.
  const isCollaborator =
    user?.role === "COLLABORATOR" ||
    (user?.role === "STUDENT" && !!collaborator);

  const allTabs: TabDef[] = [
    { key: "info", label: "Informações", requires: "MANAGE_LESSONS", icon: iconPencil, tourId: "course-tab-info" },
    { key: "content", label: "Conteúdo", requires: "MANAGE_LESSONS", icon: iconBook, tourId: "course-tab-content" },
    { key: "students", label: "Alunos", requires: "MANAGE_STUDENTS", icon: iconUsers, tourId: "course-tab-students" },
    { key: "comments", label: "Comentários", requires: "REPLY_COMMENTS", icon: iconMessage, tourId: "course-tab-comments" },
    { key: "customize", label: "Personalizar Curso", requires: "MANAGE_LESSONS", icon: iconPalette, tourId: "course-tab-customize" },
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
    <div className="-mx-4 sm:mx-0 border-b border-gray-200 dark:border-white/[0.06]" data-tour="course-tabs">
      <div className="flex gap-0 px-4 sm:px-0 overflow-x-auto">
        {visibleTabs.map((tab) => {
          const cls = `${baseCls} ${active === tab.key ? activeCls : inactiveCls}`;

          return (
            <Link key={tab.key} href={href(tab.key)} className={cls} {...(tab.tourId ? { "data-tour": tab.tourId } : {})}>
              {tab.icon}
              {tab.label}
              {tab.key === "students" && typeof studentsCount === "number" && (
                <span className="ml-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400 font-semibold">
                  {studentsCount}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
