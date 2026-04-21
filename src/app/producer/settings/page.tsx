"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { useProducerTheme } from "@/components/producer-theme-provider";

interface ThemeConfig {
  mode: string;
  primaryColor: string;
  secondaryColor: string;
  bgColor: string;
  headerColor: string;
  sidebarColor: string;
  cardColor: string;
  buttonTextColor: string;
}

const DEFAULTS: ThemeConfig = {
  mode: "dark",
  primaryColor: "#6366F1",
  secondaryColor: "#1a1e2e",
  bgColor: "#0a0a1a",
  headerColor: "#0a0a1a",
  sidebarColor: "#0a0a1a",
  cardColor: "#0a0e19",
  buttonTextColor: "#ffffff",
};

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

function darkenHex(hex: string, amount: number = 0.15): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (
    "#" +
    [r, g, b]
      .map((c) =>
        Math.max(0, Math.round(c * (1 - amount)))
          .toString(16)
          .padStart(2, "0")
      )
      .join("")
  );
}

export default function ProducerSettingsPage() {
  const { refresh } = useProducerTheme();
  const { setTheme: setNextTheme } = useTheme();
  const [theme, setTheme] = useState<ThemeConfig>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  }

  useEffect(() => {
    fetch("/api/producer/theme")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.theme) setTheme(d.theme);
      })
      .finally(() => setLoading(false));
  }, []);

  function applyPreview(next: ThemeConfig) {
    setTheme(next);
    const root = document.documentElement;
    root.style.setProperty("--producer-primary", next.primaryColor);
    root.style.setProperty("--producer-primary-hover", darkenHex(next.primaryColor, 0.15));
    root.style.setProperty("--producer-secondary", next.secondaryColor);
    root.style.setProperty("--producer-bg", next.bgColor);
    root.style.setProperty("--producer-header", next.headerColor);
    root.style.setProperty("--producer-sidebar", next.sidebarColor);
    root.style.setProperty("--producer-card", next.cardColor);
    root.style.setProperty("--producer-button-text", next.buttonTextColor);
    if (next.mode === "light" || next.mode === "dark") {
      setNextTheme(next.mode);
    }
  }

  function updateField(key: keyof ThemeConfig, value: string) {
    const next = { ...theme, [key]: value };
    applyPreview(next);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/producer/theme", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(theme),
      });
      if (res.ok) {
        const d = await res.json();
        setTheme(d.theme);
        refresh();
        showToast("Tema salvo com sucesso");
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
    if (!confirm("Restaurar todas as cores para o padrão?")) return;
    setSaving(true);
    try {
      const res = await fetch("/api/producer/theme", { method: "DELETE" });
      if (res.ok) {
        const d = await res.json();
        applyPreview(d.theme);
        refresh();
        showToast("Tema restaurado para o padrão");
      }
    } catch {
      showToast("Erro de rede");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white mb-2">
        Configurações
      </h1>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        Configure as integrações e personalize o visual do seu painel.
      </p>

      <div className="space-y-6">
        {/* Integrations section */}
        <section className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-6">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
            Como vincular os produtos
          </h3>
          <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-1.5 list-decimal list-inside">
            <li>
              Em <strong>Cursos</strong>, edite cada curso e preencha{" "}
              <em>ID externo do produto</em> com o ID do produto no Applyfy ou
              Stripe.
            </li>
            <li>
              No Stripe, inclua <code>courseId</code> em <em>metadata</em> do
              checkout session (ou <code>externalProductId</code>) para
              roteamento automático.
            </li>
            <li>
              No Applyfy, o roteamento usa o ID do produto contido no payload.
            </li>
          </ol>
        </section>

        {/* Theme customization section */}
        <section className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-6">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
            Personalizar tema
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
            Customize as cores do seu painel de trabalho
          </p>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-12 bg-gray-100 dark:bg-gray-900 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Mode toggle */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Modo</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Escolha entre modo escuro ou claro
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => updateField("mode", theme.mode === "dark" ? "light" : "dark")}
                  className="relative inline-flex h-7 w-[52px] items-center rounded-full transition-colors"
                  style={{ backgroundColor: theme.mode === "dark" ? theme.primaryColor : "#d1d5db" }}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                      theme.mode === "dark" ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                  <span className="sr-only">Modo escuro</span>
                </button>
                <span className="text-xs text-gray-500 dark:text-gray-400 ml-2 w-12">
                  {theme.mode === "dark" ? "Escuro" : "Claro"}
                </span>
              </div>

              {/* Primary colors row */}
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-3">Cores principais</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <ColorPicker
                    label="Cor primária"
                    description="Botões, links e destaques"
                    value={theme.primaryColor}
                    onChange={(v) => updateField("primaryColor", v)}
                  />
                  <ColorPicker
                    label="Cor secundária"
                    description="Elementos secundários"
                    value={theme.secondaryColor}
                    onChange={(v) => updateField("secondaryColor", v)}
                  />
                  <ColorPicker
                    label="Texto do botão"
                    description="Cor do texto nos botões"
                    value={theme.buttonTextColor}
                    onChange={(v) => updateField("buttonTextColor", v)}
                  />
                </div>
              </div>

              {/* Layout colors */}
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-3">Cores do layout</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <ColorPicker
                    label="Cor de fundo"
                    description="Background principal"
                    value={theme.bgColor}
                    onChange={(v) => updateField("bgColor", v)}
                  />
                  <ColorPicker
                    label="Cor do cabeçalho"
                    description="Background do header"
                    value={theme.headerColor}
                    onChange={(v) => updateField("headerColor", v)}
                  />
                  <ColorPicker
                    label="Cor da barra lateral"
                    description="Background da sidebar"
                    value={theme.sidebarColor}
                    onChange={(v) => updateField("sidebarColor", v)}
                  />
                  <ColorPicker
                    label="Cor dos widgets"
                    description="Background dos cards"
                    value={theme.cardColor}
                    onChange={(v) => updateField("cardColor", v)}
                  />
                </div>
              </div>

              {/* Preview */}
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-3">Preview</p>
                <div
                  className="rounded-xl border border-gray-200 dark:border-white/[0.06] overflow-hidden"
                  style={{ backgroundColor: theme.bgColor }}
                >
                  <div className="flex">
                    <div className="w-14 shrink-0 p-2 space-y-2" style={{ backgroundColor: theme.sidebarColor }}>
                      <div className="w-full h-2 rounded" style={{ backgroundColor: theme.primaryColor, opacity: 0.5 }} />
                      <div className="w-full h-2 rounded bg-white/10" />
                      <div className="w-full h-2 rounded bg-white/10" />
                    </div>
                    <div className="flex-1">
                      <div className="h-8 flex items-center px-3" style={{ backgroundColor: theme.headerColor }}>
                        <div className="h-2 w-16 rounded bg-white/20" />
                      </div>
                      <div className="p-3 space-y-2">
                        <div className="rounded-lg p-3 space-y-1.5" style={{ backgroundColor: theme.cardColor }}>
                          <div className="h-2 w-20 rounded bg-white/20" />
                          <div className="h-2 w-32 rounded bg-white/10" />
                        </div>
                        <div className="flex gap-2">
                          <button
                            className="px-3 py-1 rounded-lg text-xs font-medium"
                            style={{ backgroundColor: theme.primaryColor, color: theme.buttonTextColor }}
                          >
                            Botão
                          </button>
                          <div className="px-3 py-1 rounded-lg text-xs" style={{ backgroundColor: theme.secondaryColor, color: "#fff" }}>
                            Secundário
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-5 py-2.5 text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
                  style={{ backgroundColor: theme.primaryColor, color: theme.buttonTextColor }}
                >
                  {saving ? "Salvando..." : "Salvar tema"}
                </button>
                <button
                  onClick={handleReset}
                  disabled={saving}
                  className="px-5 py-2.5 bg-gray-100 dark:bg-white/[0.06] hover:bg-gray-200 dark:hover:bg-white/[0.1] text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
                >
                  Restaurar padrão
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

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
  function handleHexInput(raw: string) {
    const v = raw.startsWith("#") ? raw : `#${raw}`;
    if (v.length <= 7) onChange(v.length === 7 && HEX_RE.test(v) ? v : value);
  }

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{label}</p>
      <p className="text-[11px] text-gray-500 dark:text-gray-500">{description}</p>
      <div className="flex items-center gap-2">
        <div
          className="w-10 h-10 rounded-lg border border-gray-300 dark:border-white/[0.1] shrink-0 overflow-hidden relative"
          style={{ backgroundColor: value }}
        >
          <input
            type="color"
            value={HEX_RE.test(value) ? value : "#000000"}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => {
            const v = e.target.value;
            if (v.length <= 7) {
              onChange(v);
            }
          }}
          onBlur={(e) => {
            if (!HEX_RE.test(e.target.value)) {
              handleHexInput(e.target.value);
            }
          }}
          className="flex-1 min-w-0 px-3 py-2 bg-gray-50 dark:bg-white/[0.04] border border-gray-300 dark:border-white/[0.08] rounded-xl text-sm text-gray-900 dark:text-white font-mono focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20"
          placeholder="#000000"
          maxLength={7}
        />
      </div>
    </div>
  );
}
