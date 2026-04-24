"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { MenuIcon } from "./menu-icons";
import { useUserStore } from "@/stores/user-store";
import { formatWhatsappLink } from "@/lib/utils";

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
          "fixed top-0 left-0 z-50 h-screen w-60 flex flex-col",
          "bg-[var(--member-sidebar,rgb(249_250_251))] dark:bg-[var(--member-sidebar,rgb(3_7_18))]",
          "border-r border-gray-200 dark:border-white/5",
          "transform transition-[width,transform] duration-300 ease-in-out",
          "lg:translate-x-0 lg:sticky lg:top-0 lg:z-auto",
          widthClass,
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header — logo do workspace */}
        <div
          className={cn(
            "relative flex items-center border-b border-gray-200 dark:border-white/5 transition-[padding,gap,height] duration-300",
            collapsed
              ? "lg:justify-center lg:py-4 lg:px-2 p-5"
              : "p-5 justify-between"
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

          {/* Botão de colapsar — canto direito quando aberta */}
          {!collapsed && (
            <button
              onClick={onToggleCollapsed}
              aria-label="Recolher menu"
              className={cn(
                "hidden lg:flex absolute top-1/2 -translate-y-1/2 right-3 items-center justify-center w-6 h-6 rounded-full",
                "bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10",
                "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white",
                "transition-colors duration-200"
              )}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
        </div>

        {/* Botão de expandir — visível apenas quando colapsada, abaixo da logo */}
        {collapsed && (
          <div className="hidden lg:flex justify-center py-2 border-b border-gray-200 dark:border-white/5">
            <button
              onClick={onToggleCollapsed}
              aria-label="Expandir menu"
              className={cn(
                "group relative flex items-center justify-center w-7 h-7 rounded-full",
                "bg-gray-100 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10",
                "text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white",
                "transition-colors duration-200"
              )}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
              <span className={tooltipCls}>Expandir menu</span>
            </button>
          </div>
        )}

        {/* Voltar à vitrine/painel */}
        <div className="border-b border-gray-200 dark:border-white/5">
          <Link
            href={backHref}
            onClick={onMobileClose}
            title={backLabel}
            aria-label={backLabel}
            className={cn(
              "group relative flex items-center text-xs font-medium uppercase tracking-wide",
              "text-gray-500 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300",
              "transition-colors duration-200",
              collapsed
                ? "lg:justify-center lg:py-3 lg:px-0 gap-2 py-3 px-4"
                : "gap-2 py-3 px-4"
            )}
          >
            <svg
              className="flex-shrink-0"
              style={{ width: 16, height: 16 }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className={cn("transition-opacity duration-200", collapsed ? "lg:opacity-0 lg:w-0 lg:overflow-hidden" : "lg:opacity-100")}>{backLabel}</span>
            {collapsed && <span className={tooltipCls}>{backLabel}</span>}
          </Link>
        </div>

        {/* Itens do menu */}
        <nav
          className={cn(
            "flex-1 flex flex-col py-3 gap-1 overflow-y-auto",
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
                "group relative flex items-center gap-3 rounded-lg text-sm font-medium transition-colors duration-200",
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
                <span className={cn("truncate transition-opacity duration-200", collapsed ? "lg:opacity-0 lg:w-0 lg:overflow-hidden" : "lg:opacity-100")}>
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
        </nav>

        {/* Suporte — apenas ícones discretos no rodapé */}
        {(supportEmail || supportWhatsapp) && (
          <div className="border-t border-gray-200 dark:border-white/5 py-3 flex items-center justify-center gap-3">
            {supportEmail && (
              <a
                href={`mailto:${supportEmail}`}
                title="Enviar email"
                aria-label="Enviar email"
                className="text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-200 transition-colors duration-200"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6c0-1.1.9-2 2-2z" />
                  <polyline points="22,6 12,13 2,6" />
                </svg>
              </a>
            )}
            {formatWhatsappLink(supportWhatsapp) && (
              <a
                href={formatWhatsappLink(supportWhatsapp) as string}
                target="_blank"
                rel="noopener noreferrer"
                title="WhatsApp"
                aria-label="WhatsApp"
                className="text-gray-400 hover:text-green-500 dark:text-gray-400 dark:hover:text-green-400 transition-colors duration-200"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.67-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              </a>
            )}
          </div>
        )}
      </aside>
    </>
  );
}
