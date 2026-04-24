"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { CourseEditTabs } from "@/components/course-edit-tabs";
import { useConfirm } from "@/hooks/use-confirm";

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

interface Customization {
  memberBgColor: string | null;
  memberSidebarColor: string | null;
  memberHeaderColor: string | null;
  memberCardColor: string | null;
  memberPrimaryColor: string | null;
  memberTextColor: string | null;
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
    value: "list",
    label: "Lista",
    description: "Lista vertical detalhada",
  },
] as const;

export default function CourseCustomizePage() {
  const params = useParams<{ id: string }>();
  const courseId = params.id;

  const [courseTitle, setCourseTitle] = useState("");
  const [courseSlug, setCourseSlug] = useState("");
  const [custom, setCustom] = useState<Customization>(EMPTY);
  const [savedLayout, setSavedLayout] = useState("netflix");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; error?: boolean } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { confirm, ConfirmDialog } = useConfirm();

  function showToast(msg: string, error = false) {
    setToast({ msg, error });
    setTimeout(() => setToast(null), error ? 4000 : 2600);
  }

  useEffect(() => {
    if (!courseId) return;
    let alive = true;
    async function load() {
      try {
        const courseRes = await fetch(`/api/courses/${courseId}`);
        if (!alive) return;
        if (courseRes.ok) {
          const courseData = await courseRes.json();
          setCourseTitle(courseData.course.title);
          setCourseSlug(courseData.course.slug);
        }
        const customRes = await fetch(`/api/producer/courses/${courseId}/customize`);
        console.log("[customize] GET status:", customRes.status);
        if (!alive) return;
        if (customRes.ok) {
          const d = await customRes.json();
          const merged = { ...EMPTY, ...d.customization };
          setCustom(merged);
          setSavedLayout(merged.memberLayoutStyle || "netflix");
        } else {
          const errBody = await customRes.json().catch(() => ({}));
          console.error("[customize] GET error:", customRes.status, errBody);
          setLoadError(errBody.error || `Erro ${customRes.status} ao carregar personalização`);
        }
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => { alive = false; };
  }, [courseId]);

  function sanitizeForSave(): Record<string, unknown> {
    const payload: Record<string, unknown> = {};
    for (const field of COLOR_FIELDS) {
      const val = custom[field.key];
      payload[field.key] = typeof val === "string" && HEX_RE.test(val) ? val : null;
    }
    payload.memberLayoutStyle = custom.memberLayoutStyle || "netflix";
    payload.memberWelcomeText = custom.memberWelcomeText || null;
    return payload;
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/producer/courses/${courseId}/customize`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sanitizeForSave()),
      });
      console.log("[customize] PUT status:", res.status);
      if (res.ok) {
        const d = await res.json();
        const merged = { ...EMPTY, ...d.customization };
        setCustom(merged);
        setSavedLayout(merged.memberLayoutStyle || "netflix");
        showToast("Personalização salva");
      } else {
        const d = await res.json().catch(() => ({}));
        console.error("[customize] PUT error:", res.status, d);
        showToast(d.error || "Erro ao salvar", true);
      }
    } catch (err) {
      console.error("[customize] PUT network error:", err);
      showToast("Erro de rede", true);
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    if (!(await confirm({ title: "Restaurar padrão", message: "Restaurar todas as configurações para o padrão?", variant: "warning", confirmText: "Restaurar" }))) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/producer/courses/${courseId}/customize`, { method: "DELETE" });
      if (res.ok) {
        const d = await res.json();
        const merged = { ...EMPTY, ...d.customization };
        setCustom(merged);
        setSavedLayout(merged.memberLayoutStyle || "netflix");
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

      <CourseEditTabs courseId={courseId} active="customize" />

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-32 bg-gray-100 dark:bg-gray-900 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : loadError ? (
        <div className="bg-red-50 dark:bg-red-500/5 border border-red-200 dark:border-red-500/20 rounded-xl p-6 text-center">
          <p className="text-red-700 dark:text-red-400 font-medium mb-1">Erro ao carregar personalização</p>
          <p className="text-sm text-red-600 dark:text-red-300">{loadError}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-3 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
          >
            Tentar novamente
          </button>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {LAYOUTS.map((layout) => {
                const selected = currentLayout === layout.value;
                const isSaved = savedLayout === layout.value;
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
                    {isSaved && (
                      <span className="absolute top-2 right-2 px-1.5 py-0.5 text-[10px] font-semibold bg-indigo-500 text-white rounded">
                        Atual
                      </span>
                    )}
                    <div className="mb-3 rounded-lg bg-[#141416] p-3 h-40 flex flex-col justify-center overflow-hidden">
                      {layout.value === "netflix" ? (
                        <div className="space-y-3">
                          <div>
                            <div className="h-1.5 w-10 rounded-full bg-gray-600 mb-2" />
                            <div className="flex items-center gap-1">
                              <svg className="w-2.5 h-2.5 text-gray-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                              <div className="flex gap-1.5 flex-1 overflow-hidden">
                                {[1,2,3,4,5].map(i => (
                                  <div key={i} className="w-10 h-16 rounded-md bg-gradient-to-b from-gray-600 to-gray-700 shrink-0" />
                                ))}
                              </div>
                              <svg className="w-2.5 h-2.5 text-gray-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                            </div>
                          </div>
                          <div className="opacity-50">
                            <div className="h-1.5 w-8 rounded-full bg-gray-600 mb-1.5" />
                            <div className="flex gap-1.5 overflow-hidden">
                              {[1,2,3,4,5].map(i => (
                                <div key={i} className="w-8 h-12 rounded-sm bg-gradient-to-b from-gray-700 to-gray-800 shrink-0" />
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2 py-1.5 px-2 rounded-md bg-white/[0.03]">
                            <div className="w-7 h-10 rounded-sm bg-gradient-to-b from-gray-600 to-gray-700 shrink-0" />
                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="h-1.5 w-16 rounded-full bg-gray-500" />
                              <div className="h-1 w-10 rounded-full bg-gray-700" />
                              <div className="h-0.5 w-full rounded-full bg-gray-800"><div className="h-full w-3/4 rounded-full bg-gray-500" /></div>
                            </div>
                            <svg className="w-2.5 h-2.5 text-gray-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                          </div>
                          <div className="rounded-md bg-white/[0.03]">
                            <div className="flex items-center gap-2 py-1.5 px-2">
                              <div className="w-7 h-10 rounded-sm bg-gradient-to-b from-gray-600 to-gray-700 shrink-0" />
                              <div className="flex-1 min-w-0 space-y-1">
                                <div className="h-1.5 w-20 rounded-full bg-gray-500" />
                                <div className="h-1 w-12 rounded-full bg-gray-700" />
                              </div>
                              <svg className="w-2.5 h-2.5 text-gray-600 shrink-0 rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                            </div>
                            <div className="ml-9 pb-1.5 space-y-1">
                              {[1,2,3].map(i => (
                                <div key={i} className="flex items-center gap-1.5 py-0.5 px-2">
                                  <div className={`w-2 h-2 rounded-full shrink-0 ${i === 1 ? "bg-emerald-500" : "border border-gray-600"}`} />
                                  <div className="h-1 rounded-full bg-gray-700" style={{width: `${50 + i * 10}px`}} />
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 py-1.5 px-2 rounded-md bg-white/[0.03] opacity-60">
                            <div className="w-7 h-10 rounded-sm bg-gradient-to-b from-gray-700 to-gray-800 shrink-0" />
                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="h-1.5 w-14 rounded-full bg-gray-600" />
                              <div className="h-1 w-8 rounded-full bg-gray-700" />
                            </div>
                            <svg className="w-2.5 h-2.5 text-gray-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                          </div>
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
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-2xl text-sm font-medium ${
          toast.error
            ? "bg-red-600 text-white"
            : "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
        }`}>
          {toast.msg}
        </div>
      )}
      <ConfirmDialog />
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
          className="w-10 h-10 rounded-lg border border-gray-300 dark:border-white/[0.1] shrink-0 overflow-hidden relative cursor-pointer block"
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
