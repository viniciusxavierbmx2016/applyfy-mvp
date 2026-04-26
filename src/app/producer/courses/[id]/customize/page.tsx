"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CourseMenuManager } from "@/components/course-menu-manager";
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
}> = [
  { key: "memberBgColor", label: "Fundo" },
  { key: "memberHeaderColor", label: "Cabeçalho" },
  { key: "memberSidebarColor", label: "Sidebar" },
  { key: "memberCardColor", label: "Cards" },
  { key: "memberPrimaryColor", label: "Primária" },
  { key: "memberTextColor", label: "Texto" },
];

const LAYOUTS = [
  { value: "netflix", label: "Carrossel" },
  { value: "list", label: "Lista" },
] as const;

interface CourseFlags {
  communityEnabled: boolean;
  lessonCommentsEnabled: boolean;
  lessonReactionsEnabled: boolean;
  reviewsEnabled: boolean;
  certificateEnabled: boolean;
  gamificationEnabled: boolean;
  showStudentCount: boolean;
  showLessonSupport: boolean;
}

type FlagKey = keyof CourseFlags;

const FEATURE_ITEMS: Array<{
  key: FlagKey;
  title: string;
  description: string;
}> = [
  { key: "communityEnabled", title: "Comunidade do curso", description: "Alunos criam posts e interagem entre si" },
  { key: "lessonCommentsEnabled", title: "Comentários nas aulas", description: "Alunos comentam em cada aula" },
  { key: "lessonReactionsEnabled", title: "Reações nas aulas", description: "Alunos podem dar gostei/não gostei nas aulas" },
  { key: "reviewsEnabled", title: "Avaliações e reviews", description: "Alunos avaliam o curso com estrelas" },
  { key: "certificateEnabled", title: "Certificado de conclusão", description: "PDF gerado ao concluir 100%" },
  { key: "gamificationEnabled", title: "Pontos e níveis", description: "Pontos ao concluir aulas e interagir" },
  { key: "showStudentCount", title: "Exibir quantidade de alunos", description: "Mostra matriculados na página do curso" },
  { key: "showLessonSupport", title: "Suporte nas aulas", description: "Email e WhatsApp abaixo de cada aula" },
];

