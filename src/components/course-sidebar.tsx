"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { MenuIcon } from "./menu-icons";
import { useUserStore } from "@/stores/user-store";
import { SupportPopover } from "./support-popover";

interface MenuItem {
  id: string;
  label: string;
  icon: string;
  url: string;
  isDefault: boolean;
  enabled: boolean;
}

interface CourseSummary {
  id: string;
  slug: string;
  title: string;
  workspaceName?: string | null;
  workspaceLogo?: string | null;
  workspaceSlug?: string | null;
}

interface Props {
  course: CourseSummary;
  mobileOpen: boolean;
  onMobileClose: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

export function CourseSidebar({
  course,
  mobileOpen,
  onMobileClose,
  collapsed,
  onToggleCollapsed,
}: Props) {
  const pathname = usePathname();
  const userRole = useUserStore((s) => s.user?.role);
  const isStaffViewer = userRole === "ADMIN" || userRole === "PRODUCER";
  const backHref = isStaffViewer
    ? "/"
    : course.workspaceSlug
      ? `/w/${course.workspaceSlug}`
      : "/";
  const backLabel = isStaffViewer ? "Voltar ao painel" : "Voltar à vitrine";
  const [items, setItems] = useState<MenuItem[]>([]);
  const [continueLessonId, setContinueLessonId] = useState<string | null>(null);
  const [hasLessons, setHasLessons] = useState(true);
  const [supportEmail, setSupportEmail] = useState<string | null>(null);
  const [supportWhatsapp, setSupportWhatsapp] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/courses/by-slug/${course.slug}/init`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.menu) setItems(d.menu as MenuItem[]);
        setSupportEmail(d?.course?.supportEmail ?? null);
        setSupportWhatsapp(d?.course?.supportWhatsapp ?? null);
        const modules = d?.course?.modules as
          | Array<{ lessons: Array<{ id: string }> }>
          | undefined;
        const allLessons = modules?.flatMap((m) => m.lessons) ?? [];
        if (allLessons.length === 0) {
          setHasLessons(false);
          setContinueLessonId(null);
          return;
        }
        setHasLessons(true);
        setContinueLessonId(
          (d?.lastAccessedLesson as string | null) ?? allLessons[0].id
        );
      })
      .catch(() => {});
  }, [course.slug]);

  const widthClass = collapsed ? "lg:w-16" : "lg:w-60";

  const tooltipCls =
    "hidden lg:group-hover:block absolute left-full ml-2 px-2 py-1 text-xs rounded-md bg-gray-900 dark:bg-gray-800 text-white whitespace-nowrap z-50 pointer-events-none shadow-lg";

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
          onClick={onMobileClose}
        />
      )}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-screen w-60 flex flex-col overflow-y-auto overflow-x-hidden",
          "bg-gray-50 dark:bg-gray-950",
          "border-r border-gray-200 dark:border-white/5",
          "transform transition-all duration-300 ease-in-out",
          "lg:translate-x-0 lg:sticky lg:top-0 lg:z-auto",
          widthClass,
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header — logo do workspace */}
        <div
          className={cn(
            "relative flex items-center border-b border-gray-200 dark:border-white/5",
            collapsed ? "lg:justify-center lg:p-4 p-5" : "p-5 justify-between"
          )}
        >
          <Link
            href={`/course/${course.slug}`}
            className={cn(
              "flex items-center gap-3 min-w-0 group",
              collapsed && "lg:justify-center lg:gap-0"
            )}
            onClick={onMobileClose}
            title={course.workspaceName || course.title}
          >
            {course.workspaceLogo ? (
              <Image
                src={course.workspaceLogo}
                alt={course.workspaceName || course.title}
                width={32}
                height={32}
                className="w-8 h-8 rounded-lg object-cover flex-shrink-0 ring-1 ring-black/5 dark:ring-white/10"
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center text-sm font-semibold flex-shrink-0 shadow-sm">
                {(course.workspaceName || course.title).charAt(0).toUpperCase()}
              </div>
            )}
            <span
              className={cn(
                "text-sm font-semibold tracking-tight text-gray-900 dark:text-white truncate",
                collapsed && "lg:hidden"
              )}
            >
              {course.workspaceName || course.title}
            </span>
          </Link>

          {/* Botão fechar no mobile */}
          <button
            onClick={onMobileClose}
            className={cn(
              "lg:hidden text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors duration-200",
              collapsed && "hidden"
            )}
            aria-label="Fechar menu"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Botão de colapsar — topo direito (desktop) */}
        <button
          onClick={onToggleCollapsed}
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          className={cn(
            "hidden lg:flex absolute top-3 items-center justify-center w-6 h-6 rounded-full",
            "bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10",
            "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white",
            "transition-all duration-200 z-10",
            collapsed ? "right-1/2 translate-x-1/2 top-16" : "right-3"
          )}
        >
          <svg
            className={cn(
              "w-3.5 h-3.5 transition-transform duration-300",
              collapsed && "rotate-180"
            )}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Voltar à vitrine/painel */}
        <div className="border-b border-gray-200 dark:border-white/5">
          <Link
            href={backHref}
            onClick={onMobileClose}
            title={backLabel}
            className={cn(
              "group relative flex items-center gap-2 text-xs font-medium uppercase tracking-wide",
              "text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300",
              "transition-colors duration-200",
              collapsed ? "lg:justify-center lg:py-3 lg:px-0 py-3 px-4" : "py-3 px-4"
            )}
          >
            <svg
              className="flex-shrink-0"
              style={{ width: 14, height: 14 }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className={cn(collapsed && "lg:hidden")}>{backLabel}</span>
            {collapsed && <span className={tooltipCls}>{backLabel}</span>}
          </Link>
        </div>

        {/* Itens do menu */}
        <nav
          className={cn(
            "flex-1 flex flex-col py-3 gap-1",
            collapsed ? "lg:px-2 px-3" : "px-3"
          )}
        >
          {items
            .filter((i) => i.enabled)
            .filter((i) => !(i.url.includes("#continue") && !hasLessons))
            .map((item) => {
              const isExternal = /^https?:\/\//i.test(item.url);
              const isContinue = item.url.includes("#continue");
              const href = isExternal
                ? item.url
                : isContinue
                  ? continueLessonId
                    ? `/course/${course.slug}/lesson/${continueLessonId}`
                    : `/course/${course.slug}`
                  : item.url.startsWith("/")
                    ? item.url.replace(/:slug/g, course.slug)
                    : `/course/${course.slug}/${item.url}`;
              const isActive =
                !isExternal &&
                (pathname === href ||
                  (href !== `/course/${course.slug}` && pathname.startsWith(href)));
              const baseCls = cn(
                "group relative flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-200",
                collapsed ? "lg:justify-center lg:p-2.5 py-2.5 px-3" : "py-2.5 px-3",
                isActive
                  ? "bg-gray-200 text-gray-900 dark:bg-white/10 dark:text-white"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-white/5 dark:hover:text-white"
              );
              const iconCls = cn(
                "flex-shrink-0 transition-colors duration-200 [&>svg]:w-[18px] [&>svg]:h-[18px]",
                collapsed && "lg:mx-auto",
                isActive
                  ? "text-gray-900 dark:text-white"
                  : "text-gray-400 dark:text-gray-500 group-hover:text-gray-900 dark:group-hover:text-white"
              );
              const labelEl = (
                <span className={cn("truncate", collapsed && "lg:hidden")}>
                  {item.label}
                </span>
              );
              const tooltipEl = collapsed ? (
                <span className={tooltipCls}>{item.label}</span>
              ) : null;
              if (isExternal) {
                return (
                  <a
                    key={item.id}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={item.label}
                    className={baseCls}
                  >
                    <span className={iconCls}>
                      <MenuIcon name={item.icon} />
                    </span>
                    {labelEl}
                    {tooltipEl}
                  </a>
                );
              }
              return (
                <Link
                  key={item.id}
                  href={href}
                  onClick={onMobileClose}
                  title={item.label}
                  className={baseCls}
                >
                  <span className={iconCls}>
                    <MenuIcon name={item.icon} />
                  </span>
                  {labelEl}
                  {tooltipEl}
                </Link>
              );
            })}

          {/* Suporte — empurrado para o final */}
          {(supportEmail || supportWhatsapp) && (
            <div
              className={cn(
                "mt-auto pt-3 border-t border-gray-200 dark:border-white/5",
                collapsed ? "lg:-mx-2 lg:px-2 -mx-3 px-3" : "-mx-3 px-3"
              )}
            >
              <SupportPopover
                email={supportEmail}
                whatsapp={supportWhatsapp}
                collapsed={collapsed}
                openUpward
                triggerClassName={cn(
                  "w-full text-sm font-medium rounded-lg transition-all duration-200",
                  "text-gray-600 dark:text-gray-400",
                  "hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-white/5 dark:hover:text-white",
                  collapsed ? "lg:justify-center lg:p-2.5 py-2.5 px-3" : "py-2.5 px-3"
                )}
              />
            </div>
          )}
        </nav>
      </aside>
    </>
  );
}
