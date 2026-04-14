"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ThumbnailUpload } from "./thumbnail-upload";
import { BannerUpload } from "./banner-upload";
import { slugify } from "@/lib/utils";

interface CourseFormData {
  id?: string;
  title: string;
  slug: string;
  description: string;
  thumbnail: string | null;
  bannerUrl: string | null;
  checkoutUrl: string;
  price: string;
  priceCurrency: string;
  externalProductId: string;
  isPublished: boolean;
  showInStore: boolean;
  supportEmail: string;
  supportWhatsapp: string;
}

interface CourseFormProps {
  initial?: Partial<CourseFormData>;
  mode: "create" | "edit";
}

export function CourseForm({ initial, mode }: CourseFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title || "");
  const [slug, setSlug] = useState(initial?.slug || "");
  const [slugEdited, setSlugEdited] = useState(mode === "edit");
  const [description, setDescription] = useState(initial?.description || "");
  const [thumbnail, setThumbnail] = useState<string | null>(
    initial?.thumbnail || null
  );
  const [bannerUrl, setBannerUrl] = useState<string | null>(
    initial?.bannerUrl || null
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
  const [supportEmail, setSupportEmail] = useState(initial?.supportEmail || "");
  const [supportWhatsapp, setSupportWhatsapp] = useState(
    initial?.supportWhatsapp || ""
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newTitle = e.target.value;
    setTitle(newTitle);
    if (!slugEdited) {
      setSlug(slugify(newTitle));
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
      bannerUrl,
      checkoutUrl: checkoutUrl || null,
      price: price === "" ? null : Number(price),
      priceCurrency: priceCurrency || "BRL",
      externalProductId: externalProductId.trim() || null,
      isPublished,
      showInStore,
      supportEmail: supportEmail.trim() || null,
      supportWhatsapp: supportWhatsapp.trim() || null,
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
        router.push(`/admin/courses/${data.course.id}/edit`);
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
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Informações básicas</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Título *
          </label>
          <input
            type="text"
            value={title}
            onChange={handleTitleChange}
            required
            className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ex: Curso de Marketing Digital"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Slug (URL) *
          </label>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">/course/</span>
            <input
              type="text"
              value={slug}
              onChange={(e) => {
                setSlug(slugify(e.target.value));
                setSlugEdited(true);
              }}
              required
              className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="marketing-digital"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Descrição *
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows={4}
            className="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
            placeholder="Descreva o que os alunos vão aprender..."
          />
        </div>

        <ThumbnailUpload
          value={thumbnail}
          onChange={setThumbnail}
          uploadPath={initial?.id ? `thumbnails/${initial.id}` : undefined}
        />

        <BannerUpload
          value={bannerUrl}
          onChange={setBannerUrl}
          uploadPath={initial?.id ? `banners/${initial.id}` : undefined}
        />
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Vendas & publicação</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Link de checkout (externo)
          </label>
          <input
            type="url"
            value={checkoutUrl}
            onChange={(e) => setCheckoutUrl(e.target.value)}
            className="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="https://pay.applyfy.com/..."
          />
          <p className="text-xs text-gray-500 mt-1">
            Link externo onde o aluno será redirecionado ao clicar em &ldquo;Comprar agora&rdquo;
          </p>
        </div>

        <div className="grid grid-cols-[1fr_120px] gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Preço exibido
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ex: 497.00"
            />
            <p className="text-xs text-gray-500 mt-1">
              Apenas visual. Deixe em branco para exibir &ldquo;Consulte&rdquo;.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Moeda
            </label>
            <select
              value={priceCurrency}
              onChange={(e) => setPriceCurrency(e.target.value)}
              className="w-full px-3 py-2.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="BRL">BRL</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            ID externo do produto (Applyfy / Stripe)
          </label>
          <input
            type="text"
            value={externalProductId}
            onChange={(e) => setExternalProductId(e.target.value)}
            className="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="ex: 1234567 (Applyfy) ou prod_XXXX (Stripe)"
          />
          <p className="text-xs text-gray-500 mt-1">
            Usado pelos webhooks para liberar acesso automaticamente após uma compra aprovada.
          </p>
        </div>

        <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-800/50 transition">
          <input
            type="checkbox"
            checked={isPublished}
            onChange={(e) => setIsPublished(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-blue-500"
          />
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Publicado</p>
            <p className="text-xs text-gray-500">
              Quando desativado, o curso fica como rascunho e invisível para alunos
            </p>
          </div>
        </label>

        <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg hover:bg-gray-800/50 transition">
          <input
            type="checkbox"
            checked={showInStore}
            onChange={(e) => setShowInStore(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-blue-500"
          />
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">Mostrar na loja</p>
            <p className="text-xs text-gray-500">
              Aparece na seção &ldquo;Outros cursos&rdquo; para alunos sem acesso
            </p>
          </div>
        </label>
      </div>

      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Suporte</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Configure os canais de atendimento para os alunos deste curso
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Email de suporte
          </label>
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
              className="w-full pl-10 pr-4 py-2.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Será exibido na área de membros para os alunos entrarem em contato
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            WhatsApp de suporte
          </label>
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
              className="w-full pl-10 pr-4 py-2.5 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Número com DDD. O aluno poderá clicar e abrir conversa no WhatsApp
          </p>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => router.push("/admin/courses")}
          className="px-4 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm font-medium rounded-lg transition"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition"
        >
          {saving ? "Salvando..." : mode === "create" ? "Criar curso" : "Salvar alterações"}
        </button>
      </div>
    </form>
  );
}
