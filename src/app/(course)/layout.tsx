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
        setCourse({
          id: d.course.id,
          slug: d.course.slug,
          title: d.course.title,
          workspaceName: d.course.workspace?.name ?? null,
          workspaceLogo: d.course.workspace?.logoUrl ?? null,
        });
        setHasAccess(!!d.hasAccess);
      })
      .catch(() => {});
  }, [slug]);

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

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 flex">
      <CourseSidebar
        course={course}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        collapsed={collapsed}
        onToggleCollapsed={toggleCollapsed}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden sticky top-0 z-30 h-14 px-4 flex items-center gap-3 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800">
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
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
