"use client";

import { useState } from "react";
import type { CommunityGroup } from "../_types";

export function GroupModal({
  courseId,
  group,
  onClose,
  onSaved,
}: {
  courseId: string;
  group: CommunityGroup | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(group?.name || "");
  const [description, setDescription] = useState(group?.description || "");
  const [permission, setPermission] = useState<"READ_WRITE" | "READ_ONLY">(
    group?.permission || "READ_WRITE"
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Nome é obrigatório");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const url = group
        ? `/api/producer/community/groups/${group.id}`
        : "/api/producer/community/groups";
      const method = group ? "PUT" : "POST";
      const body = group
        ? { name: name.trim(), description: description.trim() || null, permission }
        : {
            courseId,
            name: name.trim(),
            description: description.trim() || null,
            permission,
          };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Erro ao salvar");
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-[#0f1219] border border-gray-200 dark:border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {group ? "Editar grupo" : "Novo grupo"}
            </h2>

            {error && (
              <p className="text-sm text-red-500 bg-red-500/10 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nome *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={60}
                className="w-full px-3 py-2 bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                placeholder="Ex: Networking"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Descrição (opcional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={200}
                rows={2}
                className="w-full px-3 py-2 bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-xl text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none"
                placeholder="Breve descrição do grupo"
              />
            </div>

            <fieldset>
              <legend className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Permissão
              </legend>
              <div className="space-y-2">
                <label className="flex items-start gap-3 p-3 border border-gray-200 dark:border-white/10 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition">
                  <input
                    type="radio"
                    name="permission"
                    value="READ_WRITE"
                    checked={permission === "READ_WRITE"}
                    onChange={() => setPermission("READ_WRITE")}
                    className="mt-0.5 accent-primary"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      Leitura e escrita
                    </span>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Alunos podem ver e postar
                    </p>
                  </div>
                </label>
                <label className="flex items-start gap-3 p-3 border border-gray-200 dark:border-white/10 rounded-xl cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition">
                  <input
                    type="radio"
                    name="permission"
                    value="READ_ONLY"
                    checked={permission === "READ_ONLY"}
                    onChange={() => setPermission("READ_ONLY")}
                    className="mt-0.5 accent-primary"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      Somente leitura
                    </span>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Alunos só visualizam
                    </p>
                  </div>
                </label>
              </div>
            </fieldset>
          </div>

          <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-200 dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 rounded-xl transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-sm font-medium rounded-xl transition disabled:opacity-60"
            >
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
