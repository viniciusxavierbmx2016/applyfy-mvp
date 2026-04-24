"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/hooks/use-confirm";

interface Tag {
  id: string;
  name: string;
  color: string;
  autoSource: string | null;
  studentCount: number;
  createdAt: string;
}

const COLORS = [
  "#6366f1", "#3b82f6", "#06b6d4", "#10b981", "#f59e0b",
  "#ef4444", "#ec4899", "#8b5cf6", "#f97316", "#14b8a6",
];

export default function TagsPage() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#6366f1");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const { confirm, ConfirmDialog } = useConfirm();

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  async function load() {
    setLoading(true);
    const res = await fetch("/api/producer/tags");
    if (res.ok) {
      const data = await res.json();
      setTags(data.tags || []);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleCreate() {
    if (!newName.trim()) return;
    const res = await fetch("/api/producer/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), color: newColor }),
    });
    if (res.ok) {
      setNewName("");
      await load();
      showToast("Tag criada");
    } else {
      const data = await res.json().catch(() => ({}));
      showToast(data.error || "Erro ao criar tag");
    }
  }

  async function handleUpdate(id: string) {
    const res = await fetch(`/api/producer/tags/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim(), color: editColor }),
    });
    if (res.ok) {
      setEditId(null);
      await load();
      showToast("Tag atualizada");
    } else {
      const data = await res.json().catch(() => ({}));
      showToast(data.error || "Erro ao atualizar");
    }
  }

  async function handleDelete(id: string) {
    if (!(await confirm({ title: "Excluir tag", message: "Isso removerá a tag de todos os alunos. Continuar?", variant: "danger", confirmText: "Excluir" }))) return;
    const res = await fetch(`/api/producer/tags/${id}`, { method: "DELETE" });
    if (res.ok) {
      await load();
      showToast("Tag excluída");
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
        <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
          Nova tag
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nome da tag..."
            className="flex-1 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500"
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          />
          <div className="flex items-center gap-1.5">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setNewColor(c)}
                className="w-6 h-6 rounded-full border-2 transition"
                style={{
                  backgroundColor: c,
                  borderColor: newColor === c ? "white" : "transparent",
                  boxShadow: newColor === c ? `0 0 0 2px ${c}` : "none",
                }}
              />
            ))}
          </div>
          <Button variant="primary" size="md" onClick={handleCreate} disabled={!newName.trim()}>
            Criar
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tags.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-10 text-center">
          <p className="text-gray-500 text-sm">Nenhuma tag criada ainda.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800">
                <th className="text-left px-4 py-3 text-[11px] uppercase tracking-widest text-gray-500 font-medium">Tag</th>
                <th className="text-left px-4 py-3 text-[11px] uppercase tracking-widest text-gray-500 font-medium">Alunos</th>
                <th className="text-left px-4 py-3 text-[11px] uppercase tracking-widest text-gray-500 font-medium">Origem</th>
                <th className="text-right px-4 py-3 text-[11px] uppercase tracking-widest text-gray-500 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {tags.map((t) => (
                <tr key={t.id} className="border-b border-gray-100 dark:border-gray-800 last:border-0">
                  <td className="px-4 py-3">
                    {editId === t.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded px-2 py-1 text-sm text-gray-900 dark:text-white w-40"
                          onKeyDown={(e) => e.key === "Enter" && handleUpdate(t.id)}
                        />
                        <div className="flex gap-1">
                          {COLORS.map((c) => (
                            <button
                              key={c}
                              type="button"
                              onClick={() => setEditColor(c)}
                              className="w-5 h-5 rounded-full border-2 transition"
                              style={{
                                backgroundColor: c,
                                borderColor: editColor === c ? "white" : "transparent",
                                boxShadow: editColor === c ? `0 0 0 1px ${c}` : "none",
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    ) : (
                      <span
                        className="inline-flex items-center gap-1.5 text-sm font-medium px-2.5 py-1 rounded-full border"
                        style={{
                          backgroundColor: `${t.color}15`,
                          color: t.color,
                          borderColor: `${t.color}40`,
                        }}
                      >
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }} />
                        {t.name}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                    {t.studentCount}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {t.autoSource === "automation" ? "Automação" : "Manual"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      {editId === t.id ? (
                        <>
                          <button
                            onClick={() => handleUpdate(t.id)}
                            className="px-2.5 py-1 text-xs font-medium rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/20 transition"
                          >
                            Salvar
                          </button>
                          <button
                            onClick={() => setEditId(null)}
                            className="px-2.5 py-1 text-xs font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                          >
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => { setEditId(t.id); setEditName(t.name); setEditColor(t.color); }}
                            className="px-2.5 py-1 text-xs font-medium rounded-lg bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDelete(t.id)}
                            className="px-2.5 py-1 text-xs font-medium rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/20 transition"
                          >
                            Excluir
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 bg-blue-600 text-white rounded-lg shadow-xl text-sm font-medium">
          {toast}
        </div>
      )}
      <ConfirmDialog />
    </div>
  );
}
