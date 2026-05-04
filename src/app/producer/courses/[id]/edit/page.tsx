"use client";

import { useEffect, useState, use, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { CourseForm } from "@/components/course-form";
import { useUserStore } from "@/stores/user-store";
import type { ModuleData, SectionData } from "@/components/modules-manager";

const ModulesManager = dynamic(
  () => import("@/components/modules-manager").then((m) => m.ModulesManager),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 rounded-xl border border-gray-200 dark:border-[#1a1e2e] bg-gray-50 dark:bg-[#0a0e19] animate-pulse" />
    ),
  }
);

interface CourseData {
  id: string;
  title: string;
  slug: string;
  description: string;
  thumbnail: string | null;
  thumbnailPosition: string | null;
  bannerUrl: string | null;
  bannerPosition: string | null;
  checkoutUrl: string | null;
  price: number | null;
  priceCurrency: string | null;
  externalProductId: string | null;
  isPublished: boolean;
  showInStore: boolean;
  supportEmail: string | null;
  supportWhatsapp: string | null;
  featured: boolean;
  category: string | null;
  termsContent: string | null;
  termsFileUrl: string | null;
  modules: ModuleData[];
  sections: SectionData[];
}

function EditCoursePageInner(
  props: {
    params: Promise<{ id: string }>;
  }
) {
  const params = use(props.params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, collaborator } = useUserStore();
  const [course, setCourse] = useState<CourseData | null>(null);
  const [loading, setLoading] = useState(true);

  // C6: STUDENT with Collaborator row counts as collaborator.
  const isCollaborator =
    user?.role === "COLLABORATOR" ||
    (user?.role === "STUDENT" && !!collaborator);
  const tab = searchParams.get("tab") === "content" ? "content" : "info";

  useEffect(() => {
    const perms = collaborator?.permissions ?? [];
    if (isCollaborator && !perms.includes("MANAGE_LESSONS")) {
      router.replace(`/producer/courses/${params.id}/comments`);
    }
  }, [isCollaborator, collaborator?.permissions, params.id, router]);

  useEffect(() => {
    fetch(`/api/courses/${params.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.course) setCourse(data.course);
      })
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-32 bg-gray-100 dark:bg-gray-900 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (!course) return null;

  return tab === "info" ? (
    <CourseForm
      mode="edit"
      initial={{
        id: course.id,
        title: course.title,
        slug: course.slug,
        description: course.description,
        thumbnail: course.thumbnail,
        thumbnailPosition: course.thumbnailPosition,
        bannerUrl: course.bannerUrl,
        bannerPosition: course.bannerPosition,
        checkoutUrl: course.checkoutUrl || "",
        price: course.price != null ? String(course.price) : "",
        priceCurrency: course.priceCurrency || "BRL",
        externalProductId: course.externalProductId || "",
        isPublished: course.isPublished,
        showInStore: course.showInStore,
        supportEmail: course.supportEmail || "",
        supportWhatsapp: course.supportWhatsapp || "",
        featured: course.featured,
        category: course.category || "",
        termsContent: course.termsContent || "",
        termsFileUrl: course.termsFileUrl || "",
      }}
    />
  ) : (
    <ModulesManager
      courseId={course.id}
      initialModules={course.modules}
      initialSections={course.sections || []}
    />
  );
}

export default function EditCoursePage(props: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-32 bg-gray-100 dark:bg-gray-900 rounded-xl animate-pulse"
            />
          ))}
        </div>
      }
    >
      <EditCoursePageInner {...props} />
    </Suspense>
  );
}
