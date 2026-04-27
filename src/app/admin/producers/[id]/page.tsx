"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useConfirm } from "@/hooks/use-confirm";

interface Producer {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  createdAt: string;
  phone: string | null;
  document: string | null;
  businessType: string | null;
  niche: string | null;
  monthlyRevenue: string | null;
  referralSource: string | null;
  lastAccessAt: string | null;
  points: number;
  level: number;
}
interface WorkspaceRow {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  courseCount: number;
  studentCount: number;
  logoUrl: string | null;
  accentColor: string | null;
}
interface CourseRow {
  id: string;
  title: string;
  thumbnail: string | null;
  workspaceId: string;
  students: number;
  ratingAverage: number;
  ratingCount: number;
  completion: number;
}
interface SubPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  interval: string;
  maxWorkspaces: number;
  maxCoursesPerWorkspace: number;
}
interface Invoice {
  id: string;
  amount: number;
  currency: string;
  status: string;
  paidAt: string | null;
  createdAt: string;
}
interface Subscription {
  id: string;
  status: string;
  exempt: boolean;
  exemptReason: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  plan: SubPlan;
  invoices: Invoice[];
}
interface StudentRow {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  lastAccessAt: string | null;
  enrolledAt: string;
  courseTitle: string;
}
interface DetailResponse {
  producer: Producer;
  workspaces: WorkspaceRow[];
  courses: CourseRow[];
  totalStudents: number;
  subscription: Subscription | null;
  usage: { workspacesUsed: number; coursesUsed: number };
  recentStudents: StudentRow[];
}

type Tab = "info" | "workspace" | "courses" | "students" | "subscription";
const TABS: { key: Tab; label: string }[] = [
  { key: "info", label: "Informações" },
  { key: "workspace", label: "Workspaces" },
  { key: "courses", label: "Cursos" },
  { key: "students", label: "Alunos" },
  { key: "subscription", label: "Assinatura" },
];

const ACTIVE_WORKSPACE_COOKIE = "active_workspace_id";

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  PENDING: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  PAST_DUE: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  SUSPENDED: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  CANCELLED: "bg-gray-500/10 text-gray-500 border-gray-500/20",
};
const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Ativa",
  PENDING: "Aguardando",
  PAST_DUE: "Pag. pendente",
  SUSPENDED: "Suspensa",
  CANCELLED: "Cancelada",
};

