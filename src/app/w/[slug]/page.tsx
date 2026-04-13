"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
  ratingAverage?: number;
  ratingCount?: number;
  isExpired?: boolean;
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
  checkoutUrl: string | null;
  ratingAverage?: number;
  ratingCount?: number;
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

  useEffect(() => {
    fetch(`/api/w/${slug}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setWs(d.workspace));
  }, [slug]);

  useEffect(() => {
    if (userLoading) return;
    if (!user) {
      router.replace(`/w/${slug}/login`);
      return;
    }
    async function load() {
      try {
        const res = await fetch(`/api/courses?workspace=${encodeURIComponent(slug)}`);
        if (res.status === 403) {
          // Student belongs to another workspace — bounce to login with msg.
          await fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
          router.replace(
            `/w/${slug}/login?error=${encodeURIComponent("Você não tem acesso a esta área de membros")}`
          );
          return;
        }
        if (res.ok) {
          const data = await res.json();
          setEnrolled(data.enrolled || []);
          setStore(data.store || []);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user, userLoading, slug, router]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace(`/w/${slug}/login`);
  }

  if (userLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const displayName = ws?.name || "Workspace";

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <header className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden flex-shrink-0">
              {ws?.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={ws.logoUrl}
                  alt={displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-lg font-bold text-gray-800 dark:text-white">
                  {displayName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
              {displayName}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/profile"
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-lg"
            >
              Meu Perfil
            </Link>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-lg"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Olá, {user?.name?.split(" ")[0] || "aluno"} 👋
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Bem-vindo à área de membros de {displayName}
        </p>

        <section className="mb-10">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Meus cursos
          </h3>
          {enrolled.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-8 text-center">
              <p className="text-gray-500">
                Você ainda não está matriculado em nenhum curso
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {enrolled.map((course) => (
                <CourseCard
                  key={course.id}
                  slug={course.slug}
                  title={course.title}
                  description={course.description}
                  thumbnail={course.thumbnail}
                  progress={calculateCourseProgress(course)}
                  ratingAverage={course.ratingAverage}
                  ratingCount={course.ratingCount}
                  expired={course.isExpired}
                />
              ))}
            </div>
          )}
        </section>

        {store.length > 0 && (
          <section>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Outros cursos
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {store.map((course) => (
                <CourseCard
                  key={course.id}
                  slug={course.slug}
                  title={course.title}
                  description={course.description}
                  thumbnail={course.thumbnail}
                  checkoutUrl={course.checkoutUrl}
                  ratingAverage={course.ratingAverage}
                  ratingCount={course.ratingCount}
                  locked
                />
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
