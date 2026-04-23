"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CourseEditTabs } from "@/components/course-edit-tabs";

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

interface Customization {
  memberBgColor: string | null;
  memberSidebarColor: string | null;
  memberHeaderColor: string | null;
  memberCardColor: string | null;
  memberPrimaryColor: string | null;
  memberTextColor: string | null;
  memberAccentColor: string | null;
  memberWelcomeText: string | null;
  memberLayoutStyle: string | null;
}

const EMPTY: Customization = {
  memberBgColor: null,
  memberSidebarColor: null,
  memberHeaderColor: null,
  memberCardColor: null,
  memberPrimaryColor: null,
  memberTextColor: null,
  memberAccentColor: null,
  memberWelcomeText: null,
  memberLayoutStyle: "netflix",
};

const COLOR_FIELDS: Array<{
  key: keyof Customization;
  label: string;
  description: string;
}> = [
  { key: "memberBgColor", label: "Cor de fundo", description: "Background principal" },
  { key: "memberHeaderColor", label: "Cor do cabeçalho", description: "Background do header" },
  { key: "memberSidebarColor", label: "Cor da barra lateral", description: "Background da sidebar" },
  { key: "memberCardColor", label: "Cor dos cards", description: "Background dos cards" },
  { key: "memberPrimaryColor", label: "Cor primária", description: "Botões, links, progresso" },
  { key: "memberTextColor", label: "Cor do texto", description: "Texto principal" },
];

const LAYOUTS = [
  {
    value: "netflix",
    label: "Netflix",
    description: "Carrossel horizontal",
  },
  {
    value: "grid",
    label: "Grade",
    description: "Cards em grid responsivo",
  },
  {
    value: "list",
    label: "Lista",
    description: "Lista vertical detalhada",
  },
] as const;

