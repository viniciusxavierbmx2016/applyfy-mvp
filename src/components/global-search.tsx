"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

interface CourseHit {
  id: string;
  title: string;
  slug: string;
  thumbnail: string | null;
}
interface LessonHit {
  id: string;
  title: string;
  courseSlug: string;
  courseTitle: string;
}
interface PostHit {
  id: string;
  snippet: string;
  authorName: string;
  courseSlug: string;
  courseTitle: string;
}
interface Results {
  courses: CourseHit[];
  lessons: LessonHit[];
  posts: PostHit[];
}

const EMPTY: Results = { courses: [], lessons: [], posts: [] };

export function GlobalSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Results>(EMPTY);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setResults(EMPTY);
      setLoading(false);
      abortRef.current?.abort();
      return;
    }

    setLoading(true);
    const handle = setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`, {
          signal: ctrl.signal,
          cache: "no-store",
        });
        if (res.ok) {
          const data = await res.json();
          setResults({
            courses: data.courses || [],
            lessons: data.lessons || [],
            posts: data.posts || [],
          });
        }
      } catch (e) {
        if ((e as Error).name !== "AbortError") setResults(EMPTY);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(handle);
  }, [q]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  function go(path: string) {
    setOpen(false);
    setQ("");
    router.push(path);
  }

  const term = q.trim();
  const total =
    results.courses.length + results.lessons.length + results.posts.length;
  const showDropdown = open && term.length >= 2;

  return (
    <div className="relative w-full" ref={ref}>
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <input
        type="text"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Buscar cursos, aulas, posts..."
        className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />

      {showDropdown && (
        <div className="absolute left-0 right-0 mt-2 max-h-[70vh] overflow-y-auto bg-gray-900 border border-gray-800 rounded-xl shadow-2xl z-50">
          {loading && total === 0 ? (
            <div className="p-6 text-center text-sm text-gray-500">
              Buscando...
            </div>
          ) : total === 0 ? (
            <div className="p-6 text-center text-sm text-gray-500">
              Nenhum resultado para &ldquo;{term}&rdquo;
            </div>
          ) : (
            <div className="py-2">
              {results.courses.length > 0 && (
                <Section title="Cursos">
                  {results.courses.map((c) => (
                    <ResultItem
                      key={c.id}
                      icon={<CourseIcon />}
                      title={c.title}
                      subtitle="Curso"
                      onClick={() => go(`/course/${c.slug}`)}
                    />
                  ))}
                </Section>
              )}
              {results.lessons.length > 0 && (
                <Section title="Aulas">
                  {results.lessons.map((l) => (
                    <ResultItem
                      key={l.id}
                      icon={<LessonIcon />}
                      title={l.title}
                      subtitle={l.courseTitle}
                      onClick={() =>
                        go(`/course/${l.courseSlug}/lesson/${l.id}`)
                      }
                    />
                  ))}
                </Section>
              )}
              {results.posts.length > 0 && (
                <Section title="Comunidade">
                  {results.posts.map((p) => (
                    <ResultItem
                      key={p.id}
                      icon={<PostIcon />}
                      title={p.snippet || "(sem texto)"}
                      subtitle={`${p.authorName} · ${p.courseTitle}`}
                      onClick={() => go(`/course/${p.courseSlug}/community`)}
                    />
                  ))}
                </Section>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-1">
      <div className="px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
        {title}
      </div>
      <ul>{children}</ul>
    </div>
  );
}

function ResultItem({
  icon,
  title,
  subtitle,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="w-full flex items-start gap-3 px-4 py-2.5 text-left hover:bg-gray-800/60 transition"
      >
        <span className="mt-0.5 w-7 h-7 shrink-0 rounded-lg bg-gray-800 text-gray-300 flex items-center justify-center">
          {icon}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-white line-clamp-1">{title}</p>
          <p className="text-xs text-gray-500 line-clamp-1">{subtitle}</p>
        </div>
      </button>
    </li>
  );
}

function CourseIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.25V20M12 6.25C10.83 5.47 8.97 5 7 5c-1.97 0-3.83.47-5 1.25v13.5C3.17 18.97 5.03 18.5 7 18.5c1.97 0 3.83.47 5 1.5m0-13.75c1.17-.78 3.03-1.25 5-1.25 1.97 0 3.83.47 5 1.25v13.5c-1.17-.78-3.03-1.25-5-1.25-1.97 0-3.83.47-5 1.5" />
    </svg>
  );
}
function LessonIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.75 9.75L18 12l-3.25 2.25M9.25 14.25L6 12l3.25-2.25M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
    </svg>
  );
}
function PostIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
