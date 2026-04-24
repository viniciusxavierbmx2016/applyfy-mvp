"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { CourseCard } from "@/components/course-card";
import { calculateCourseProgress } from "@/lib/utils";
import { useUserStore } from "@/stores/user-store";

interface WorkspaceInfo {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  loginBgColor: string | null;
  accentColor: string | null;
  bannerUrl: string | null;
  bannerPosition: string | null;
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
  featured: boolean;
  category: string | null;
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
  featured: boolean;
  category: string | null;
  memberLayoutStyle?: string | null;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

function groupByCategory<T extends { category: string | null }>(
  courses: T[]
): Array<{ key: string | null; label: string; items: T[] }> {
  const map = new Map<string | null, T[]>();
  for (const c of courses) {
    const key = c.category || null;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(c);
  }
  const groups: Array<{ key: string | null; label: string; items: T[] }> = [];
  const uncategorized = map.get(null);
  if (uncategorized) groups.push({ key: null, label: "Meus cursos", items: uncategorized });
  map.forEach((items, key) => {
    if (key !== null) groups.push({ key, label: key, items });
  });
  return groups;
}

export default function WorkspaceVitrinePage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = params.slug;
  const { user, isLoading: userLoading } = useUserStore();
  const [ws, setWs] = useState<WorkspaceInfo | null>(null);
  const [enrolled, setEnrolled] = useState<EnrolledCourse[]>([]);
  const [store, setStore] = useState<StoreCourse[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [suspended, setSuspended] = useState(false);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

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
          setCategories(data.categories || []);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user, userLoading, slug, router]);

  useEffect(() => {
    if (!ws?.accentColor) return;
    const root = document.documentElement;
    root.style.setProperty("--workspace-accent", ws.accentColor);
    return () => { root.style.removeProperty("--workspace-accent"); };
  }, [ws?.accentColor]);

  const displayName = ws?.name || "Workspace";

  function parseBannerPos(): { x: number; y: number } | null {
    if (!ws?.bannerPosition) return null;
    try { const p = JSON.parse(ws.bannerPosition); return { x: p.x ?? 50, y: p.y ?? 50 }; } catch { return null; }
  }

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

  const bannerPos = parseBannerPos();

  const allCourses = [...enrolled, ...store];

  const sortFeatured = <T extends { featured: boolean }>(courses: T[]): T[] =>
    [...courses].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));

  const filterCourses = <T extends { title: string; description: string; category: string | null }>(
    courses: T[]
  ): T[] => {
    let result = courses;
    if (activeCategory) {
      result = result.filter((c) => c.category === activeCategory);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.description?.toLowerCase().includes(q) ||
          c.category?.toLowerCase().includes(q)
      );
    }
    return result;
  };

  const active = sortFeatured(filterCourses(enrolled.filter((c) => !c.isExpired)));
  const expired = filterCourses(enrolled.filter((c) => c.isExpired));
  const filteredStore = sortFeatured(filterCourses(store));
  const hasFilters = !!search || !!activeCategory;
  const noResults = active.length === 0 && expired.length === 0 && filteredStore.length === 0 && hasFilters;

  const activeGroups = groupByCategory(active);
  const showGrouped = !hasFilters && activeGroups.length > 1;

  const gridCols = (count: number) =>
    count <= 2
      ? "grid grid-cols-1 sm:grid-cols-2 gap-4"
      : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4";

  const greeting = getGreeting();
  const firstName = user?.name?.split(" ")[0] || "aluno";

  return (
    <div className="animate-fade-in-up">
      {ws?.bannerUrl ? (
        <div className="px-4 sm:px-6 lg:px-8 pt-4 lg:pt-6 max-w-6xl mx-auto">
          <div
            className="relative w-full overflow-hidden rounded-2xl bg-gray-100 dark:bg-gray-900"
            style={{ aspectRatio: "24/5" }}
          >
            <Image
              src={ws.bannerUrl}
              alt={displayName}
              fill
              sizes="100vw"
              className="object-cover"
              style={bannerPos ? { objectPosition: `${bannerPos.x}% ${bannerPos.y}%` } : undefined}
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 p-6 lg:p-8">
              <h2 className="text-2xl lg:text-3xl font-bold text-white mb-1">
                {greeting}, {firstName}
              </h2>
              <p className="text-gray-300 text-sm">
                {`Bem-vindo à área de membros de ${displayName}`}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="px-4 sm:px-6 lg:px-8 pt-6 lg:pt-8 max-w-6xl mx-auto">
          <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white mb-1">
            {greeting}, {firstName}
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            {`Bem-vindo à área de membros de ${displayName}`}
          </p>
        </div>
      )}
      <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-6xl mx-auto">

        {userLoading || loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Search + category filters */}
            {(allCourses.length > 3 || categories.length > 0) && (
              <div className="space-y-3 mb-8">
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Buscar cursos..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] text-gray-900 dark:text-white text-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  />
                </div>
                {categories.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => setActiveCategory(null)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        !activeCategory
                          ? "bg-gray-900 text-white dark:bg-white/15 dark:text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/[0.04] dark:text-gray-400 dark:hover:bg-white/[0.08]"
                      }`}
                    >
                      Todos
                    </button>
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                          activeCategory === cat
                            ? "bg-gray-900 text-white dark:bg-white/15 dark:text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/[0.04] dark:text-gray-400 dark:hover:bg-white/[0.08]"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* No results */}
            {noResults && (
              <div className="flex flex-col items-center py-16 text-center">
                <svg className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
                </svg>
                <p className="text-gray-500 dark:text-gray-400">
                  Nenhum curso encontrado para &ldquo;{search || activeCategory}&rdquo;
                </p>
                <button
                  onClick={() => { setSearch(""); setActiveCategory(null); }}
                  className="text-sm text-blue-500 dark:text-blue-400 mt-2 hover:underline"
                >
                  Limpar filtros
                </button>
              </div>
            )}

            {/* Active courses */}
            {!noResults && (
              <>
                {showGrouped ? (
                  activeGroups.map((group) => (
                    <section key={group.key || "__none"} className="mb-10">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        {group.label}
                      </h3>
                      <div className={gridCols(group.items.length)}>
                        {group.items.map((course) => (
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
                            featured={course.featured}
                            manageHref={
                              course.canManage
                                ? `/producer/courses/${course.id}/edit`
                                : undefined
                            }
                          />
                        ))}
                      </div>
                    </section>
                  ))
                ) : active.length > 0 ? (
                  <section className="mb-10">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Meus cursos
                    </h3>
                    <div className={gridCols(active.length)}>
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
                          featured={course.featured}
                          manageHref={
                            course.canManage
                              ? `/producer/courses/${course.id}/edit`
                              : undefined
                          }
                        />
                      ))}
                    </div>
                  </section>
                ) : !hasFilters ? (
                  <section className="mb-10">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Meus cursos
                    </h3>
                    <div className="flex flex-col items-center py-12 text-center bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl">
                      <svg className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                      <p className="text-gray-500 dark:text-gray-400">
                        Você ainda não está matriculado em nenhum curso
                      </p>
                      {store.length > 0 && (
                        <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
                          Explore os cursos disponíveis abaixo
                        </p>
                      )}
                    </div>
                  </section>
                ) : null}

                {expired.length > 0 && (
                  <section className="mb-10">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                      Acesso expirado
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                      Renove para continuar assistindo a estes cursos.
                    </p>
                    <div className={gridCols(expired.length)}>
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

                {filteredStore.length > 0 && (
                  <section>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Outros cursos
                    </h3>
                    <div className={gridCols(filteredStore.length)}>
                      {filteredStore.map((course) => (
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
                          featured={course.featured}
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
          </>
        )}
      </div>
    </div>
  );
}
