"use client";

import { useEffect, useState } from "react";
import {
  COLLABORATOR_PERMISSIONS,
  PERMISSION_LABELS,
  type CollaboratorPermission,
} from "@/lib/collaborator";
import { useConfirm } from "@/hooks/use-confirm";
import { fetchJson, mensagemDeErro, useToast } from "@/hooks/use-toast";
import { HelpTooltip } from "@/components/help-tooltip";

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
    "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20",
  ACCEPTED:
    "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20",
  REVOKED: "bg-gray-500/10 text-gray-500 border border-gray-500/20",
};

export default function AdminCollaboratorsPage() {
  const [items, setItems] = useState<CollaboratorItem[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<CollaboratorItem | null>(null);
  // 9.86 — 1ª adoção da régua. A implementação LOCAL que morava aqui era uma
  // das 26 do projeto; o visual neutro do hook é byte-a-byte o que havia.
  const { showToast, Toast } = useToast();
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const { confirm, ConfirmDialog } = useConfirm();

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

  // 9.84 — a tabela e os cards abrem o MESMO modal; extraído para a regra não
  // existir em dois lugares.
  function abrirEdicao(c: CollaboratorItem) {
    setEditing(c);
    setShowModal(true);
  }

  /* 9.107 — dívida do 9.83 quitada: naquele item o `handleResend` ganhou
     tratamento de erro e estes dois ficaram sem, deixando a MESMA tela com
     dois comportamentos para a mesma classe de falha. Agora os três seguem a
     régua do 9.86. */
  async function handleRevoke(id: string) {
    if (!(await confirm({ title: "Revogar acesso", message: "Revogar acesso deste colaborador?", variant: "danger", confirmText: "Revogar" }))) return;
    const r = await fetchJson(
      `/api/producer/collaborators/${id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "REVOKED" }),
      },
      "Não foi possível revogar o acesso"
    );
    if (!r.ok) {
      showToast(r.mensagem, "error");
      return;
    }
    showToast("Acesso revogado");
    load();
  }

  async function handleDelete(id: string) {
    if (!(await confirm({ title: "Remover colaborador", message: "Remover este colaborador permanentemente?", variant: "danger", confirmText: "Remover" }))) return;
    const r = await fetchJson(
      `/api/producer/collaborators/${id}`,
      { method: "DELETE" },
      "Não foi possível remover o colaborador"
    );
    if (!r.ok) {
      showToast(r.mensagem, "error");
      return;
    }
    showToast("Colaborador removido");
    load();
  }

  /* 9.83 — UM handler para as duas ações, porque no servidor elas SÃO a mesma
     coisa: `status: PENDING`, `invitedAt` novo e um link fresco. O que muda é o
     que a pessoa está fazendo, e isso a tela precisa dizer.

     ⚠️ Reativar pede confirmação e reenviar não: reativar devolve acesso a
     alguém que o dono tirou, e re-arma o link que já esteve na caixa de entrada
     dessa pessoa. Reenviar apenas repete um convite que já estava de pé. */
  async function handleResend(c: CollaboratorItem) {
    const reativando = c.status === "REVOKED";
    if (
      reativando &&
      !(await confirm({
        title: "Reativar convite",
        message: `O convite de ${c.email} volta a valer, e o link enviado antes funciona de novo. A pessoa precisa aceitar outra vez — reativar não devolve o acesso sozinho.`,
        confirmText: "Reativar",
      }))
    ) {
      return;
    }
    const r = await fetch(`/api/producer/collaborators/${c.id}/resend`, {
      method: "POST",
    });
    if (!r.ok) {
      // Antes, falha aqui era SILENCIOSA — o clique não produzia nada. Com o
      // botão novo isso seria pior: a pessoa confirma um diálogo e a tela não
      // responde. A régua do 9.86 já estava importada nesta tela.
      showToast(
        await mensagemDeErro(
          r,
          reativando ? "Não foi possível reativar" : "Não foi possível reenviar"
        )
      );
      return;
    }
    const d = await r.json();
    setInviteLink(d.inviteLink);
    showToast(reativando ? "Convite reativado" : "Convite reenviado");
    // ⚠️ Só recarrega ao reativar: é a única das duas em que o STATUS da linha
    // muda (REVOKED → Pendente). No reenvio o caminho de sucesso segue
    // byte-a-byte o de antes — nenhuma busca a mais.
    if (reativando) load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Colaboradores
            <HelpTooltip text="Convide membros da equipe para ajudar a gerenciar seus cursos. Cada colaborador tem permissões específicas." />
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
          className="px-5 py-2.5 bg-primary hover:bg-primary text-white text-sm font-medium rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-colors"
        >
          Convidar colaborador
        </button>
      </div>

      {loading ? (
        <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-2xl overflow-hidden">
          <div className="bg-gray-50 dark:bg-white/5 px-5 py-3">
            <div className="h-3 w-24 bg-gray-200 dark:bg-white/10 rounded animate-pulse" />
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4 border-t border-gray-100 dark:border-white/5">
              <div className="h-4 w-36 bg-gray-200 dark:bg-white/10 rounded animate-pulse" />
              <div className="h-5 w-16 bg-gray-200 dark:bg-white/10 rounded-full animate-pulse" />
              <div className="h-4 w-24 bg-gray-200 dark:bg-white/10 rounded animate-pulse" />
              <div className="h-4 w-16 bg-gray-200 dark:bg-white/10 rounded animate-pulse" />
              <div className="ml-auto h-4 w-20 bg-gray-200 dark:bg-white/10 rounded animate-pulse" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="py-16 text-center bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-2xl">
          <div className="w-14 h-14 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
          <p className="text-gray-500">Nenhum colaborador convidado ainda.</p>
        </div>
      ) : (
        <>
        {/* Desktop table — 9.84: envelopada, INTOCADA por dentro. */}
        <div className="hidden md:block bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-xl overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="border-b border-gray-200 dark:border-white/5">
                <th className="text-left px-4 py-3 text-[11px] uppercase tracking-widest text-gray-500 font-medium">Pessoa</th>
                <th className="text-left px-4 py-3 text-[11px] uppercase tracking-widest text-gray-500 font-medium">Status</th>
                <th className="text-left px-4 py-3 text-[11px] uppercase tracking-widest text-gray-500 font-medium">Permissões</th>
                <th className="text-left px-4 py-3 text-[11px] uppercase tracking-widest text-gray-500 font-medium">Cursos</th>
                <th className="text-right px-4 py-3 text-[11px] uppercase tracking-widest text-gray-500 font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id} className="border-b border-gray-100 dark:border-white/5 last:border-0 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors duration-150">
                  <td className="px-4 py-4">
                    <div className="font-medium text-gray-900 dark:text-white">
                      {c.user?.name || c.name || c.email}
                    </div>
                    <div className="text-xs text-gray-500">{c.email}</div>
                  </td>
                  <td className="px-4 py-4">
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
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1.5 justify-end">
                      <AcoesColaborador
                        c={c}
                        layout="linha"
                        onEditar={abrirEdicao}
                        onResend={handleResend}
                        onRevogar={handleRevoke}
                        onRemover={handleDelete}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards — 9.84. Molde: courses/[id]/students/page.tsx:349
            (cabeçalho → grade rotulada → rodapé de ações). ⚠️ Escolhido `md`,
            e não o `sm` do applyfy, por um motivo de fato e não de gosto: o
            card do applyfy é de LOG, só leitura — não tem rodapé de ações, que
            é justamente o que uma linha com até 4 botões precisa.

            ⚠️ Sem avatar de propósito: a linha do desktop não mostra nenhum, e
            o card carrega o que a LINHA tem — inventar informação faria as duas
            superfícies discordarem. */}
        <div className="md:hidden space-y-3 pb-20">
          {items.map((c) => (
            <div
              key={c.id}
              className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/5 rounded-xl p-4"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white truncate">
                    {c.user?.name || c.name || c.email}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{c.email}</p>
                </div>
                <span
                  className={`flex-shrink-0 text-xs font-semibold px-2 py-1 rounded-full ${STATUS_STYLE[c.status]}`}
                >
                  {STATUS_LABEL[c.status]}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs mb-4">
                <div>
                  <p className="text-gray-500">Permissões</p>
                  <p className="text-gray-900 dark:text-white">
                    {c.permissions.length} permiss
                    {c.permissions.length === 1 ? "ão" : "ões"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Cursos</p>
                  <p className="text-gray-900 dark:text-white">
                    {c.courseIds.length === 0
                      ? "Todos"
                      : `${c.courseIds.length} curso${c.courseIds.length === 1 ? "" : "s"}`}
                  </p>
                </div>
              </div>

              {/* Até 4 botões (PENDING): quebram de 2 em 2, e um ímpar sobrando
                  ocupa a linha inteira em vez de ficar órfão à esquerda. */}
              <div className="flex flex-wrap gap-2">
                <AcoesColaborador
                  c={c}
                  layout="card"
                  onEditar={abrirEdicao}
                  onResend={handleResend}
                  onRevogar={handleRevoke}
                  onRemover={handleDelete}
                />
              </div>
            </div>
          ))}
        </div>
        </>
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
        <div className="fixed bottom-6 right-6 z-50 max-w-md bg-white dark:bg-card border border-gray-200 dark:border-white/10 rounded-xl shadow-2xl p-4">
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
              className="px-3 py-2 bg-primary hover:bg-primary text-white text-xs font-medium rounded-md"
            >
              Copiar
            </button>
          </div>
        </div>
      )}

      <Toast />
      <ConfirmDialog />
    </div>
  );
}

/* 9.84 — as AÇÕES vivem uma vez só.

   A tabela (desktop) e os cards (mobile) são duas apresentações do MESMO
   estado. Duplicar aqui a regra "qual botão aparece em qual status" seria a
   família 9.42/9.54/9.57 nascendo de novo: alguém muda a condição num lugar,
   esquece o outro, e as duas superfícies passam a discordar sobre o que o
   produtor pode fazer — com o agravante de que a divergência só aparece no
   tamanho de tela que quem editou não estava olhando.

   ⚠️ O que varia entre as duas NÃO é a regra, é o layout do botão: na linha
   ficam lado a lado à direita; no card, dois por fileira. Por isso `layout` só
   ACRESCENTA classe — as cores e o tamanho continuam as mesmas strings de
   antes, para o desktop sair idêntico. */
function AcoesColaborador({
  c,
  layout,
  onEditar,
  onResend,
  onRevogar,
  onRemover,
}: {
  c: CollaboratorItem;
  layout: "linha" | "card";
  onEditar: (c: CollaboratorItem) => void;
  onResend: (c: CollaboratorItem) => void;
  onRevogar: (id: string) => void;
  onRemover: (id: string) => void;
}) {
  /* `grow` em vez de `flex-1` de propósito: `flex-1` é atalho de `flex` e
     carrega `flex-basis: 0%` junto, que brigaria com o `basis-[...]` abaixo
     dependendo da ordem no CSS gerado. `grow` mexe só em `flex-grow`. */
  const l = layout === "card" ? " grow basis-[calc(50%-0.25rem)]" : "";
  return (
    <>
      <button
        onClick={() => onEditar(c)}
        className={
          "px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white/5 hover:bg-white/10 rounded-lg border border-gray-200 dark:border-white/10 transition" +
          l
        }
      >
        Editar
      </button>
      {c.status === "PENDING" && (
        <button
          onClick={() => onResend(c)}
          className={
            "px-3 py-1.5 text-xs font-medium text-primary bg-white/5 hover:bg-white/10 rounded-lg border border-gray-200 dark:border-white/10 transition" +
            l
          }
        >
          Reenviar
        </button>
      )}
      {/* 9.83 — a linha revogada oferecia só "Editar" e "Remover": nenhum
          caminho de volta. Mesmo endpoint do "Reenviar", rótulo próprio porque
          a ação é outra. */}
      {c.status === "REVOKED" && (
        <button
          onClick={() => onResend(c)}
          className={
            "px-3 py-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/10 rounded-lg border border-emerald-500/20 transition" +
            l
          }
        >
          Reativar
        </button>
      )}
      {c.status !== "REVOKED" && (
        <button
          onClick={() => onRevogar(c.id)}
          className={
            "px-3 py-1.5 text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-500/5 hover:bg-amber-500/10 rounded-lg border border-amber-500/20 transition" +
            l
          }
        >
          Revogar
        </button>
      )}
      <button
        onClick={() => onRemover(c.id)}
        className={
          "px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-lg border border-red-500/20 transition" +
          l
        }
      >
        Remover
      </button>
    </>
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
  // Convite NOVO nasce com ACCESS_MEMBER_AREA marcada — é o comportamento que
  // sempre existiu (todo colaborador entrava na área de membros pelo vínculo,
  // sem controle nenhum); a permissão só tornou isso revogável. EDIÇÃO respeita
  // o que está gravado: `editing?.permissions` vem primeiro, então desmarcar e
  // salvar continua desmarcado — o default não pode "ressuscitar" a permissão
  // que o dono acabou de tirar.
  const [permissions, setPermissions] = useState<CollaboratorPermission[]>(
    (editing?.permissions as CollaboratorPermission[]) ?? ["ACCESS_MEMBER_AREA"]
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

  /* 9.85 — a razão de o botão estar travado, na MESMA ordem das condições do
     `disabled` logo abaixo. Ordem importa: "salvando" vence tudo, e entre as
     duas pendências o e-mail vem antes porque é o primeiro campo da tela.
     ⚠️ Nenhuma condição foi acrescentada nem removida — só nomeada. */
  const motivoBloqueio = saving
    ? "Salvando…"
    : !email
      ? "Informe o e-mail do colaborador"
      : permissions.length === 0
        ? "Marque ao menos uma permissão"
        : null;

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
      // 9.86 — a régua: 4xx mostra a frase do servidor (é frase de produto),
      // 5xx vira frase da casa. Antes, um 500 desta rota exibia ao produtor a
      // `error.message` da exceção — que nas rotas que fazem
      // `error instanceof Error ? error.message` carrega detalhe de Prisma.
      setError(await mensagemDeErro(r, "Não foi possível salvar"));
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
        className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
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
          {/* 9.83 — o engano ATACADO NA ORIGEM. Editar uma linha revogada salva
              as permissões e devolve "Colaborador atualizado" — mas o PATCH deste
              modal não manda `status`, então o acesso continua inexistente. O
              produtor saía daqui achando que tinha restaurado alguém. Dizer isso
              custa uma frase; descobrir sozinho custa dias. */}
          {editing?.status === "REVOKED" && (
            <div className="px-3 py-2.5 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg text-sm text-amber-800 dark:text-amber-300">
              Este acesso está <strong>revogado</strong>. Salvar aqui atualiza as
              permissões, mas <strong>não devolve o acesso</strong> — para isso,
              use <strong>Reativar</strong> na lista.
            </div>
          )}

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
                className="w-full px-3 py-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:border-primary/50 disabled:opacity-60"
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
                className="w-full px-3 py-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:border-primary/50"
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
                    className="w-4 h-4 accent-primary"
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
                className="w-4 h-4 accent-primary"
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
                      className="w-4 h-4 accent-primary"
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

          {/* 9.85 — o motivo VISÍVEL. O `title` do botão sozinho não bastaria:
              não existe hover no celular, e leitor de tela não anuncia `title`
              de forma confiável. Só aparece quando não há erro de servidor na
              tela, para não empilhar dois avisos concorrentes. */}
          {!error && motivoBloqueio && !saving && (
            <p
              id="motivo-bloqueio"
              className="text-xs text-gray-500 dark:text-gray-400"
            >
              {motivoBloqueio} para {editing ? "salvar" : "enviar o convite"}.
            </p>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 dark:border-white/10 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg"
          >
            Cancelar
          </button>
          {/* 9.85 — o botão continua desabilitado pelas MESMAS três condições;
              o que muda é o usuário saber QUAL delas o está travando. Antes:
              três causas, zero ditas — e a de permissão é a menos óbvia, porque
              o campo fica longe do botão. */}
          <button
            onClick={save}
            disabled={saving || !email || permissions.length === 0}
            title={motivoBloqueio ?? undefined}
            aria-describedby={motivoBloqueio ? "motivo-bloqueio" : undefined}
            className="px-4 py-2 bg-primary hover:bg-primary disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg"
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