export default function CourseCustomizePage({
  params,
}: {
  params: { id: string };
}) {
  const [courseTitle, setCourseTitle] = useState("");
  const [courseSlug, setCourseSlug] = useState("");
  const [custom, setCustom] = useState<Customization>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  }

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const [courseRes, customRes] = await Promise.all([
          fetch(`/api/courses/${params.id}`),
          fetch(`/api/producer/courses/${params.id}/customize`),
        ]);
        if (!alive) return;
        if (courseRes.ok) {
          const courseData = await courseRes.json();
          setCourseTitle(courseData.course.title);
          setCourseSlug(courseData.course.slug);
        }
        if (customRes.ok) {
          const d = await customRes.json();
          setCustom({ ...EMPTY, ...d.customization });
        }
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => { alive = false; };
  }, [params.id]);

  function buildPayload() {
    const payload: Record<string, unknown> = {};
    for (const key of Object.keys(custom) as (keyof Customization)[]) {
      const val = custom[key];
      if (COLOR_FIELDS.some((f) => f.key === key)) {
        if (val && typeof val === "string" && HEX_RE.test(val)) {
          payload[key] = val;
        } else {
          payload[key] = null;
        }
      } else {
        payload[key] = val;
      }
    }
    return payload;
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/producer/courses/${params.id}/customize`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      if (res.ok) {
        const d = await res.json();
        setCustom({ ...EMPTY, ...d.customization });
        showToast("Personalização salva");
      } else {
        const d = await res.json().catch(() => ({}));
        showToast(d.error || "Erro ao salvar");
      }
    } catch {
      showToast("Erro de rede");
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    if (!confirm("Restaurar todas as configurações para o padrão?")) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/producer/courses/${params.id}/customize`, { method: "DELETE" });
      if (res.ok) {
        const d = await res.json();
        setCustom({ ...EMPTY, ...d.customization });
        showToast("Personalização restaurada");
      }
    } catch {
      showToast("Erro de rede");
    } finally {
      setSaving(false);
    }
  }

  function updateField(key: keyof Customization, value: string | null) {
    setCustom((prev) => ({ ...prev, [key]: value }));
  }

  const currentLayout = custom.memberLayoutStyle || "netflix";

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
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                /{courseSlug}
              </p>
            )}
          </div>
          {courseSlug && (
            <a
              href={`/course/${courseSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-300 dark:border-white/[0.08] rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Pré-visualizar
            </a>
          )}
        </div>
      </div>

      <CourseEditTabs courseId={params.id} active="customize" />

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 bg-gray-100 dark:bg-gray-900 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Layout */}
          <section className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-6">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
              Layout dos cursos
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Como seus cursos aparecem para os alunos
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {LAYOUTS.map((layout) => {
                const selected = currentLayout === layout.value;
                const isDefault = layout.value === "netflix";
                return (
                  <button
                    key={layout.value}
                    type="button"
                    onClick={() => updateField("memberLayoutStyle", layout.value)}
                    className={`relative text-left p-4 rounded-xl border-2 transition-colors ${
                      selected
                        ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10"
                        : "border-[#1a1e2e] hover:border-gray-400 dark:hover:border-gray-600"
                    }`}
                  >
                    {selected && isDefault && (
                      <span className="absolute top-2 right-2 px-1.5 py-0.5 text-[10px] font-semibold bg-indigo-500 text-white rounded">
                        Atual
                      </span>
                    )}
                    <div className="mb-3 h-12 flex items-center">
                      {layout.value === "netflix" ? (
                        <div className="flex items-center gap-1 w-full">
                          <svg className="w-3 h-3 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                          <div className="flex gap-1.5 flex-1 overflow-hidden">
                            {[1,2,3,4].map(i => (
                              <div key={i} className="w-14 h-9 rounded bg-gray-200 dark:bg-gray-700 shrink-0" />
                            ))}
                          </div>
                          <svg className="w-3 h-3 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      ) : layout.value === "grid" ? (
                        <div className="grid grid-cols-3 gap-1.5 w-full">
                          {[1,2,3].map(i => (
                            <div key={i} className="h-10 rounded bg-gray-200 dark:bg-gray-700" />
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-1.5 w-full">
                          {[1,2,3].map(i => (
                            <div key={i} className="flex gap-2 items-center">
                              <div className="w-12 h-6 rounded bg-gray-200 dark:bg-gray-700 shrink-0" />
                              <div className="flex-1 h-3 rounded bg-gray-200 dark:bg-gray-700" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{layout.label}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{layout.description}</p>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Colors */}
          <section className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-6">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
              Cores da área de membros
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Personalize as cores que seus alunos veem
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {COLOR_FIELDS.map((field) => (
                <ColorPicker
                  key={field.key}
                  label={field.label}
                  description={field.description}
                  value={(custom[field.key] as string) || ""}
                  onChange={(v) => updateField(field.key, v || null)}
                />
              ))}
            </div>
          </section>

          {/* Welcome text */}
          <section className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-6">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
              Mensagem de boas-vindas
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Texto exibido para o aluno ao entrar na área de membros
            </p>
            <textarea
              value={custom.memberWelcomeText || ""}
              onChange={(e) => updateField("memberWelcomeText", e.target.value.slice(0, 500) || null)}
              placeholder="Bem-vindo à nossa comunidade!"
              rows={3}
              maxLength={500}
              className="w-full px-3 py-2.5 bg-gray-50 dark:bg-white/[0.04] border border-gray-300 dark:border-white/[0.08] rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 resize-y"
            />
            <p className="text-xs text-gray-400 mt-1">
              {(custom.memberWelcomeText || "").length}/500 caracteres
            </p>
          </section>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition disabled:opacity-50"
            >
              {saving ? "Salvando..." : "Salvar personalização"}
            </button>
            <button
              type="button"
              onClick={handleReset}
              disabled={saving}
              className="px-5 py-2.5 bg-gray-100 dark:bg-white/[0.06] hover:bg-gray-200 dark:hover:bg-white/[0.1] text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl transition disabled:opacity-50"
            >
              Restaurar padrão
            </button>
          </div>
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

function ColorPicker({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{label}</p>
      <p className="text-[11px] text-gray-500 dark:text-gray-500">{description}</p>
      <div className="flex items-center gap-2">
        <label
          className="w-10 h-10 rounded-lg border border-gray-300 dark:border-white/[0.1] shrink-0 overflow-hidden relative cursor-pointer"
          style={{ backgroundColor: HEX_RE.test(value) ? value : "#6366f1" }}
        >
          <input
            type="color"
            value={HEX_RE.test(value) ? value : "#6366f1"}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </label>
        <input
          type="text"
          value={value}
          onChange={(e) => {
            const v = e.target.value;
            if (v.length <= 7) onChange(v);
          }}
          onBlur={(e) => {
            const v = e.target.value;
            if (v && !HEX_RE.test(v)) {
              const fixed = v.startsWith("#") ? v : `#${v}`;
              if (HEX_RE.test(fixed)) onChange(fixed);
              else onChange("");
            }
          }}
          className="flex-1 min-w-0 px-3 py-2 bg-gray-50 dark:bg-white/[0.04] border border-gray-300 dark:border-white/[0.08] rounded-xl text-sm text-gray-900 dark:text-white font-mono focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20"
          placeholder="#6366f1"
          maxLength={7}
        />
      </div>
    </div>
  );
}
