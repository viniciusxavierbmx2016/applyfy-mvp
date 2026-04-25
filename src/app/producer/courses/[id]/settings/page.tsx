"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CourseEditTabs } from "@/components/course-edit-tabs";

interface CourseFlags {
  communityEnabled: boolean;
  lessonCommentsEnabled: boolean;
  reviewsEnabled: boolean;
  certificateEnabled: boolean;
  gamificationEnabled: boolean;
  showStudentCount: boolean;
  showLessonSupport: boolean;
}

type FlagKey = keyof CourseFlags;

interface SettingItem {
  key: FlagKey;
  title: string;
  description: string;
  disabledHint: string;
  icon: React.ReactNode;
}

const ITEMS: SettingItem[] = [
  {
    key: "communityEnabled",
    title: "Comunidade do curso",
    description:
      "Permite que alunos criem posts, comentem e interajam entre si dentro do curso.",
    disabledHint: "Desativado — alunos não verão a aba de comunidade.",
    icon: <ChatIcon />,
  },
  {
    key: "lessonCommentsEnabled",
    title: "Comentários nas aulas",
    description: "Permite que alunos comentem em cada aula individualmente.",
    disabledHint: "Desativado — o painel de comentários das aulas ficará oculto.",
    icon: <MessageIcon />,
  },
  {
    key: "reviewsEnabled",
    title: "Avaliações e reviews",
    description:
      "Permite que alunos avaliem o curso com estrelas e comentários.",
    disabledHint: "Desativado — alunos não poderão avaliar o curso.",
    icon: <StarIcon />,
  },
  {
    key: "certificateEnabled",
    title: "Certificado de conclusão",
    description:
      "Gera certificado em PDF quando o aluno conclui 100% do curso.",
    disabledHint: "Desativado — nenhum certificado será emitido.",
    icon: <DiplomaIcon />,
  },
  {
    key: "gamificationEnabled",
    title: "Pontos e níveis",
    description:
      "Alunos ganham pontos ao concluir aulas e interagir. Exibe nível no perfil.",
    disabledHint: "Desativado — pontos e níveis ficam ocultos para os alunos.",
    icon: <TrophyIcon />,
  },
  {
    key: "showStudentCount",
    title: "Exibir quantidade de alunos",
    description:
      "Mostra o número de alunos matriculados na página do curso (prova social).",
    disabledHint:
      "Desativado — a contagem de alunos não é exibida publicamente.",
    icon: <UsersIcon />,
  },
  {
    key: "showLessonSupport",
    title: "Suporte nas aulas",
    description:
      "Exibe a aba de suporte com email e WhatsApp abaixo de cada aula.",
    disabledHint: "Desativado — a aba de suporte não aparecerá nas aulas.",
    icon: <HeadphonesIcon />,
  },
];

export default function CourseSettingsPage({
  params,
}: {
  params: { id: string };
}) {
  const [flags, setFlags] = useState<CourseFlags | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<FlagKey | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [courseTitle, setCourseTitle] = useState("");
  const [courseSlug, setCourseSlug] = useState("");

  useEffect(() => {
    let alive = true;
    fetch(`/api/courses/${params.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!alive || !data?.course) return;
        const c = data.course;
        setCourseTitle(c.title);
        setCourseSlug(c.slug);
        setFlags({
          communityEnabled: Boolean(c.communityEnabled),
          lessonCommentsEnabled: Boolean(c.lessonCommentsEnabled),
          reviewsEnabled: Boolean(c.reviewsEnabled),
          certificateEnabled: Boolean(c.certificateEnabled),
          gamificationEnabled: Boolean(c.gamificationEnabled),
          showStudentCount: Boolean(c.showStudentCount),
          showLessonSupport: c.showLessonSupport !== false,
        });
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [params.id]);

  async function toggleFlag(key: FlagKey) {
    if (!flags || savingKey) return;
    const prev = flags[key];
    const next = !prev;
    setFlags({ ...flags, [key]: next });
    setSavingKey(key);
    try {
      const res = await fetch(`/api/courses/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: next }),
      });
      if (!res.ok) throw new Error("fail");
      showToast("Configuração atualizada");
    } catch {
      setFlags((f) => (f ? { ...f, [key]: prev } : f));
      showToast("Erro ao salvar. Tente novamente.");
    } finally {
      setSavingKey(null);
    }
  }

  function showToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2600);
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <Link
          href="/producer/courses"
          className="inline-flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Voltar
        </Link>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white truncate">
              {courseTitle || "Curso"}
            </h1>
            {courseSlug && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                /{courseSlug}
              </p>
            )}
          </div>
          {courseSlug && (
            <a
              href={`/course/${courseSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-2 bg-transparent dark:bg-[#1a1e2e] border border-gray-300 dark:border-[#1f2335] hover:bg-gray-100 dark:hover:bg-[#1f2335] text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl transition flex-shrink-0"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Pré-visualizar
            </a>
          )}
        </div>
      </div>

      <CourseEditTabs courseId={params.id} active="customize" />

      {loading || !flags ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-24 rounded-xl bg-gray-100 dark:bg-[#0a0e19] animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {ITEMS.map((item) => {
            const enabled = flags[item.key];
            const saving = savingKey === item.key;
            return (
              <article
                key={item.key}
                className={`flex items-start gap-4 rounded-xl border border-gray-200 dark:border-[#1a1e2e] bg-white dark:bg-[#0a0e19] p-5 transition ${
                  enabled ? "" : "opacity-70"
                }`}
              >
                <span
                  className={`shrink-0 w-10 h-10 rounded-lg inline-flex items-center justify-center ${
                    enabled
                      ? "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400"
                      : "bg-gray-100 text-gray-400 dark:bg-[#1a1e2e] dark:text-gray-500"
                  }`}
                >
                  {item.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    {item.description}
                  </p>
                  {!enabled && (
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-500">
                      {item.disabledHint}
                    </p>
                  )}
                </div>
                <Toggle
                  checked={enabled}
                  onChange={() => toggleFlag(item.key)}
                  disabled={saving}
                  label={item.title}
                />
              </article>
            );
          })}
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-4 py-3 rounded-lg shadow-2xl text-sm font-medium">
          {toast}
        </div>
      )}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={`relative shrink-0 inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-white dark:focus:ring-offset-gray-900 ${
        checked ? "bg-blue-600" : "bg-gray-300 dark:bg-[#1a1e2e]"
      } ${disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

function ChatIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-5 h-5"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function MessageIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-5 h-5"
    >
      <path d="M4 4h16c1.1 0 2 .9 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className="w-5 h-5"
    >
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function DiplomaIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-5 h-5"
    >
      <circle cx="12" cy="8" r="6" />
      <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
    </svg>
  );
}

function TrophyIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-5 h-5"
    >
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}

function HeadphonesIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-5 h-5"
    >
      <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
      <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-5 h-5"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
