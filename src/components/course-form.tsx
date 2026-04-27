"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { ThumbnailUpload } from "./thumbnail-upload";
import { BannerUpload } from "./banner-upload";
import { slugify } from "@/lib/utils";

interface ImagePosition { x: number; y: number; }

function parsePosition(json: string | null | undefined): ImagePosition {
  if (!json) return { x: 50, y: 50 };
  try { const p = JSON.parse(json); return { x: p.x ?? 50, y: p.y ?? 50 }; } catch { return { x: 50, y: 50 }; }
}

interface CourseFormData {
  id?: string;
  title: string;
  slug: string;
  description: string;
  thumbnail: string | null;
  thumbnailPosition: string | null;
  bannerUrl: string | null;
  bannerPosition: string | null;
  checkoutUrl: string;
  price: string;
  priceCurrency: string;
  externalProductId: string;
  isPublished: boolean;
  showInStore: boolean;
  featured: boolean;
  category: string;
  supportEmail: string;
  supportWhatsapp: string;
  termsContent: string;
  termsFileUrl: string;
}

interface CourseFormProps {
  initial?: Partial<CourseFormData>;
  mode: "create" | "edit";
}

function Toggle({ checked, onChange, label, description }: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-3 text-left"
    >
      <span
        className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors ${
          checked ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-700"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform mt-0.5 ${
            checked ? "translate-x-[18px] ml-0" : "translate-x-0.5"
          }`}
        />
      </span>
      <div>
        <span className="text-sm font-medium text-gray-900 dark:text-white">{label}</span>
        {description && (
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        )}
      </div>
    </button>
  );
}

const inputClass =
  "w-full px-3 py-2.5 bg-white dark:bg-gray-900/50 border border-gray-200 dark:border-white/10 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-colors text-sm";

const labelClass = "block text-xs text-gray-500 dark:text-gray-400 mb-1.5";

export function CourseForm({ initial, mode }: CourseFormProps) {
  const router = useRouter();
  const pathname = usePathname();
  const routePrefix = pathname.startsWith("/admin") ? "/admin" : "/producer";
  const [title, setTitle] = useState(initial?.title || "");
  const [slug, setSlug] = useState(initial?.slug || "");
  const [slugEdited, setSlugEdited] = useState(mode === "edit");
  const [description, setDescription] = useState(initial?.description || "");
  const [thumbnail, setThumbnail] = useState<string | null>(
    initial?.thumbnail || null
  );
  const [thumbPos, setThumbPos] = useState<ImagePosition>(
    parsePosition(initial?.thumbnailPosition)
  );
  const [bannerUrl, setBannerUrl] = useState<string | null>(
    initial?.bannerUrl || null
  );
  const [bannerPos, setBannerPos] = useState<ImagePosition>(
    parsePosition(initial?.bannerPosition)
  );
  const [checkoutUrl, setCheckoutUrl] = useState(initial?.checkoutUrl || "");
  const [price, setPrice] = useState(initial?.price ?? "");
  const [priceCurrency, setPriceCurrency] = useState(
    initial?.priceCurrency || "BRL"
  );
  const [externalProductId, setExternalProductId] = useState(
    initial?.externalProductId || ""
  );
  const [isPublished, setIsPublished] = useState(initial?.isPublished ?? false);
  const [showInStore, setShowInStore] = useState(initial?.showInStore ?? true);
  const [featured, setFeatured] = useState(initial?.featured ?? false);
  const [category, setCategory] = useState(initial?.category || "");
  const [categories, setCategories] = useState<string[]>([]);
  const [supportEmail, setSupportEmail] = useState(initial?.supportEmail || "");
  const [supportWhatsapp, setSupportWhatsapp] = useState(
    initial?.supportWhatsapp || ""
  );
  const [termsContent, setTermsContent] = useState(initial?.termsContent || "");
  const [termsFileUrl, setTermsFileUrl] = useState(initial?.termsFileUrl || "");
  const [uploadingTerms, setUploadingTerms] = useState(false);
  const [thumbMode, setThumbMode] = useState<"view" | "reposition">("view");
  const [bannerMode, setBannerMode] = useState<"view" | "reposition">("view");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/producer/courses/categories")
      .then((r) => (r.ok ? r.json() : { categories: [] }))
      .then((d) => setCategories(d.categories || []))
      .catch(() => {});
  }, []);

  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newTitle = e.target.value;
    setTitle(newTitle);
    if (!slugEdited) {
      setSlug(slugify(newTitle));
    }
  }

  async function handleTermsFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      alert("Apenas arquivos PDF são aceitos");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("O arquivo deve ter no máximo 5MB");
      return;
    }
    setUploadingTerms(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("path", `terms/${initial?.id || "new"}`);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Erro no upload");
      const data = await res.json();
      setTermsFileUrl(data.url);
    } catch {
      alert("Erro ao enviar o arquivo");
    } finally {
      setUploadingTerms(false);
      e.target.value = "";
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);

    const payload = {
      title,
      slug,
      description,
      thumbnail,
      thumbnailPosition: JSON.stringify(thumbPos),
      bannerUrl,
      bannerPosition: JSON.stringify(bannerPos),
      checkoutUrl: checkoutUrl || null,
      price: price === "" ? null : Number(price),
      priceCurrency: priceCurrency || "BRL",
      externalProductId: externalProductId.trim() || null,
      isPublished,
      showInStore,
      featured,
      category: category.trim() || null,
      supportEmail: supportEmail.trim() || null,
      supportWhatsapp: supportWhatsapp.trim() || null,
      termsContent: termsContent.trim() || null,
      termsFileUrl: termsFileUrl.trim() || null,
    };

    try {
      const url =
        mode === "create" ? "/api/courses" : `/api/courses/${initial?.id}`;
      const method = mode === "create" ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erro ao salvar");
        return;
      }

      if (mode === "create") {
        router.push(`/producer/courses/${data.course.id}/edit`);
      } else {
        router.refresh();
      }
    } catch {
      setError("Erro de conexão");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="pb-20">
      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-6">
          {error}
        </div>
      )}

      {/* SEÇÃO 1 — Dados do curso */}
      <div className="mb-8">
        <h2 className="text-sm font-medium text-gray-900 dark:text-white mb-0.5">Dados do curso</h2>
        <p className="text-xs text-gray-500 mb-4">Informações básicas visíveis para os alunos</p>

        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className={labelClass}>Título *</label>
            <input
              type="text"
              value={title}
              onChange={handleTitleChange}
              required
              className={inputClass}
              placeholder="Ex: Curso de Marketing Digital"
            />
          </div>
          <div>
            <label className={labelClass}>Slug (URL) *</label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 shrink-0">/course/</span>
              <input
                type="text"
                value={slug}
                onChange={(e) => {
                  setSlug(slugify(e.target.value));
                  setSlugEdited(true);
                }}
                required
                className={inputClass}
                placeholder="marketing-digital"
              />
            </div>
          </div>
        </div>

        <div className="mb-4">
          <label className={labelClass}>Descrição *</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={`${inputClass} min-h-[80px] resize-y`}
            placeholder="Descreva o que os alunos vão aprender..."
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <ThumbnailUpload
              value={thumbnail}
              onChange={(url) => {
                setThumbnail(url);
                if (url) { setThumbPos({ x: 50, y: 50 }); setThumbMode("reposition"); }
                else { setThumbPos({ x: 50, y: 50 }); setThumbMode("view"); }
              }}
              uploadPath={initial?.id ? `thumbnails/${initial.id}` : undefined}
              position={thumbPos}
              onPositionChange={setThumbPos}
              mode={thumbMode}
              onModeChange={setThumbMode}
            />
          </div>
          <div>
            <BannerUpload
              value={bannerUrl}
              onChange={(url) => {
                setBannerUrl(url);
                if (url) { setBannerPos({ x: 50, y: 50 }); setBannerMode("reposition"); }
                else { setBannerPos({ x: 50, y: 50 }); setBannerMode("view"); }
              }}
              uploadPath={initial?.id ? `banners/${initial.id}` : undefined}
              position={bannerPos}
              onPositionChange={setBannerPos}
              mode={bannerMode}
              onModeChange={setBannerMode}
              aspectRatio="45/16"
              hint="Tamanho ideal: 1125x400px. PNG, JPG ou WebP, máx. 5MB."
            />
          </div>
        </div>
      </div>

      {/* SEÇÃO 2 — Checkout e preço */}
      <div className="mb-8 pt-8 border-t border-gray-200 dark:border-white/5">
        <h2 className="text-sm font-medium text-gray-900 dark:text-white mb-0.5">Checkout e preço</h2>
        <p className="text-xs text-gray-500 mb-4">Configuração de venda e pagamento</p>

        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className={labelClass}>Link de checkout (externo)</label>
            <input
              type="url"
              value={checkoutUrl}
              onChange={(e) => setCheckoutUrl(e.target.value)}
              className={inputClass}
              placeholder="https://pay.applyfy.com/..."
            />
            <p className="text-xs text-gray-500 mt-1">
              Link externo para &ldquo;Comprar agora&rdquo;
            </p>
          </div>
          <div>
            <label className={labelClass}>Preço exibido</label>
            <div className="flex gap-2">
              <select
                value={priceCurrency}
                onChange={(e) => setPriceCurrency(e.target.value)}
                className={`${inputClass} !w-20 shrink-0`}
              >
                <option value="BRL">BRL</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
              <input
                type="number"
                min="0"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className={inputClass}
                placeholder="Ex: 497.00"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Apenas visual. Vazio = &ldquo;Consulte&rdquo;.
            </p>
          </div>
        </div>

        <div>
          <label className={labelClass}>ID externo do produto (Applyfy / Stripe)</label>
          <input
            type="text"
            value={externalProductId}
            onChange={(e) => setExternalProductId(e.target.value)}
            className={inputClass}
            placeholder="ex: 1234567 (Applyfy) ou prod_XXXX (Stripe)"
          />
          <p className="text-xs text-gray-500 mt-1">
            Usado pelos webhooks para liberar acesso automaticamente após uma compra aprovada.
          </p>
        </div>
      </div>

      {/* SEÇÃO 3 — Vitrine */}
      <div className="mb-8 pt-8 border-t border-gray-200 dark:border-white/5">
        <h2 className="text-sm font-medium text-gray-900 dark:text-white mb-0.5">Vitrine</h2>
        <p className="text-xs text-gray-500 mb-4">Como o curso aparece na vitrine para os alunos</p>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Categoria</label>
            <input
              type="text"
              list="course-categories"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={inputClass}
              placeholder="Ex: Marketing, Vendas, Tecnologia"
            />
            <datalist id="course-categories">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            <p className="text-xs text-gray-500 mt-1">
              Agrupa cursos na vitrine. Digite ou selecione uma existente.
            </p>
          </div>
          <div className="flex flex-col gap-4 sm:pt-5">
            <Toggle
              checked={isPublished}
              onChange={setIsPublished}
              label="Publicado"
              description="Visível para alunos"
            />
            <Toggle
              checked={showInStore}
              onChange={setShowInStore}
              label="Na vitrine"
              description="Aparece em &ldquo;Outros cursos&rdquo;"
            />
            <Toggle
              checked={featured}
              onChange={setFeatured}
              label="Destaque"
            />
          </div>
        </div>
      </div>

      {/* SEÇÃO 4 — Suporte */}
      <div className="pt-8 border-t border-gray-200 dark:border-white/5">
        <h2 className="text-sm font-medium text-gray-900 dark:text-white mb-0.5">Suporte</h2>
        <p className="text-xs text-gray-500 mb-4">Canais de atendimento para os alunos</p>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Email de suporte</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 dark:text-gray-500 pointer-events-none">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l9 6 9-6M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </span>
              <input
                type="email"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                placeholder="suporte@exemplo.com"
                className={`${inputClass} !pl-10`}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Exibido na área de membros para contato
            </p>
          </div>
          <div>
            <label className={labelClass}>WhatsApp de suporte</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400 dark:text-gray-500 pointer-events-none">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h2.28a1 1 0 01.95.68l1.5 4.49a1 1 0 01-.5 1.21l-1.9.95a11 11 0 005.52 5.52l.95-1.9a1 1 0 011.21-.5l4.49 1.5a1 1 0 01.68.95V19a2 2 0 01-2 2h-1C9.72 21 3 14.28 3 6V5z" />
                </svg>
              </span>
              <input
                type="tel"
                value={supportWhatsapp}
                onChange={(e) => setSupportWhatsapp(e.target.value)}
                placeholder="(11) 99999-8888"
                className={`${inputClass} !pl-10`}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Número com DDD. Abre conversa no WhatsApp
            </p>
          </div>
        </div>
      </div>

      {/* SEÇÃO 5 — Termos de uso */}
      <div className="pt-8 border-t border-gray-200 dark:border-white/5 mt-8">
        <h2 className="text-sm font-medium text-gray-900 dark:text-white mb-0.5">Termos de uso</h2>
        <p className="text-xs text-gray-500 mb-4">
          Adicione os termos de uso do curso. O aluno precisará aceitar antes de acessar.
          Você pode escrever o texto e/ou enviar um PDF.
        </p>

        {/* Upload PDF */}
        <div className="mb-4">
          <label className="text-xs text-gray-400 mb-1.5 block">Arquivo PDF (opcional)</label>
          {termsFileUrl ? (
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-white/10 rounded-lg">
              <svg className="w-8 h-8 text-red-500 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-700 dark:text-gray-300 truncate">Termos de uso.pdf</p>
                <a href={termsFileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline">
                  Visualizar PDF
                </a>
              </div>
              <button
                type="button"
                onClick={() => setTermsFileUrl("")}
                className="text-xs text-red-500 hover:text-red-400 px-2 py-1"
              >
                Remover
              </button>
            </div>
          ) : (
            <div>
              <input
                type="file"
                accept="application/pdf"
                onChange={handleTermsFileUpload}
                className="hidden"
                id="terms-pdf-upload"
                disabled={uploadingTerms}
              />
              <label
                htmlFor="terms-pdf-upload"
                className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-gray-300 dark:border-white/10 rounded-lg cursor-pointer hover:border-blue-500/30 hover:bg-blue-500/5 transition-colors text-sm text-gray-500"
              >
                {uploadingTerms ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="32"/>
                    </svg>
                    Enviando...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="17 8 12 3 7 8"/>
                      <line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                    Clique para enviar um PDF
                  </>
                )}
              </label>
              <p className="text-[10px] text-gray-500 mt-1">PDF &middot; Máximo 5MB</p>
            </div>
          )}
        </div>

        {/* Textarea de texto */}
        <label className="text-xs text-gray-400 mb-1.5 block">Texto dos termos (opcional)</label>
        <textarea
          value={termsContent}
          onChange={(e) => setTermsContent(e.target.value)}
          placeholder="Cole aqui os termos de uso, política de privacidade e proteção de dados do seu curso..."
          rows={8}
          className={`${inputClass} min-h-[120px] resize-y`}
        />
        {(termsContent.trim() || termsFileUrl) && (
          <p className="text-xs text-amber-500 mt-2 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            Ao salvar, alunos que ainda não aceitaram precisarão aceitar antes de acessar o curso.
          </p>
        )}
      </div>

      {/* Footer sticky */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm border-t border-gray-200 dark:border-white/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.push(`${routePrefix}/courses`)}
            className="px-4 py-2 border border-gray-300 dark:border-white/10 hover:bg-gray-100 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {saving ? "Salvando..." : mode === "create" ? "Criar curso" : "Salvar alterações"}
          </button>
        </div>
      </div>
    </form>
  );
}
