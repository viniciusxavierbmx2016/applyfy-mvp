"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { MenuIcon } from "./menu-icons";

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
  const [items, setItems] = useState<MenuItem[]>([]);

  useEffect(() => {
    fetch(`/api/courses/${course.id}/menu`)
      .then((r) => (r.ok ? r.json() : { items: [] }))
      .then((d) => setItems(d.items || []))
      .catch(() => setItems([]));
  }, [course.id]);

  const widthClass = collapsed ? "lg:w-16" : "lg:w-64";

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={onMobileClose}
        />
      )}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-64 bg-gray-100 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col transform transition-[transform,width] duration-300 ease-in-out lg:translate-x-0 lg:static lg:z-auto",
          widthClass,
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div
          className={cn(
            "h-16 flex items-center border-b border-gray-200 dark:border-gray-800 relative",
            collapsed ? "lg:justify-center lg:px-2 px-4" : "px-4 justify-between"
          )}
        >
          <Link
            href={`/course/${course.slug}`}
            className={cn(
              "flex items-center gap-2 min-w-0",
              collapsed && "lg:justify-center"
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
                className="rounded-md object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-md bg-blue-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                {(course.workspaceName || course.title).charAt(0).toUpperCase()}
              </div>
            )}
            <span
              className={cn(
                "text-sm font-semibold text-gray-900 dark:text-white truncate",
                collapsed && "lg:hidden"
              )}
            >
              {course.workspaceName || course.title}
            </span>
          </Link>
          <button
            onClick={onMobileClose}
            className={cn("lg:hidden text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white", collapsed && "hidden")}
            aria-label="Fechar menu"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Desktop collapse toggle */}
        <button
          onClick={onToggleCollapsed}
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          className="hidden lg:flex absolute top-[52px] -right-3 z-50 items-center justify-center w-6 h-6 rounded-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white shadow-sm transition"
        >
          <svg
            className={cn("w-3.5 h-3.5 transition-transform", collapsed && "rotate-180")}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className={cn("pt-3", collapsed ? "lg:px-2 px-3" : "px-3")}>
          <Link
            href="/"
            onClick={onMobileClose}
            title="Voltar à vitrine"
            className={cn(
              "flex items-center gap-2 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-800 transition",
              collapsed ? "lg:justify-center lg:p-2 px-3 py-2" : "px-3 py-2"
            )}
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className={cn(collapsed && "lg:hidden")}>Voltar à vitrine</span>
          </Link>
        </div>

        <nav className={cn("flex-1 py-3 space-y-1 overflow-y-auto overflow-x-hidden", collapsed ? "lg:px-2 px-3" : "px-3")}>
          {items
            .filter((i) => i.enabled)
            .map((item) => {
              const isExternal = /^https?:\/\//i.test(item.url);
              const href = isExternal
                ? item.url
                : item.url.startsWith("/")
                  ? item.url.replace(/\/:slug/g, course.slug)
                  : `/course/${course.slug}/${item.url}`;
              const isActive =
                !isExternal &&
                (pathname === href ||
                  (href !== `/course/${course.slug}` && pathname.startsWith(href)));
              const baseCls = cn(
                "flex items-center gap-3 rounded-lg text-sm font-medium transition-colors",
                collapsed ? "lg:justify-center lg:p-2.5 px-3 py-2.5" : "px-3 py-2.5",
                isActive
                  ? "bg-blue-600/10 text-blue-500 dark:text-blue-400"
                  : "text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-800"
              );
              const labelEl = (
                <span className={cn("truncate", collapsed && "lg:hidden")}>
                  {item.label}
                </span>
              );
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
                    <span className="flex-shrink-0">
                      <MenuIcon name={item.icon} />
                    </span>
                    {labelEl}
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
                  <span className="flex-shrink-0">
                    <MenuIcon name={item.icon} />
                  </span>
                  {labelEl}
                </Link>
              );
            })}
        </nav>
      </aside>
    </>
  );
}
