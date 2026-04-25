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

const FEATURE_ITEMS: SettingItem[] = [
  { key: "communityEnabled", title: "Comunidade do curso", description: "Permite que alunos criem posts, comentem e interajam entre si dentro do curso.", disabledHint: "Desativado — alunos não verão a aba de comunidade.", icon: <ChatIcon /> },
  { key: "lessonCommentsEnabled", title: "Comentários nas aulas", description: "Permite que alunos comentem em cada aula individualmente.", disabledHint: "Desativado — o painel de comentários das aulas ficará oculto.", icon: <MessageIcon /> },
  { key: "reviewsEnabled", title: "Avaliações e reviews", description: "Permite que alunos avaliem o curso com estrelas e comentários.", disabledHint: "Desativado — alunos não poderão avaliar o curso.", icon: <StarIcon /> },
  { key: "certificateEnabled", title: "Certificado de conclusão", description: "Gera certificado em PDF quando o aluno conclui 100% do curso.", disabledHint: "Desativado — nenhum certificado será emitido.", icon: <DiplomaIcon /> },
  { key: "gamificationEnabled", title: "Pontos e níveis", description: "Alunos ganham pontos ao concluir aulas e interagir. Exibe nível no perfil.", disabledHint: "Desativado — pontos e níveis ficam ocultos para os alunos.", icon: <TrophyIcon /> },
  { key: "showStudentCount", title: "Exibir quantidade de alunos", description: "Mostra o número de alunos matriculados na página do curso (prova social).", disabledHint: "Desativado — a contagem de alunos não é exibida publicamente.", icon: <UsersIcon /> },
  { key: "showLessonSupport", title: "Suporte nas aulas", description: "Exibe a aba de suporte com email e WhatsApp abaixo de cada aula.", disabledHint: "Desativado — a aba de suporte não aparecerá nas aulas.", icon: <HeadphonesIcon /> },
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

          {/* Features / Toggles */}
          <section className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-6">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
              Funcionalidades
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Ative ou desative recursos do curso
            </p>
            {flags ? (
              <div className="space-y-3">
                {FEATURE_ITEMS.map((item) => {
                  const enabled = flags[item.key];
                  const isSaving = savingFlag === item.key;
                  return (
                    <article
                      key={item.key}
                      className={`flex items-start gap-4 rounded-xl border border-gray-200 dark:border-white/[0.06] bg-gray-50 dark:bg-white/[0.02] p-4 transition ${
                        enabled ? "" : "opacity-70"
                      }`}
                    >
                      <span
                        className={`shrink-0 w-10 h-10 rounded-lg inline-flex items-center justify-center ${
                          enabled
                            ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400"
                            : "bg-gray-100 text-gray-400 dark:bg-white/[0.06] dark:text-gray-500"
                        }`}
                      >
                        {item.icon}
                      </span>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                          {item.title}
                        </h4>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                          {item.description}
                        </p>
                        {!enabled && (
                          <p className="mt-2 text-xs text-gray-500">
                            {item.disabledHint}
                          </p>
                        )}
                      </div>
                      <FeatureToggle
                        checked={enabled}
                        onChange={() => toggleFlag(item.key)}
                        disabled={isSaving}
                        label={item.title}
                      />
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-20 rounded-xl bg-gray-100 dark:bg-white/[0.04] animate-pulse" />
                ))}
              </div>
            )}
          </section>

          {/* Menu lateral */}
          <section className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-6">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
              Menu lateral do curso
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Personalize os itens que aparecem na sidebar do aluno
            </p>
            <CourseMenuManager courseId={courseId} />
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
    </>
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

function FeatureToggle({
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
      className={`relative shrink-0 inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-white dark:focus:ring-offset-gray-900 ${
        checked ? "bg-indigo-600" : "bg-gray-300 dark:bg-white/[0.1]"
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
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function MessageIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );
}

function DiplomaIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <circle cx="12" cy="8" r="6" />
      <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
    </svg>
  );
}

function TrophyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
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
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
      <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