export default function CourseCustomizePage() {
  const params = useParams<{ id: string }>();
  const courseId = params.id;

  const [custom, setCustom] = useState<Customization>(EMPTY);
  const [savedLayout, setSavedLayout] = useState("netflix");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; error?: boolean } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [flags, setFlags] = useState<CourseFlags | null>(null);
  const [savingFlag, setSavingFlag] = useState<FlagKey | null>(null);
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
          const c = courseData.course;
          setFlags({
            communityEnabled: Boolean(c.communityEnabled),
            lessonCommentsEnabled: Boolean(c.lessonCommentsEnabled),
            lessonReactionsEnabled: c.lessonReactionsEnabled !== false,
            reviewsEnabled: Boolean(c.reviewsEnabled),
            certificateEnabled: Boolean(c.certificateEnabled),
            gamificationEnabled: Boolean(c.gamificationEnabled),
            showStudentCount: Boolean(c.showStudentCount),
            showLessonSupport: c.showLessonSupport !== false,
          });
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

  async function toggleFlag(key: FlagKey) {
    if (!flags || savingFlag) return;
    const prev = flags[key];
    const next = !prev;
    setFlags({ ...flags, [key]: next });
    setSavingFlag(key);
    try {
      const res = await fetch(`/api/courses/${courseId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: next }),
      });
      if (!res.ok) throw new Error("fail");
      showToast("Configuração atualizada");
    } catch {
      setFlags((f) => (f ? { ...f, [key]: prev } : f));
      showToast("Erro ao salvar", true);
    } finally {
      setSavingFlag(null);
    }
  }

  const currentLayout = custom.memberLayoutStyle || "netflix";

  return (
    <>
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
        <div className="pb-20">
          {/* SEÇÃO 1 — Layout dos módulos */}
          <div className="mb-8">
            <h2 className="text-sm font-medium text-gray-900 dark:text-white mb-0.5">Layout dos módulos</h2>
            <p className="text-xs text-gray-500 mb-4">Escolha como os módulos são exibidos para o aluno</p>

            <div className="flex gap-3">
              {LAYOUTS.map((layout) => {
                const selected = currentLayout === layout.value;
                const isSaved = savedLayout === layout.value;
                return (
                  <button
                    key={layout.value}
                    type="button"
                    onClick={() => updateField("memberLayoutStyle", layout.value)}
                    className={`relative flex-1 text-left p-4 rounded-xl transition-colors ${
                      selected
                        ? "border-2 border-blue-500 bg-blue-500/5"
                        : "border border-gray-200 dark:border-white/10 hover:border-gray-400 dark:hover:border-white/20"
                    }`}
                  >
                    {isSaved && (
                      <span className="absolute top-2 right-2 px-1.5 py-0.5 text-[10px] font-semibold bg-blue-600 text-white rounded">
                        Atual
                      </span>
                    )}
                    <div className="mb-3 rounded-lg bg-gray-100 dark:bg-[#141416] p-3 h-28 flex flex-col justify-center overflow-hidden">
                      {layout.value === "netflix" ? (
                        <div className="space-y-2">
                          <div className="h-1.5 w-10 rounded-full bg-gray-300 dark:bg-gray-600" />
                          <div className="flex items-center gap-1">
                            <svg className="w-2.5 h-2.5 text-gray-400 dark:text-gray-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                            <div className="flex gap-1.5 flex-1 overflow-hidden">
                              {[1,2,3,4].map(i => (
                                <div key={i} className="w-10 h-14 rounded-md bg-gray-300 dark:bg-gradient-to-b dark:from-gray-600 dark:to-gray-700 shrink-0" />
                              ))}
                            </div>
                            <svg className="w-2.5 h-2.5 text-gray-400 dark:text-gray-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {[1,2,3].map(i => (
                            <div key={i} className="flex items-center gap-2 py-1 px-2 rounded-md bg-white/60 dark:bg-white/[0.03]">
                              <div className="w-6 h-8 rounded-sm bg-gray-300 dark:bg-gradient-to-b dark:from-gray-600 dark:to-gray-700 shrink-0" />
                              <div className="flex-1 min-w-0 space-y-1">
                                <div className="h-1.5 rounded-full bg-gray-300 dark:bg-gray-500" style={{width: `${40 + i * 12}px`}} />
                                <div className="h-1 w-8 rounded-full bg-gray-200 dark:bg-gray-700" />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{layout.label}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* SEÇÃO 2 — Cores */}
          <div className="mb-8 pt-8 border-t border-gray-200 dark:border-white/5">
            <h2 className="text-sm font-medium text-gray-900 dark:text-white mb-0.5">Cores da área de membros</h2>
            <p className="text-xs text-gray-500 mb-4">Personalize as cores que os alunos veem dentro do curso</p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {COLOR_FIELDS.map((field) => {
                const val = (custom[field.key] as string) || "";
                const displayHex = HEX_RE.test(val) ? val : "#3b82f6";
                return (
                  <label
                    key={field.key}
                    className="flex items-center gap-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg p-3 cursor-pointer hover:border-gray-300 dark:hover:border-white/20 transition-colors"
                  >
                    <span
                      className="w-7 h-7 rounded-md shrink-0 border border-gray-200 dark:border-white/10 relative overflow-hidden"
                      style={{ backgroundColor: displayHex }}
                    >
                      <input
                        type="color"
                        value={displayHex}
                        onChange={(e) => updateField(field.key, e.target.value)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[11px] text-gray-600 dark:text-gray-400 leading-tight">{field.label}</p>
                      <p className="text-xs font-mono text-gray-400 dark:text-gray-500">{HEX_RE.test(val) ? val : "padrão"}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* SEÇÃO 3 — Mensagem de boas-vindas */}
          <div className="mb-8 pt-8 border-t border-gray-200 dark:border-white/5">
            <h2 className="text-sm font-medium text-gray-900 dark:text-white mb-0.5">Mensagem de boas-vindas</h2>
            <p className="text-xs text-gray-500 mb-4">Texto exibido para o aluno ao entrar na área de membros</p>

            <textarea
              value={custom.memberWelcomeText || ""}
              onChange={(e) => updateField("memberWelcomeText", e.target.value.slice(0, 500) || null)}
              placeholder="Bem-vindo à nossa comunidade!"
              rows={3}
              maxLength={500}
              className="w-full px-3 py-2.5 bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-white/10 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-colors resize-y min-h-[80px]"
            />
            <p className="text-xs text-gray-400 mt-1 text-right">
              {(custom.memberWelcomeText || "").length}/500
            </p>
          </div>

          {/* SEÇÃO 4 — Funcionalidades */}
          <div className="mb-8 pt-8 border-t border-gray-200 dark:border-white/5">
            <h2 className="text-sm font-medium text-gray-900 dark:text-white mb-0.5">Funcionalidades</h2>
            <p className="text-xs text-gray-500 mb-4">Ative ou desative recursos do curso</p>

            {flags ? (
              <div className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden">
                {FEATURE_ITEMS.map((item, idx) => {
                  const enabled = flags[item.key];
                  const isSaving = savingFlag === item.key;
                  return (
                    <div
                      key={item.key}
                      className={`flex items-center justify-between px-4 py-3 ${
                        idx < FEATURE_ITEMS.length - 1 ? "border-b border-gray-200 dark:border-white/5" : ""
                      }`}
                    >
                      <div className="min-w-0 mr-3">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{item.title}</p>
                        <p className="text-[11px] text-gray-500">{item.description}</p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={enabled}
                        aria-label={item.title}
                        disabled={isSaving}
                        onClick={() => toggleFlag(item.key)}
                        className={`relative shrink-0 inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                          enabled ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-700"
                        } ${isSaving ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
                      >
                        <span
                          className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                            enabled ? "translate-x-[18px]" : "translate-x-0.5"
                          }`}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-14 rounded-xl bg-gray-100 dark:bg-white/[0.04] animate-pulse" />
                ))}
              </div>
            )}
          </div>

          {/* SEÇÃO 5 — Menu lateral */}
          <div className="pt-8 border-t border-gray-200 dark:border-white/5">
            <h2 className="text-sm font-medium text-gray-900 dark:text-white mb-0.5">Menu lateral do curso</h2>
            <p className="text-xs text-gray-500 mb-4">Itens que aparecem na sidebar do aluno</p>
            <CourseMenuManager courseId={courseId} />
          </div>

          {/* Footer sticky */}
          <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm border-t border-gray-200 dark:border-white/10">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex justify-end gap-3">
              <button
                type="button"
                onClick={handleReset}
                disabled={saving}
                className="px-4 py-2 border border-red-300 dark:border-red-500/30 hover:bg-red-50 dark:hover:bg-red-500/10 text-red-600 dark:text-red-400 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                Restaurar padrão
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {saving ? "Salvando..." : "Salvar personalização"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-16 right-6 z-50 px-4 py-3 rounded-lg shadow-2xl text-sm font-medium ${
          toast.error
            ? "bg-red-600 text-white"
            : "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
        }`}>
          {toast.msg}
        </div>
      )}
      <ConfirmDialog />
    </>
  );
}
