"use client";

import { useEffect, useState } from "react";
import { useConfirm } from "@/hooks/use-confirm";
import {
  GRANTABLE_ADMIN_PERMS,
  ADMIN_PERM_LABELS,
  type AdminPerm,
} from "@/lib/admin-permissions";

interface Collab {
  id: string;
  email: string;
  name: string | null;
  permissions: string[];
  status: "PENDING" | "ACCEPTED" | "REVOKED";
  invitedAt: string;
  acceptedAt: string | null;
  user: { id: string; name: string; email: string; avatarUrl: string | null } | null;
  invitedBy: { id: string; name: string; email: string } | null;
}

const STATUS_LABELS: Record<Collab["status"], string> = {
  PENDING: "Pendente",
  ACCEPTED: "Ativo",
  REVOKED: "Revogado",
};

const STATUS_BADGE_CLS: Record<Collab["status"], string> = {
  PENDING: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  ACCEPTED: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  REVOKED: "bg-gray-500/10 text-gray-500 dark:text-gray-400",
};

function formatDate(s: string | null): string {
  if (!s) return "—";
  try {
    return new Date(s).toLocaleDateString("pt-BR");
  } catch {
    return s;
  }
}

export default function AdminCollaboratorsPage() {
  const [collaborators, setCollaborators] = useState<Collab[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [editing, setEditing] = useState<Collab | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const { confirm, ConfirmDialog } = useConfirm();

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/admin/collaborators");
      const d = await r.json();
      setCollaborators(d.collaborators ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleResend(c: Collab) {
    const r = await fetch(`/api/admin/collaborators/${c.id}/resend`, {
      method: "POST",
    });
    if (r.ok) showToast("Convite reenviado");
    else {
      const d = await r.json().catch(() => ({}));
      showToast(d.error || "Erro ao reenviar");
    }
  }

  async function handleRevoke(c: Collab) {
    const ok = await confirm({
      title: "Revogar acesso",
      message: `Revogar ${c.email}? O acesso dele à plataforma é cortado imediatamente.`,
      variant: "danger",
      confirmText: "Revogar",
    });
    if (!ok) return;
    const r = await fetch(`/api/admin/collaborators/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "REVOKED" }),
    });
    if (r.ok) {
      showToast("Acesso revogado");
      load();
    } else {
      const d = await r.json().catch(() => ({}));
      showToast(d.error || "Erro ao revogar");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Colaboradores admin
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Convide pessoas para ajudar a administrar a plataforma com permissões granulares.
          </p>
        </div>
        <button
          onClick={() => setShowInvite(true)}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Convidar colaborador
        </button>
      </div>

      <div className="bg-white dark:bg-white/[0.04] border border-gray-200 dark:border-white/[0.08] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-white/[0.02] border-b border-gray-200 dark:border-white/[0.08] text-left text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
              <tr>
                <th className="px-4 py-3 font-medium">Colaborador</th>
                <th className="px-4 py-3 font-medium">Permissões</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Convidado em</th>
                <th className="px-4 py-3 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/[0.04]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-gray-500">
                    Carregando…
                  </td>
                </tr>
              ) : collaborators?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-gray-500 dark:text-gray-400">
                    Nenhum colaborador ainda. Clique em &ldquo;Convidar colaborador&rdquo; para começar.
                  </td>
                </tr>
              ) : (
                collaborators?.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-white/[0.02]">
                    <td className="px-4 py-3">
                      <div className="text-gray-900 dark:text-white font-medium">
                        {c.name || c.user?.name || "—"}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{c.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {c.permissions.map((p) => (
                          <span
                            key={p}
                            className="inline-flex px-2 py-0.5 text-[10px] font-medium bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 rounded"
                          >
                            {ADMIN_PERM_LABELS[p as AdminPerm] ?? p}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 text-[11px] font-medium rounded-full ${STATUS_BADGE_CLS[c.status]}`}>
                        {STATUS_LABELS[c.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 text-xs whitespace-nowrap">
                      {formatDate(c.invitedAt)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        {c.status !== "REVOKED" && (
                          <button
                            onClick={() => setEditing(c)}
                            className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white px-2 py-1 border border-gray-300 dark:border-white/[0.08] rounded"
                          >
                            Editar
                          </button>
                        )}
                        {c.status === "PENDING" && (
                          <button
                            onClick={() => handleResend(c)}
                            className="text-xs text-blue-600 hover:text-blue-500 px-2 py-1 border border-blue-500/20 rounded hover:bg-blue-500/5"
                          >
                            Reenviar
                          </button>
                        )}
                        {c.status !== "REVOKED" && (
                          <button
                            onClick={() => handleRevoke(c)}
                            className="text-xs text-red-500 hover:text-red-400 px-2 py-1 border border-red-500/20 rounded hover:bg-red-500/5"
                          >
                            Revogar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showInvite && (
        <InviteModal
          onClose={() => setShowInvite(false)}
          onSuccess={() => {
            setShowInvite(false);
            load();
            showToast("Convite enviado");
          }}
        />
      )}

      {editing && (
        <EditModal
          collab={editing}
          onClose={() => setEditing(null)}
          onSuccess={() => {
            setEditing(null);
            load();
            showToast("Permissões atualizadas");
          }}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 px-4 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium rounded-lg shadow-xl z-50">
          {toast}
        </div>
      )}

      <ConfirmDialog />
    </div>
  );
}

function InviteModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [perms, setPerms] = useState<Set<AdminPerm>>(new Set());
  const [fullAccess, setFullAccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function togglePerm(p: AdminPerm) {
    const next = new Set(perms);
    if (next.has(p)) next.delete(p);
    else next.add(p);
    setPerms(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const finalPerms = fullAccess ? ["FULL_ACCESS"] : Array.from(perms);
    if (finalPerms.length === 0) {
      setError("Selecione ao menos uma permissão (ou marque Acesso total)");
      return;
    }
    setSubmitting(true);
    try {
      const r = await fetch("/api/admin/collaborators", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim() || null,
          permissions: finalPerms,
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(d.error || "Erro ao convidar");
        setSubmitting(false);
        return;
      }
      onSuccess();
    } catch {
      setError("Erro ao convidar");
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-white dark:bg-[#0a0a1a] border border-gray-200 dark:border-white/[0.08] rounded-2xl p-6 shadow-xl"
      >
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
          Convidar colaborador admin
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">
          O e-mail precisa ser exclusivo (não pode estar em uso por outro usuário da plataforma).
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              E-mail
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colaborador@empresa.com"
              className="w-full px-3 py-2 bg-gray-100 dark:bg-white/[0.04] border border-gray-300 dark:border-white/[0.08] rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              Nome (opcional)
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-gray-100 dark:bg-white/[0.04] border border-gray-300 dark:border-white/[0.08] rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20"
            />
          </div>

          <div>
            <label className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20 rounded-lg cursor-pointer">
              <input
                type="checkbox"
                checked={fullAccess}
                onChange={(e) => setFullAccess(e.target.checked)}
                className="mt-0.5"
              />
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {ADMIN_PERM_LABELS.FULL_ACCESS}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Concede todas as permissões. Use só pra pessoas de confiança total.
                </div>
              </div>
            </label>
          </div>

          {!fullAccess && (
            <div>
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                Permissões granulares
              </p>
              <div className="space-y-1.5">
                {GRANTABLE_ADMIN_PERMS.map((p) => (
                  <label
                    key={p}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-white/[0.02] rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={perms.has(p)}
                      onChange={() => togglePerm(p)}
                    />
                    <span className="text-sm text-gray-900 dark:text-white">
                      {ADMIN_PERM_LABELS[p]}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

        <div className="mt-6 flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-white/[0.08] rounded-lg"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg"
          >
            {submitting ? "Enviando..." : "Enviar convite"}
          </button>
        </div>
      </form>
    </div>
  );
}

function EditModal({
  collab,
  onClose,
  onSuccess,
}: {
  collab: Collab;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [perms, setPerms] = useState<Set<AdminPerm>>(
    () =>
      new Set(
        (collab.permissions.filter((p) =>
          (GRANTABLE_ADMIN_PERMS as readonly string[]).includes(p)
        )) as AdminPerm[]
      )
  );
  const [fullAccess, setFullAccess] = useState(
    collab.permissions.includes("FULL_ACCESS")
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function togglePerm(p: AdminPerm) {
    const next = new Set(perms);
    if (next.has(p)) next.delete(p);
    else next.add(p);
    setPerms(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const finalPerms = fullAccess ? ["FULL_ACCESS"] : Array.from(perms);
    if (finalPerms.length === 0) {
      setError("Selecione ao menos uma permissão");
      return;
    }
    setSubmitting(true);
    try {
      const r = await fetch(`/api/admin/collaborators/${collab.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions: finalPerms }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setError(d.error || "Erro ao atualizar");
        setSubmitting(false);
        return;
      }
      onSuccess();
    } catch {
      setError("Erro ao atualizar");
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-white dark:bg-[#0a0a1a] border border-gray-200 dark:border-white/[0.08] rounded-2xl p-6 shadow-xl"
      >
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
          Editar permissões
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">
          {collab.email}
        </p>

        <label className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20 rounded-lg cursor-pointer mb-4">
          <input
            type="checkbox"
            checked={fullAccess}
            onChange={(e) => setFullAccess(e.target.checked)}
            className="mt-0.5"
          />
          <div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              {ADMIN_PERM_LABELS.FULL_ACCESS}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Concede todas as permissões.
            </div>
          </div>
        </label>

        {!fullAccess && (
          <div className="space-y-1.5 mb-4">
            {GRANTABLE_ADMIN_PERMS.map((p) => (
              <label
                key={p}
                className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 dark:hover:bg-white/[0.02] rounded cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={perms.has(p)}
                  onChange={() => togglePerm(p)}
                />
                <span className="text-sm text-gray-900 dark:text-white">
                  {ADMIN_PERM_LABELS[p]}
                </span>
              </label>
            ))}
          </div>
        )}

        {error && <p className="text-sm text-red-500 mb-3">{error}</p>}

        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-white/[0.08] rounded-lg"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg"
          >
            {submitting ? "Salvando..." : "Salvar"}
          </button>
        </div>
      </form>
    </div>
  );
}
