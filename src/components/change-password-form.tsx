"use client";

import { useState } from "react";
import { useUserStore } from "@/stores/user-store";

export function ChangePasswordForm({ workspaceSlug }: { workspaceSlug?: string } = {}) {
  const { user, collaborator } = useUserStore();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Dual-auth (mirrors w/[slug]/login): a pure STUDENT's password lives in
  // WorkspaceCredential, scoped per workspace; staff and accepted
  // collaborators use the global Supabase Auth password.
  const isPureStudent = user?.role === "STUDENT" && !collaborator;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (newPassword.length < 6) {
      setError("A nova senha precisa ter pelo menos 6 caracteres");
      return;
    }
    if (newPassword !== confirm) {
      setError("As senhas não conferem");
      return;
    }
    setLoading(true);
    try {
      const scoped = isPureStudent && workspaceSlug;
      const res = await fetch(
        scoped ? `/api/w/${workspaceSlug}/password` : "/api/auth/password",
        {
          method: scoped ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ currentPassword, newPassword }),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Erro ao alterar senha");
        return;
      }
      setSuccess("Senha alterada com sucesso");
      setCurrentPassword("");
      setNewPassword("");
      setConfirm("");
    } catch {
      setError("Erro ao conectar com o servidor");
    } finally {
      setLoading(false);
    }
  }

  // Opção 2: on the global /profile (no workspace in scope) a pure STUDENT
  // doesn't see the form — their change lives at /w/[slug]/profile where the
  // slug comes from the URL. Guard INSIDE the component so any future render
  // site is safe by default. Staff and ADMIN_COLLABORATOR (not pure students)
  // keep seeing it — /profile is ADMIN_COLLABORATOR's only password page.
  if (isPureStudent && !workspaceSlug) return null;

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Alterar senha
      </h3>
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 text-sm">
          {success}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Senha atual
          </label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Nova senha
          </label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
            className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Mín. 6 caracteres"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Confirmar nova senha
          </label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
            className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full sm:w-auto px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition"
        >
          {loading ? "Salvando..." : "Alterar senha"}
        </button>
      </form>
    </div>
  );
}
