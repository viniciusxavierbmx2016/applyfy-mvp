"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";

interface UserData {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  document: string | null;
  avatarUrl: string | null;
  points: number;
  level: number;
  createdAt: string;
  lastAccessAt: string | null;
  lastIpAddress: string | null;
}
interface TagData {
  name: string;
  color: string;
}
interface EnrollmentData {
  id: string;
  status: string;
  expiresAt: string | null;
  enrolledAt: string;
  course: { id: string; title: string; slug: string; thumbnail: string | null };
  progress: number;
  lessonsCompleted: number;
  totalLessons: number;
}
interface StatsData {
  totalCourses: number;
  activeCourses: number;
  totalLessonsCompleted: number;
  totalLikes: number;
  totalDislikes: number;
  totalPosts: number;
  totalComments: number;
  totalCertificates: number;
}
interface CertData {
  courseName: string;
  issuedAt: string;
}
interface ActivityData {
  type: string;
  description: string;
  date: string;
}
interface AccessLogData {
  ip: string;
  userAgent: string | null;
  path: string | null;
  createdAt: string;
}
interface DetailResponse {
  user: UserData;
  tags: TagData[];
  enrollments: EnrollmentData[];
  stats: StatsData;
  certificates: CertData[];
  recentActivity: ActivityData[];
  accessLogs: AccessLogData[];
}

type Tab = "info" | "courses" | "activity" | "engagement";
const TABS: { key: Tab; label: string }[] = [
  { key: "info", label: "Informações" },
  { key: "courses", label: "Cursos" },
  { key: "activity", label: "Atividade" },
  { key: "engagement", label: "Engajamento" },
];

