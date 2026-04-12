"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ThumbnailUpload } from "./thumbnail-upload";
import { slugify } from "@/lib/utils";

interface CourseFormData {
  id?: string;
  title: string;
  slug: string;
  description: string;
  thumbnail: string | null;
  checkoutUrl: string;
  externalProductId: string;
  isPublished: boolean;
  showInStore: boolean;
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
  const [checkoutUrl, setCheckoutUrl] = useState(initial?.checkoutUrl || "");
  const [externalProductId, setExternalProductId] = useState(
    initial?.externalProductId || ""
  );
  const [isPublished, setIsPublished] = useState(initial?.isPublished ?? false);
  const [showInStore, setShowInStore] = useState(initial?.showInStore ?? true);
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
      checkoutUrl: checkoutUrl || null,
      externalProductId: externalProductId.trim() || null,
      isPublished,
      showInStore,
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

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white">Informações básicas</h2>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Título *
          </label>
          <input
            type="text"
            value={title}
            onChange={handleTitleChange}
            required
            className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ex: Curso de Marketing Digital"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
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
              className="flex-1 px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="marketing-digital"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Descrição *
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows={4}
            className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
            placeholder="Descreva o que os alunos vão aprender..."
          />
        </div>

        <ThumbnailUpload value={thumbnail} onChange={setThumbnail} />
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white">Vendas & publicação</h2>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Link de checkout (externo)
          </label>
          <input
            type="url"
            value={checkoutUrl}
            onChange={(e) => setCheckoutUrl(e.target.value)}
            className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="https://pay.hotmart.com/..."
          />
          <p className="text-xs text-gray-500 mt-1">
            Link externo onde o aluno será redirecionado ao clicar em &ldquo;Comprar agora&rdquo;
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            ID externo do produto (Hotmart / Stripe)
          </label>
          <input
            type="text"
            value={externalProductId}
            onChange={(e) => setExternalProductId(e.target.value)}
            className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="ex: 1234567 (Hotmart) ou prod_XXXX (Stripe)"
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
            <p className="text-sm font-medium text-white">Publicado</p>
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
            <p className="text-sm font-medium text-white">Mostrar na loja</p>
            <p className="text-xs text-gray-500">
              Aparece na seção &ldquo;Outros cursos&rdquo; para alunos sem acesso
            </p>
          </div>
        </label>
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={() => router.push("/admin/courses")}
          className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-200 text-sm font-medium rounded-lg transition"
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
