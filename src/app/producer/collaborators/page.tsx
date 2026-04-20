"use client";

import { useEffect, useState } from "react";
import {
  COLLABORATOR_PERMISSIONS,
  PERMISSION_LABELS,
  type CollaboratorPermission,
} from "@/lib/collaborator";

interface CourseOption {
  id: string;
  title: string;
  slug: string;
}

interface CollaboratorItem {
  id: string;
  email: string;
  name: string | null;
  status: "PENDING" | "ACCEPTED" | "REVOKED";
  permissions: string[];
  courseIds: string[];
  invitedAt: string;
  acceptedAt: string | null;
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
  } | null;
}

const STATUS_LABEL: Record<CollaboratorItem["status"], string> = {
  PENDING: "Pendente",
  ACCEPTED: "Ativo",
  REVOKED: "Revogado",
};
const STATUS_STYLE: Record<CollaboratorItem["status"], string> = {
  PENDING:
    "bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400",
  ACCEPTED:
    "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  REVOKED: "bg-gray-100 dark:bg-white/5 text-gray-500",
};

export default function AdminCollaboratorsPage() {
  const [items, setItems] = useState<CollaboratorItem[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<CollaboratorItem | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function load() {
    setLoading(true);
    const r = await fetch("/api/producer/collaborators");
    if (r.ok) {
      const d = await r.json();
      setItems(d.collaborators || []);
      setCourses(d.courses || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleRevoke(id: string) {
    if (!confirm("Revogar acesso deste colaborador?")) return;
    const r = await fetch(`/api/producer/collaborators/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "REVOKED" }),
    });
    if (r.ok) {
      showToast("Acesso revogado");
      load();
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Remover este colaborador permanentemente?")) return;
    const r = await fetch(`/api/producer/collaborators/${id}`, {
      method: "DELETE",
    });
    if (r.ok) {
      showToast("Colaborador removido");
      load();
    }
  }

  async function handleResend(id: string) {
    const r = await fetch(`/api/producer/collaborators/${id}/resend`, {
      method: "POST",
    });
    if (r.ok) {
      const d = await r.json();
      setInviteLink(d.inviteLink);
      showToast("Convite reenviado");
    }
  }

  return (
    <div className="px-4 sm:px-6 lg:px-10 py-6 max-w-[1200px] mx-auto w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            Colaboradores
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Convide pessoas para ajudar no seu negócio com permissões
            específicas.
          </p>
        </div>
        <button
          onClick={() => {
            setEditing(null);
            setShowModal(true);
          }}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Convidar colaborador
        </button>
      </div>

      {loading ? (
        <div className="bg-white dark:bg-white/5 border border-gray-200/70 dark:border-white/5 rounded-2xl overflow-hidden">
          <div className="bg-gray-50 dark:bg-white/[0.03] px-5 py-3">
            <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4 border-t border-gray-100 dark:border-white/5">
              <div className="h-4 w-36 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
              <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="ml-auto h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="py-16 text-center bg-gray-50 dark:bg-white/5 border border-gray-200/70 dark:border-white/5 rounded-2xl">
          <div className="w-14 h-14 mx-auto rounded-full bg-indigo-500/10 flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <p className="text-gray-500">Nenhum colaborador convidado ainda.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-white/5 border border-gray-200/70 dark:border-white/5 rounded-2xl overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-gray-50 dark:bg-white/[0.03] text-xs uppercase tracking-wider text-gray-500">
              <tr>
                <th className="text-left px-5 py-3 font-semibold">Pessoa</th>
                <th className="text-left px-5 py-3 font-semibold">Status</th>
                <th className="text-left px-5 py-3 font-semibold">Permissões</th>
                <th className="text-left px-5 py-3 font-semibold">Cursos</th>
                <th className="text-right px-5 py-3 font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/5">
              {items.map((c) => (
                <tr key={c.id}>
                  <td className="px-5 py-4">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {c.user?.name || c.name || c.email}
                    </div>
                    <div className="text-xs text-gray-500">{c.email}</div>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded-full ${STATUS_STYLE[c.status]}`}
                    >
                      {STATUS_LABEL[c.status]}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-xs text-gray-600 dark:text-gray-400">
                    {c.permissions.length} permiss
                    {c.permissions.length === 1 ? "ão" : "ões"}
                  </td>
                  <td className="px-5 py-4 text-xs text-gray-600 dark:text-gray-400">
                    {c.courseIds.length === 0
                      ? "Todos"
                      : `${c.courseIds.length} curso${c.courseIds.length === 1 ? "" : "s"}`}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-1.5 justify-end">
                      <button
                        onClick={() => {
                          setEditing(c);
                          setShowModal(true);
                        }}
                        className="px-2.5 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 rounded-md"
                      >
                        Editar
                      </button>
                      {c.status === "PENDING" && (
                        <button
                          onClick={() => handleResend(c.id)}
                          className="px-2.5 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-md"
                        >
                          Reenviar
                        </button>
                      )}
                      {c.status !== "REVOKED" && (
                        <button
                          onClick={() => handleRevoke(c.id)}
                          className="px-2.5 py-1 text-xs font-medium text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-md"
                        >
                          Revogar
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md"
                      >
                        Remover
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <CollaboratorModal
          courses={courses}
          editing={editing}
          onClose={() => setShowModal(false)}
          onSaved={(link) => {
            setShowModal(false);
            load();
            if (link) {
              setInviteLink(link);
              showToast("Convite enviado");
            } else {
              showToast("Colaborador atualizado");
            }
          }}
        />
      )}

      {inviteLink && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl p-4">
          <div className="flex items-start justify-between gap-3 mb-2">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              Link do convite
            </p>
            <button
              onClick={() => setInviteLink(null)}
              className="text-gray-400 hover:text-gray-700 dark:hover:text-white"
              aria-label="Fechar"
            >
              ×
            </button>
          </div>
          <p className="text-xs text-gray-500 mb-2">
            Envie este link para o colaborador aceitar o convite:
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              readOnly
              value={inviteLink}
              className="flex-1 min-w-0 px-3 py-2 text-xs bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-md font-mono truncate"
            />
            <button
              onClick={() => {
                navigator.clipboard.writeText(inviteLink);
                showToast("Link copiado");
              }}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-md"
            >
              Copiar
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium rounded-lg shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

function CollaboratorModal({
  courses,
  editing,
  onClose,
  onSaved,
}: {
  courses: CourseOption[];
  editing: CollaboratorItem | null;
  onClose: () => void;
  onSaved: (inviteLink?: string | null) => void;
}) {
  const [email, setEmail] = useState(editing?.email || "");
  const [name, setName] = useState(editing?.name || "");
  const [permissions, setPermissions] = useState<CollaboratorPermission[]>(
    (editing?.permissions as CollaboratorPermission[]) || []
  );
  const [courseIds, setCourseIds] = useState<string[]>(
    editing?.courseIds || []
  );
  const [allCourses, setAllCourses] = useState(
    !editing || editing.courseIds.length === 0
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function togglePerm(p: CollaboratorPermission) {
    setPermissions((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  }
  function toggleCourse(id: string) {
    setCourseIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function save() {
    setError(null);
    setSaving(true);
    const payload = {
      email: email.trim().toLowerCase(),
      name: name.trim() || null,
      permissions,
      courseIds: allCourses ? [] : courseIds,
    };
    const url = editing
      ? `/api/producer/collaborators/${editing.id}`
      : "/api/producer/collaborators";
    const method = editing ? "PATCH" : "POST";
    const r = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      setError(d.error || "Erro ao salvar");
      return;
    }
    const d = await r.json();
    onSaved(d.inviteLink ?? null);
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="px-6 py-5 border-b border-gray-200 dark:border-white/10 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white">
            {editing ? "Editar colaborador" : "Convidar colaborador"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 dark:hover:text-white"
            aria-label="Fechar"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                E-mail
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={!!editing}
                placeholder="colaborador@exemplo.com"
                className="w-full px-3 py-2 bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 disabled:opacity-60"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                Nome (opcional)
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nome da pessoa"
                className="w-full px-3 py-2 bg-white dark:bg-white/5 border border-gray-300 dark:border-white/10 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              />
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Permissões
            </p>
            <div className="space-y-2">
              {COLLABORATOR_PERMISSIONS.map((p) => (
                <label
                  key={p}
                  className="flex items-center gap-2.5 p-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-white/10"
                >
                  <input
                    type="checkbox"
                    checked={permissions.includes(p)}
                    onChange={() => togglePerm(p)}
                    className="w-4 h-4 accent-blue-600"
                  />
                  <span className="text-sm text-gray-800 dark:text-gray-200">
                    {PERMISSION_LABELS[p]}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Escopo de cursos
            </p>
            <label className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                checked={allCourses}
                onChange={(e) => setAllCourses(e.target.checked)}
                className="w-4 h-4 accent-blue-600"
              />
              <span className="text-sm text-gray-800 dark:text-gray-200">
                Todos os cursos do workspace
              </span>
            </label>
            {!allCourses && (
              <div className="max-h-48 overflow-y-auto space-y-1.5 p-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-lg">
                {courses.length === 0 && (
                  <p className="text-xs text-gray-500">
                    Nenhum curso disponível.
                  </p>
                )}
                {courses.map((c) => (
                  <label
                    key={c.id}
                    className="flex items-center gap-2 text-sm text-gray-800 dark:text-gray-200"
                  >
                    <input
                      type="checkbox"
                      checked={courseIds.includes(c.id)}
                      onChange={() => toggleCourse(c.id)}
                      className="w-4 h-4 accent-blue-600"
                    />
                    {c.title}
                  </label>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="px-3 py-2 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg text-sm text-red-700 dark:text-red-400">
              {error}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 dark:border-white/10 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg"
          >
            Cancelar
          </button>
          <button
            onClick={save}
            disabled={saving || !email || permissions.length === 0}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg"
          >
            {saving
              ? "Salvando…"
              : editing
                ? "Salvar"
                : "Enviar convite"}
          </button>
        </div>
      </div>
    </div>
  );
}
