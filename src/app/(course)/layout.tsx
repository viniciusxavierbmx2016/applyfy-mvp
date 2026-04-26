"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CourseSidebar } from "@/components/course-sidebar";

interface CourseSummary {
  id: string;
  slug: string;
  title: string;
  workspaceName?: string | null;
  workspaceLogo?: string | null;
  workspaceSlug?: string | null;
  memberBgColor?: string | null;
  memberSidebarColor?: string | null;
  memberHeaderColor?: string | null;
  memberCardColor?: string | null;
  memberPrimaryColor?: string | null;
  memberTextColor?: string | null;
}

const COLLAPSED_KEY = "course-sidebar-collapsed";

export default function CourseGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams<{ slug?: string }>();
  const slug = params?.slug;
  const [course, setCourse] = useState<CourseSummary | null>(null);
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(COLLAPSED_KEY);
      if (saved === "1") setCollapsed(true);
    } catch {}
  }, []);

  useEffect(() => {
    if (!slug) return;
    fetch(`/api/courses/by-slug/${slug}?summary=1`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d?.course) return;
        const vw = d.viewerWorkspace;
        setCourse({
          id: d.course.id,
          slug: d.course.slug,
          title: d.course.title,
          workspaceName: vw?.name ?? d.course.workspace?.name ?? null,
          workspaceLogo: vw?.logoUrl ?? d.course.workspace?.logoUrl ?? null,
          workspaceSlug: vw?.slug ?? d.course.workspace?.slug ?? null,
          memberBgColor: d.course.memberBgColor ?? null,
          memberSidebarColor: d.course.memberSidebarColor ?? null,
          memberHeaderColor: d.course.memberHeaderColor ?? null,
          memberCardColor: d.course.memberCardColor ?? null,
          memberPrimaryColor: d.course.memberPrimaryColor ?? null,
          memberTextColor: d.course.memberTextColor ?? null,
        });
        setHasAccess(!!d.hasAccess);
      })
      .catch(() => {});
  }, [slug]);

  useEffect(() => {
    if (!course) return;
    const root = document.documentElement;
    const vars: [string, string | null][] = [
      ["--member-bg", course.memberBgColor ?? null],
      ["--member-sidebar", course.memberSidebarColor ?? null],
      ["--member-header", course.memberHeaderColor ?? null],
      ["--member-card", course.memberCardColor ?? null],
      ["--member-primary", course.memberPrimaryColor ?? null],
      ["--member-text", course.memberTextColor ?? null],
    ];
    for (const [key, val] of vars) {
      if (val) root.style.setProperty(key, val);
      else root.style.removeProperty(key);
    }
    return () => {
      for (const [key] of vars) root.style.removeProperty(key);
    };
  }, [course]);

  function toggleCollapsed() {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(COLLAPSED_KEY, next ? "1" : "0");
      } catch {}
      return next;
    });
  }

  if (!course || hasAccess === null) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Preview mode: no sidebar — the preview page owns the full viewport
  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950">{children}</div>
    );
  }

  const bgStyle = course.memberBgColor ? { backgroundColor: course.memberBgColor } : undefined;
  const headerStyle = course.memberHeaderColor ? { backgroundColor: course.memberHeaderColor } : undefined;
  const textStyle = course.memberTextColor ? { color: course.memberTextColor } : undefined;
  const hasCustomization = !!(
    course.memberBgColor ||
    course.memberSidebarColor ||
    course.memberHeaderColor ||
    course.memberCardColor ||
    course.memberPrimaryColor ||
    course.memberTextColor
  );

  return (
    <div className={`h-screen bg-white dark:bg-gray-950 flex ${hasCustomization ? "course-customized" : ""}`} style={{ ...bgStyle, ...textStyle }}>
      <CourseSidebar
        course={course}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        collapsed={collapsed}
        onToggleCollapsed={toggleCollapsed}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden sticky top-0 z-30 h-14 px-4 flex items-center gap-3 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800" style={headerStyle}>
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 -ml-2 text-gray-700 dark:text-gray-300"
            aria-label="Abrir menu"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {course.title}
          </p>
        </header>
        <main className="flex-1 min-h-0">{children}</main>
      </div>
    </div>
  );
}
