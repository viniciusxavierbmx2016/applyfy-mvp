"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CourseCard } from "@/components/course-card";
import { calculateCourseProgress } from "@/lib/utils";
import { useUserStore } from "@/stores/user-store";

interface WorkspaceInfo {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  loginBgColor: string | null;
}

interface EnrolledCourse {
  id: string;
  title: string;
  slug: string;
  description: string;
  thumbnail: string | null;
  thumbnailPosition?: string | null;
  checkoutUrl: string | null;
  ratingAverage?: number;
  ratingCount?: number;
  isExpired?: boolean;
  expiresAt?: string | null;
  canManage?: boolean;
  memberLayoutStyle?: string | null;
  memberWelcomeText?: string | null;
  modules: Array<{
    lessons: Array<{
      id: string;
      title: string;
      progress: Array<{ completed: boolean }>;
    }>;
  }>;
}

interface StoreCourse {
  id: string;
  title: string;
  slug: string;
  description: string;
  thumbnail: string | null;
  thumbnailPosition?: string | null;
  checkoutUrl: string | null;
  ratingAverage?: number;
  ratingCount?: number;
  canManage?: boolean;
  memberLayoutStyle?: string | null;
}

export default function WorkspaceVitrinePage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = params.slug;
  const { user, isLoading: userLoading } = useUserStore();
  const [ws, setWs] = useState<WorkspaceInfo | null>(null);
  const [enrolled, setEnrolled] = useState<EnrolledCourse[]>([]);
  const [store, setStore] = useState<StoreCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [suspended, setSuspended] = useState(false);

  useEffect(() => {
    if (userLoading) return;
    if (!user) {
      router.replace(`/w/${slug}/login`);
      return;
    }
    async function load() {
      try {
        const res = await fetch(`/api/w/${slug}/init`);
        if (res.status === 403) {
          await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
          router.replace(
            `/w/${slug}/login?error=${encodeURIComponent("Você não tem acesso a esta área de membros")}`
          );
          return;
        }
        if (res.status === 503) {
          const data = await res.json().catch(() => ({}));
          if (data.suspended) {
            setSuspended(true);
            return;
          }
        }
        if (res.ok) {
          const data = await res.json();
          setWs(data.workspace);
          setEnrolled(data.enrolled || []);
          setStore(data.store || []);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user, userLoading, slug, router]);

  const displayName = ws?.name || "Workspace";
  const active = enrolled.filter((c) => !c.isExpired);
  const expired = enrolled.filter((c) => c.isExpired);

  if (suspended) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950 px-4">
        <div className="text-center max-w-md">
          <div className="mx-auto w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-6">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Área temporariamente indisponível
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            O administrador desta área de membros está com o acesso suspenso. Por favor, entre em contato com o responsável.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-6xl mx-auto">
      <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-2">
        Olá, {user?.name?.split(" ")[0] || "aluno"}
      </h2>
      <p className="text-gray-600 dark:text-gray-400 mb-8">
        {`Bem-vindo à área de membros de ${displayName}`}
      </p>

      {userLoading || loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <section className="mb-10">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Meus cursos
            </h3>
            {active.length === 0 ? (
              <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-8 text-center">
                <p className="text-gray-500">
                  Você ainda não está matriculado em nenhum curso ativo
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {active.map((course) => (
                  <CourseCard
                    key={course.id}
                    slug={course.slug}
                    title={course.title}
                    description={course.description}
                    thumbnail={course.thumbnail}
                    thumbnailPosition={course.thumbnailPosition}
                    progress={calculateCourseProgress(course)}
                    ratingAverage={course.ratingAverage}
                    ratingCount={course.ratingCount}
                    expiresAt={course.expiresAt}
                    manageHref={
                      course.canManage
                        ? `/producer/courses/${course.id}/edit`
                        : undefined
                    }
                  />
                ))}
              </div>
            )}
          </section>

          {expired.length > 0 && (
            <section className="mb-10">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                Acesso expirado
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Renove para continuar assistindo a estes cursos.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {expired.map((course) => (
                  <CourseCard
                    key={course.id}
                    slug={course.slug}
                    title={course.title}
                    description={course.description}
                    thumbnail={course.thumbnail}
                    thumbnailPosition={course.thumbnailPosition}
                    ratingAverage={course.ratingAverage}
                    ratingCount={course.ratingCount}
                    checkoutUrl={course.checkoutUrl}
                    expired
                  />
                ))}
              </div>
            </section>
          )}

          {store.length > 0 && (
            <section>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Outros cursos
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {store.map((course) => (
                  <CourseCard
                    key={course.id}
                    slug={course.slug}
                    title={course.title}
                    description={course.description}
                    thumbnail={course.thumbnail}
                    thumbnailPosition={course.thumbnailPosition}
                    checkoutUrl={course.checkoutUrl}
                    ratingAverage={course.ratingAverage}
                    ratingCount={course.ratingCount}
                    locked={!course.canManage}
                    manageHref={
                      course.canManage
                        ? `/producer/courses/${course.id}/edit`
                        : undefined
                    }
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