export default function StudentDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [data, setData] = useState<DetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("info");

  useEffect(() => {
    fetch(`/api/producer/students/${params.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, [params.id]);

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
    return <p className="text-sm text-gray-500">Aluno não encontrado.</p>;
  }

  const { user, tags, stats } = data;

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link
        href="/producer/users"
        className="text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white flex items-center gap-1"
      >
        ← Voltar aos alunos
      </Link>

      {/* Header */}
      <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-6">
        <div className="flex flex-col sm:flex-row gap-4 sm:items-start sm:justify-between">
          <div className="flex items-center gap-4">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                className="w-14 h-14 rounded-full object-cover"
              />
            ) : (
              <div className="w-14 h-14 rounded-full bg-blue-600 text-white flex items-center justify-center text-lg font-semibold">
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                {user.name}
              </h1>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-500 mt-0.5">
                <span>{user.email}</span>
                {user.phone && (
                  <>
                    <span className="text-gray-300 dark:text-gray-600">·</span>
                    <span>{user.phone}</span>
                  </>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  Nv {user.level} · {user.points} pts
                </span>
                <span className="text-xs text-gray-500">
                  {stats.activeCourses} curso{stats.activeCourses !== 1 ? "s" : ""} ativo{stats.activeCourses !== 1 ? "s" : ""}
                </span>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {tags.map((t) => (
                    <span
                      key={t.name}
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border"
                      style={{
                        backgroundColor: `${t.color}15`,
                        color: t.color,
                        borderColor: `${t.color}30`,
                      }}
                    >
                      {t.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 flex-shrink-0">
            {user.phone && (
              <a
                href={formatWhatsAppUrl(user.phone)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg transition-colors"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                WhatsApp
              </a>
            )}
            <a
              href={`mailto:${user.email}`}
              className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-700 transition-colors"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
              Email
            </a>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Cursos ativos" value={stats.activeCourses} accent="text-blue-500 dark:text-blue-400" />
        <StatCard label="Aulas concluídas" value={stats.totalLessonsCompleted} accent="text-emerald-500 dark:text-emerald-400" />
        <StatCard label="Posts / Comentários" value={`${stats.totalPosts} / ${stats.totalComments}`} accent="text-amber-500 dark:text-amber-400" />
        <StatCard label="Certificados" value={stats.totalCertificates} accent="text-purple-500 dark:text-purple-400" />
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
      {activeTab === "info" && <TabInfo user={user} tags={tags} />}
      {activeTab === "courses" && <TabCourses enrollments={data.enrollments} />}
      {activeTab === "activity" && <TabActivity activity={data.recentActivity} accessLogs={data.accessLogs} />}
      {activeTab === "engagement" && (
        <TabEngagement stats={stats} certificates={data.certificates} />
      )}
    </div>
  );
}

/* ── Tab: Informações ── */
function TabInfo({ user, tags }: { user: UserData; tags: TagData[] }) {
  return (
    <div className="space-y-6">
      <Section title="Dados pessoais">
        <InfoGrid>
          <InfoItem label="Nome" value={user.name} />
          <InfoItem label="Email" value={user.email} />
          <InfoItem label="Telefone" value={user.phone} />
          <InfoItem label="Documento (CPF/CNPJ)" value={user.document} />
        </InfoGrid>
      </Section>

      <Section title="Gamificação & Acesso">
        <InfoGrid>
          <InfoItem label="Pontos" value={String(user.points)} />
          <InfoItem label="Nível" value={String(user.level)} />
          <InfoItem label="Data de cadastro" value={formatDateTime(user.createdAt)} />
          <InfoItem label="Último acesso" value={user.lastAccessAt ? formatDateTime(user.lastAccessAt) : null} />
          <div>
            <p className="text-[11px] text-gray-500 uppercase tracking-wider">Último IP</p>
            <p className="text-sm text-gray-900 dark:text-white mt-1 font-mono">{user.lastIpAddress || "—"}</p>
          </div>
        </InfoGrid>
      </Section>

      {tags.length > 0 && (
        <Section title="Tags">
          <div className="flex flex-wrap gap-2">
            {tags.map((t) => (
              <span
                key={t.name}
                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border"
                style={{
                  backgroundColor: `${t.color}15`,
                  color: t.color,
                  borderColor: `${t.color}30`,
                }}
              >
                {t.name}
              </span>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

/* ── Tab: Cursos ── */
function TabCourses({ enrollments }: { enrollments: EnrollmentData[] }) {
  if (enrollments.length === 0) {
    return <EmptyState text="Nenhum curso matriculado." />;
  }
  return (
    <div className="space-y-4">
      {enrollments.map((e) => (
        <div
          key={e.id}
          className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-5"
        >
          <div className="flex gap-4">
            {e.course.thumbnail ? (
              <img
                src={e.course.thumbnail}
                alt={e.course.title}
                className="w-20 h-14 rounded-lg object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-20 h-14 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
                {e.course.title.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {e.course.title}
              </p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 mt-1">
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                  e.status === "ACTIVE"
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    : "bg-red-500/10 text-red-600 dark:text-red-400"
                }`}>
                  {e.status === "ACTIVE" ? "Ativo" : e.status === "EXPIRED" ? "Expirado" : e.status}
                </span>
                <span>Matrícula: {formatDate(e.enrolledAt)}</span>
                {e.expiresAt && (
                  <span>Expira: {formatDate(e.expiresAt)}</span>
                )}
              </div>

              {/* Progress bar */}
              <div className="mt-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-500">Progresso</span>
                  <span className="text-gray-900 dark:text-white font-medium">
                    {e.progress}% ({e.lessonsCompleted}/{e.totalLessons} aulas)
                  </span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-[width] ${
                      e.progress >= 100 ? "bg-emerald-500" : "bg-blue-500"
                    }`}
                    style={{ width: `${Math.min(e.progress, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Tab: Atividade ── */
function TabActivity({ activity, accessLogs }: { activity: ActivityData[]; accessLogs: AccessLogData[] }) {
  const icons: Record<string, string> = {
    lesson_completed: "✅",
    like: "👍",
    dislike: "👎",
    post: "💬",
    comment: "📝",
  };

  return (
    <div className="space-y-6">
      {activity.length > 0 ? (
        <Section title="Atividade recente">
          <div className="space-y-0">
            {activity.map((a, i) => (
              <div
                key={i}
                className="flex items-start gap-3 py-3 border-b border-gray-100 dark:border-white/[0.04] last:border-0"
              >
                <span className="text-base flex-shrink-0 mt-0.5">
                  {icons[a.type] || "📌"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 dark:text-white">
                    {a.description}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {formatRelative(a.date)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Section>
      ) : (
        <EmptyState text="Nenhuma atividade recente." />
      )}

      <Section title="Histórico de acessos">
        {accessLogs.length > 0 ? (
          <div className="space-y-2">
            {accessLogs.map((log, i) => (
              <div key={i} className="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-white/[0.02] rounded-lg">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xs font-mono text-blue-600 dark:text-blue-400 flex-shrink-0">{log.ip}</span>
                  <span className="text-[10px] text-gray-400 dark:text-gray-600 truncate max-w-[200px]">
                    {log.userAgent?.split("(")[0] || ""}
                  </span>
                </div>
                <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                  {formatDateTime(log.createdAt)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">Nenhum acesso registrado</p>
        )}
      </Section>
    </div>
  );
}

/* ── Tab: Engajamento ── */
function TabEngagement({
  stats,
  certificates,
}: {
  stats: StatsData;
  certificates: CertData[];
}) {
  return (
    <div className="space-y-6">
      <Section title="Reações">
        <InfoGrid>
          <InfoItem label="Likes dados" value={String(stats.totalLikes)} />
          <InfoItem label="Dislikes dados" value={String(stats.totalDislikes)} />
          <InfoItem label="Posts na comunidade" value={String(stats.totalPosts)} />
          <InfoItem label="Comentários" value={String(stats.totalComments)} />
        </InfoGrid>
      </Section>

      {certificates.length > 0 && (
        <Section title="Certificados emitidos">
          <div className="space-y-2">
            {certificates.map((c, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-white/[0.04] last:border-0"
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">🏆</span>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {c.courseName}
                  </p>
                </div>
                <p className="text-xs text-gray-500">{formatDate(c.issuedAt)}</p>
              </div>
            ))}
          </div>
        </Section>
      )}
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
      <p className="text-[11px] text-gray-500 uppercase tracking-wider">{label}</p>
      <p className="text-sm text-gray-900 dark:text-white mt-1">{value || "—"}</p>
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

function formatRelative(v: string) {
  try {
    const diff = Date.now() - new Date(v).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `há ${mins}min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `há ${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `há ${days} dia${days === 1 ? "" : "s"}`;
    return formatDate(v);
  } catch {
    return "—";
  }
}

function formatWhatsAppUrl(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  const num = digits.startsWith("55") ? digits : `55${digits}`;
  return `https://wa.me/${num}`;
}
