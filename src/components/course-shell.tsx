"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CourseSidebar } from "@/components/course-sidebar";
import { TermsModal } from "@/components/terms-modal";
import { useUserStore } from "@/stores/user-store";

interface CourseShellProps {
  course: {
    id: string;
    slug: string;
    title: string;
    bannerUrl?: string | null;
    workspace: {
      id: string;
      name: string;
      logoUrl: string | null;
      slug: string;
      ownerId: string;
    };
    termsContent?: string | null;
    termsFileUrl?: string | null;
  };
  hasAccess: boolean;
  hasCustomization: boolean;
  children: React.ReactNode;
}

const COLLAPSED_KEY = "course-sidebar-collapsed";

export function CourseShell({
  course,
  hasAccess,
  hasCustomization,
  children,
}: CourseShellProps) {
  const router = useRouter();
  const { user, isLoading, authError } = useUserStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [termsRequired, setTermsRequired] = useState(false);
  const [termsContent, setTermsContent] = useState("");
  const [termsFileUrl, setTermsFileUrl] = useState("");
  const [termsChecked, setTermsChecked] = useState(false);

  // 4.3/4.4: logged-out (stale cookie let the middleware through) → login.
  // Guard on the store's `user`, NOT hasAccess — a logged-in student without
  // enrollment (user set, hasAccess=false) must still get the preview/paywall,
  // not a bounce to login.
  useEffect(() => {
    if (isLoading || authError) return;
    if (!user) router.replace("/producer/login");
  }, [user, isLoading, authError, router]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(COLLAPSED_KEY);
      if (saved === "1") setCollapsed(true);
    } catch {}
  }, []);

  useEffect(() => {
    if (!course?.id) return;
    if (!hasAccess) {
      setTermsChecked(true);
      return;
    }
    fetch(`/api/courses/${course.id}/terms-status`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.required) {
          setTermsRequired(true);
          setTermsContent(data.termsContent || "");
          setTermsFileUrl(data.termsFileUrl || "");
        } else {
          setTermsChecked(true);
        }
      })
      .catch(() => setTermsChecked(true));
  }, [course?.id, hasAccess]);

  function toggleCollapsed() {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(COLLAPSED_KEY, next ? "1" : "0");
      } catch {}
      return next;
    });
  }

  // Preview mode: no sidebar
  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-[var(--member-bg,rgb(255_255_255))] dark:bg-[var(--member-bg,rgb(3_7_18))]">{children}</div>
    );
  }

  const sidebarCourse = {
    id: course.id,
    slug: course.slug,
    title: course.title,
    workspaceName: course.workspace?.name ?? null,
    workspaceLogo: course.workspace?.logoUrl ?? null,
    workspaceSlug: course.workspace?.slug ?? null,
  };

  return (
    <div
      className={`h-screen bg-[var(--member-bg,rgb(255_255_255))] dark:bg-[var(--member-bg,rgb(3_7_18))] ${hasCustomization ? "course-customized" : ""}`}
    >
      <CourseSidebar
        course={sidebarCourse}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        collapsed={collapsed}
        onToggleCollapsed={toggleCollapsed}
      />
      <div
        className={`h-full flex flex-col min-w-0 transition-[padding] duration-200 ease-in-out ${collapsed ? "lg:pl-16" : "lg:pl-60"}`}
      >
        <header className="lg:hidden sticky top-0 z-30 h-14 px-4 flex items-center gap-3 bg-[var(--member-header,rgb(255_255_255))] dark:bg-[var(--member-header,rgb(3_7_18))] border-b border-gray-200 dark:border-gray-800">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 -ml-2 text-gray-700 dark:text-gray-300"
            aria-label="Abrir menu"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {course.title}
          </p>
        </header>
        <main className="flex-1 min-h-0 overflow-y-auto">{children}</main>
      </div>
      {termsRequired && !termsChecked && (
        <TermsModal
          courseId={course.id}
          termsContent={termsContent}
          termsFileUrl={termsFileUrl}
          onAccepted={() => {
            setTermsRequired(false);
            setTermsChecked(true);
          }}
        />
      )}
    </div>
  );
}