export default function ProducerDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const p = params;
  const router = useRouter();
  const [data, setData] = useState<DetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [impersonating, setImpersonating] = useState(false);
  const [impersonateUrl, setImpersonateUrl] = useState("");
  const [impersonateCountdown, setImpersonateCountdown] = useState(0);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("info");
  const { confirm, ConfirmDialog } = useConfirm();

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  function loadData() {
    fetch(`/api/admin/producers/${p.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    loadData();
  }, [p.id]);

  useEffect(() => {
    if (impersonateCountdown <= 0) return;
    const timer = setTimeout(() => setImpersonateCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [impersonateCountdown]);

  async function handleToggleStatus() {
    if (!data) return;
    const allInactive = data.workspaces.length > 0 && data.workspaces.every((w) => !w.isActive);
    const action = allInactive ? "activate" : "suspend";

    if (
      action === "suspend" &&
      !(await confirm({
        title: "Suspender produtor",
        message: "Suspender este produtor? Todos os workspaces dele serão desativados.",
        variant: "danger",
        confirmText: "Suspender",
      }))
    )
      return;

    setBusy(true);
    try {
      const res = await fetch(`/api/admin/producers/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error();
      showToast(action === "suspend" ? "Produtor suspenso" : "Produtor ativado");
      loadData();
    } catch {
      showToast("Erro ao atualizar status");
    } finally {
      setBusy(false);
    }
  }

  async function handleGenerateLink() {
    setImpersonating(true);
    setCopied(false);
    try {
      const res = await fetch(`/api/admin/producers/${p.id}/impersonate`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) {
        showToast(json.error || "Erro ao gerar link");
        return;
      }
      setImpersonateUrl(json.url);
      setImpersonateCountdown(60);
    } catch {
      showToast("Erro ao gerar link de acesso");
    } finally {
      setImpersonating(false);
    }
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(impersonateUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function accessWorkspace(workspaceId: string) {
    document.cookie = `${ACTIVE_WORKSPACE_COOKIE}=${workspaceId}; path=/; max-age=${60 * 60 * 24 * 30}`;
    router.push("/admin");
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32" />
        <Skeleton className="h-40" />
      </div>
    );
  }
  if (!data) {
    return <p className="text-sm text-gray-500">Produtor não encontrado.</p>;
  }

  const allInactive = data.workspaces.length > 0 && data.workspaces.every((w) => !w.isActive);
  const producerStatus = allInactive ? "SUSPENDED" : "ACTIVE";

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/admin/producers"
        className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white flex items-center gap-1"
      >
        ← Voltar aos produtores
      </Link>

      {/* Header */}
      <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-6">
        <div className="flex flex-col sm:flex-row gap-4 sm:items-start sm:justify-between">
          <div className="flex items-center gap-4">
            {data.producer.avatarUrl ? (
              <img
                src={data.producer.avatarUrl}
                alt={data.producer.name}
                className="w-16 h-16 rounded-full object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-blue-600 text-white flex items-center justify-center text-xl font-semibold">
                {data.producer.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                {data.producer.name}
              </h1>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-500 mt-1">
                <span>{data.producer.email}</span>
                {data.producer.phone && (
                  <>
                    <span className="text-gray-300 dark:text-gray-600">·</span>
                    <span>{data.producer.phone}</span>
                  </>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                    producerStatus === "ACTIVE"
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                      : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                  }`}
                >
                  {producerStatus === "ACTIVE" ? "Ativo" : "Suspenso"}
                </span>
                {data.subscription && (
                  <span className="text-xs text-gray-500">
                    Plano: {data.subscription.plan.name}
                  </span>
                )}
                <span className="text-xs text-gray-500">
                  Desde {formatDate(data.producer.createdAt)}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 sm:flex-shrink-0">
            <button
              type="button"
              onClick={handleGenerateLink}
              disabled={impersonating}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                <polyline points="10 17 15 12 10 7"/>
                <line x1="15" y1="12" x2="3" y2="12"/>
              </svg>
              {impersonating ? "Gerando link…" : "Login como produtor"}
            </button>
            <Button
              variant={allInactive ? "primary" : "danger"}
              size="md"
              onClick={handleToggleStatus}
              disabled={busy || data.workspaces.length === 0}
            >
              {busy
                ? "Processando…"
                : allInactive
                  ? "Ativar produtor"
                  : "Suspender produtor"}
            </Button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Workspaces" value={data.workspaces.length} accent="text-blue-500 dark:text-blue-400" />
        <StatCard label="Cursos" value={data.courses.length} accent="text-amber-500 dark:text-amber-400" />
        <StatCard label="Alunos" value={data.totalStudents} accent="text-emerald-500 dark:text-emerald-400" />
        <StatCard label="Pontos" value={data.producer.points} accent="text-purple-500 dark:text-purple-400" />
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-white/[0.06]">
        <div className="flex gap-0 -mb-px overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.key
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {activeTab === "info" && <TabInfo producer={data.producer} />}
      {activeTab === "workspace" && (
        <TabWorkspaces workspaces={data.workspaces} onAccess={accessWorkspace} />
      )}
      {activeTab === "courses" && <TabCourses courses={data.courses} />}
      {activeTab === "students" && (
        <TabStudents students={data.recentStudents} total={data.totalStudents} />
      )}
      {activeTab === "subscription" && (
        <TabSubscription
          subscription={data.subscription}
          usage={data.usage}
          producerId={p.id}
        />
      )}

      {/* Impersonate modal */}
      {impersonateUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setImpersonateUrl("")}
        >
          <div
            className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-5">
              <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                  <polyline points="10 17 15 12 10 7" />
                  <line x1="15" y1="12" x2="3" y2="12" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Login como produtor
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                Abra o link abaixo em uma janela anônima para logar como este produtor
              </p>
            </div>

            <div className="bg-gray-100 dark:bg-gray-900/50 border border-gray-200 dark:border-white/10 rounded-lg p-3 mb-4">
              <p className="text-xs text-gray-500 font-mono truncate select-all">
                {impersonateUrl}
              </p>
            </div>

            <div className="text-center mb-5">
              {impersonateCountdown > 0 ? (
                <p className="text-sm text-amber-500 flex items-center justify-center gap-1.5">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  Este link expira em {impersonateCountdown}s
                </p>
              ) : (
                <p className="text-sm text-red-500">Link expirado</p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleCopyLink}
                disabled={impersonateCountdown <= 0}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-400 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                {copied ? "Copiado!" : "Copiar link"}
              </button>
              <button
                onClick={handleGenerateLink}
                disabled={impersonateCountdown > 0 || impersonating}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium rounded-lg transition-colors"
              >
                {impersonating ? "Gerando…" : "Gerar novo link"}
              </button>
            </div>

            <button
              onClick={() => setImpersonateUrl("")}
              className="w-full mt-3 text-center text-xs text-gray-500 hover:text-gray-400 py-2"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium rounded-lg shadow-lg">
          {toast}
        </div>
      )}
      <ConfirmDialog />
    </div>
  );
}

/* ── Tab: Informações ── */
function TabInfo({ producer }: { producer: Producer }) {
  return (
    <div className="space-y-6">
      <Section title="Dados pessoais">
        <InfoGrid>
          <InfoItem label="Nome" value={producer.name} />
          <InfoItem label="Email" value={producer.email} />
          <InfoItem label="Telefone" value={producer.phone} />
          <InfoItem label="Documento (CPF/CNPJ)" value={producer.document} />
        </InfoGrid>
      </Section>

      <Section title="Onboarding">
        <InfoGrid>
          <InfoItem label="Tipo de negócio" value={producer.businessType} />
          <InfoItem label="Nicho" value={producer.niche} />
          <InfoItem label="Receita mensal" value={producer.monthlyRevenue} />
          <InfoItem label="Como conheceu" value={producer.referralSource} />
        </InfoGrid>
      </Section>

      <Section title="Acesso">
        <InfoGrid>
          <InfoItem label="Último acesso" value={producer.lastAccessAt ? formatDateTime(producer.lastAccessAt) : null} />
          <InfoItem label="Data de cadastro" value={formatDateTime(producer.createdAt)} />
          <InfoItem label="Pontos" value={String(producer.points)} />
          <InfoItem label="Nível" value={String(producer.level)} />
        </InfoGrid>
      </Section>
    </div>
  );
}

/* ── Tab: Workspaces ── */
function TabWorkspaces({
  workspaces,
  onAccess,
}: {
  workspaces: WorkspaceRow[];
  onAccess: (id: string) => void;
}) {
  if (workspaces.length === 0) {
    return <EmptyState text="Sem workspaces cadastrados." />;
  }
  return (
    <div className="space-y-4">
      {workspaces.map((w) => (
        <div
          key={w.id}
          className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-5"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              {w.logoUrl ? (
                <img
                  src={w.logoUrl}
                  alt={w.name}
                  className="w-10 h-10 rounded-lg object-cover"
                />
              ) : (
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-semibold"
                  style={{ backgroundColor: w.accentColor || "#3b82f6" }}
                >
                  {w.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {w.name}
                </p>
                <p className="text-xs text-gray-500 truncate">/{w.slug}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                  w.isActive
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                }`}
              >
                {w.isActive ? "Ativo" : "Inativo"}
              </span>
              <button
                type="button"
                onClick={() => onAccess(w.id)}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                Acessar
              </button>
            </div>
          </div>
          <div className="flex gap-6 mt-3 pt-3 border-t border-gray-100 dark:border-white/[0.04]">
            <div>
              <p className="text-[11px] text-gray-500 uppercase tracking-wider">Cursos</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{w.courseCount}</p>
            </div>
            <div>
              <p className="text-[11px] text-gray-500 uppercase tracking-wider">Alunos</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{w.studentCount}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Tab: Cursos ── */
function TabCourses({ courses }: { courses: CourseRow[] }) {
  if (courses.length === 0) {
    return <EmptyState text="Sem cursos cadastrados." />;
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {courses.map((c) => (
        <div
          key={c.id}
          className="border border-gray-200 dark:border-white/[0.06] rounded-xl overflow-hidden bg-white dark:bg-white/[0.03]"
        >
          {c.thumbnail ? (
            <img
              src={c.thumbnail}
              alt={c.title}
              className="w-full aspect-video object-cover"
            />
          ) : (
            <div className="w-full aspect-video bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white text-xl font-semibold">
              {c.title.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="p-4">
            <p className="font-medium text-gray-900 dark:text-white line-clamp-1 text-sm">
              {c.title}
            </p>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
              <span>{c.students} alunos</span>
              <span>★ {c.ratingCount > 0 ? c.ratingAverage : "—"}</span>
              <span>{c.completion}% conclusão</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Tab: Alunos ── */
function TabStudents({
  students,
  total,
}: {
  students: StudentRow[];
  total: number;
}) {
  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-5">
        <p className="text-[11px] font-medium uppercase tracking-widest text-gray-500">
          Total de alunos únicos
        </p>
        <p className="mt-1 text-3xl font-bold text-emerald-500 dark:text-emerald-400">
          {total}
        </p>
      </div>

      {students.length === 0 ? (
        <EmptyState text="Nenhum aluno matriculado." />
      ) : (
        <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-200 dark:border-white/[0.06]">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">
              Últimos 20 alunos matriculados
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-gray-200 dark:border-white/[0.06] text-[11px] uppercase tracking-widest text-gray-500">
                  <th className="py-3 px-4 font-medium">Aluno</th>
                  <th className="py-3 px-4 font-medium">Curso</th>
                  <th className="py-3 px-4 font-medium">Matrícula</th>
                  <th className="py-3 px-4 font-medium">Último acesso</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s, i) => (
                  <tr
                    key={`${s.id}-${i}`}
                    className="border-b border-gray-100 dark:border-white/[0.04] last:border-0"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        {s.avatarUrl ? (
                          <img
                            src={s.avatarUrl}
                            alt={s.name}
                            className="w-7 h-7 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[10px] font-medium text-gray-600 dark:text-gray-300">
                            {s.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="text-gray-900 dark:text-white font-medium text-sm">
                            {s.name}
                          </p>
                          <p className="text-[11px] text-gray-500">{s.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-700 dark:text-gray-300 text-xs">
                      {s.courseTitle}
                    </td>
                    <td className="py-3 px-4 text-gray-500 text-xs">
                      {formatDate(s.enrolledAt)}
                    </td>
                    <td className="py-3 px-4 text-gray-500 text-xs">
                      {s.lastAccessAt ? formatDate(s.lastAccessAt) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Tab: Assinatura ── */
function TabSubscription({
  subscription,
  usage,
  producerId,
}: {
  subscription: Subscription | null;
  usage: { workspacesUsed: number; coursesUsed: number };
  producerId: string;
}) {
  if (!subscription) {
    return (
      <div className="space-y-4">
        <EmptyState text="Nenhuma assinatura encontrada." />
        <div className="flex justify-center">
          <Link
            href={`/admin/producers/${producerId}/subscription`}
            className="inline-flex items-center justify-center text-sm font-medium rounded-lg px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white transition-colors"
          >
            Criar assinatura
          </Link>
        </div>
      </div>
    );
  }

  const statusCls = STATUS_COLORS[subscription.status] || STATUS_COLORS.CANCELLED;
  const statusLabel = STATUS_LABELS[subscription.status] || subscription.status;

  return (
    <div className="space-y-6">
      {/* Plan summary */}
      <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-5">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">
              {subscription.plan.name}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${statusCls}`}
              >
                {statusLabel}
              </span>
              {subscription.exempt && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                  Isento
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatMoney(subscription.plan.price, subscription.plan.currency)}
            </p>
            <p className="text-xs text-gray-500">
              /{subscription.plan.interval === "monthly" ? "mês" : subscription.plan.interval === "yearly" ? "ano" : subscription.plan.interval}
            </p>
          </div>
        </div>

        {(subscription.currentPeriodStart || subscription.currentPeriodEnd) && (
          <div className="flex gap-6 mt-4 pt-4 border-t border-gray-100 dark:border-white/[0.04]">
            {subscription.currentPeriodStart && (
              <div>
                <p className="text-[11px] text-gray-500 uppercase tracking-wider">Início período</p>
                <p className="text-sm text-gray-900 dark:text-white mt-0.5">
                  {formatDate(subscription.currentPeriodStart)}
                </p>
              </div>
            )}
            {subscription.currentPeriodEnd && (
              <div>
                <p className="text-[11px] text-gray-500 uppercase tracking-wider">Próx. pagamento</p>
                <p className="text-sm text-gray-900 dark:text-white mt-0.5">
                  {formatDate(subscription.currentPeriodEnd)}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Usage */}
      <Section title="Uso vs Limite">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UsageBar
            label="Workspaces"
            used={usage.workspacesUsed}
            max={subscription.plan.maxWorkspaces}
          />
          <UsageBar
            label="Cursos"
            used={usage.coursesUsed}
            max={subscription.plan.maxCoursesPerWorkspace}
          />
        </div>
      </Section>

      {/* Invoices */}
      {subscription.invoices.length > 0 && (
        <Section title="Últimas faturas">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-gray-200 dark:border-white/[0.06] text-[11px] uppercase tracking-widest text-gray-500">
                  <th className="py-2 px-4 font-medium">Data</th>
                  <th className="py-2 px-4 font-medium">Valor</th>
                  <th className="py-2 px-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {subscription.invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="border-b border-gray-100 dark:border-white/[0.04] last:border-0"
                  >
                    <td className="py-2.5 px-4 text-gray-700 dark:text-gray-300">
                      {formatDate(inv.createdAt)}
                    </td>
                    <td className="py-2.5 px-4 text-gray-900 dark:text-white font-medium">
                      {formatMoney(inv.amount, inv.currency)}
                    </td>
                    <td className="py-2.5 px-4">
                      <InvoiceStatusPill status={inv.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* Manage link */}
      <div className="flex justify-center">
        <Link
          href={`/admin/producers/${producerId}/subscription`}
          className="inline-flex items-center justify-center text-sm font-medium rounded-lg px-5 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-700 transition-colors"
        >
          Gerenciar assinatura
        </Link>
      </div>
    </div>
  );
}

/* ── Shared components ── */

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number | string;
  accent: string;
}) {
  return (
    <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-4 hover:border-gray-300 dark:hover:border-white/[0.1] transition-colors duration-200">
      <p className="text-[11px] font-medium uppercase tracking-widest text-gray-500">
        {label}
      </p>
      <p className={`mt-1 text-2xl font-bold ${accent}`}>{value}</p>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-5">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
        {title}
      </h3>
      {children}
    </div>
  );
}

function InfoGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>;
}

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div>
      <p className="text-[11px] text-gray-500 uppercase tracking-wider">
        {label}
      </p>
      <p className="text-sm text-gray-900 dark:text-white mt-1">
        {value || "—"}
      </p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-8 text-center">
      <p className="text-sm text-gray-500">{text}</p>
    </div>
  );
}

function UsageBar({
  label,
  used,
  max,
}: {
  label: string;
  used: number;
  max: number;
}) {
  const pct = max > 0 ? Math.min(Math.round((used / max) * 100), 100) : 0;
  const isHigh = pct >= 80;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-500">{label}</span>
        <span className="text-gray-900 dark:text-white font-medium">
          {used}/{max}
        </span>
      </div>
      <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-[width] ${
            isHigh ? "bg-amber-500" : "bg-blue-500"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function InvoiceStatusPill({ status }: { status: string }) {
  const config: Record<string, { label: string; cls: string }> = {
    PAID: { label: "Paga", cls: "bg-green-500/10 text-green-600 dark:text-green-400" },
    PENDING: { label: "Pendente", cls: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
    FAILED: { label: "Falhou", cls: "bg-red-500/10 text-red-600 dark:text-red-400" },
    REFUNDED: { label: "Reembolsada", cls: "bg-gray-500/10 text-gray-500" },
  };
  const c = config[status] || { label: status, cls: "bg-gray-500/10 text-gray-500" };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${c.cls}`}>
      {c.label}
    </span>
  );
}

function formatDate(v: string) {
  try {
    return new Date(v).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function formatDateTime(v: string) {
  try {
    return new Date(v).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

function formatMoney(v: number, currency = "BRL") {
  try {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(v);
  } catch {
    return `R$ ${v.toFixed(2)}`;
  }
}
