"use client";

import { useEffect, useState, useCallback } from "react";
import { useConfirm } from "@/hooks/use-confirm";
import { CustomSelect } from "@/components/custom-select";
import { HelpTooltip } from "@/components/help-tooltip";
import { ImageLightbox } from "@/components/image-lightbox";
import type {
  AdminPost,
  PendingItem,
  CourseOption,
  CommunityGroup,
} from "./_types";
import { GroupsTab } from "./_components/groups-tab";
import { GroupModal } from "./_components/group-modal";
import { PendingTab } from "./_components/pending-tab";
import { PostsTab } from "./_components/posts-tab";

export default function AdminCommunityPage() {
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [courseFilter, setCourseFilter] = useState<string>("");
  const [groupFilter, setGroupFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [subTab, setSubTab] = useState<"posts" | "groups" | "pending">("posts");
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const { confirm, ConfirmDialog } = useConfirm();

  // Pending moderation state
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Groups state
  const [groups, setGroups] = useState<CommunityGroup[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(false);
  const [groupsForFilter, setGroupsForFilter] = useState<CommunityGroup[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<CommunityGroup | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2600);
  }

  // Load posts
  async function loadPosts(courseId: string, gId?: string) {
    setLoading(true);
    try {
      let url = courseId
        ? `/api/producer/community?courseId=${courseId}`
        : "/api/producer/community";
      if (gId) url += `${courseId ? "&" : "?"}groupId=${gId}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts);
        setCourses(data.courses);
      }
    } finally {
      setLoading(false);
    }
  }

  // Load groups for the groups tab
  const loadGroups = useCallback(async (courseId: string) => {
    if (!courseId) {
      setGroups([]);
      return;
    }
    setGroupsLoading(true);
    try {
      const res = await fetch(
        `/api/producer/community/groups?courseId=${courseId}`
      );
      if (res.ok) {
        const data = await res.json();
        setGroups(data.groups);
      }
    } finally {
      setGroupsLoading(false);
    }
  }, []);

  // Load groups for the filter dropdown
  const loadGroupsForFilter = useCallback(async (courseId: string) => {
    if (!courseId) {
      setGroupsForFilter([]);
      return;
    }
    try {
      const res = await fetch(
        `/api/producer/community/groups?courseId=${courseId}`
      );
      if (res.ok) {
        const data = await res.json();
        setGroupsForFilter(data.groups);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const loadPending = useCallback(async (courseId: string) => {
    setPendingLoading(true);
    try {
      let url = "/api/producer/moderation/pending";
      if (courseId) url += `?courseId=${courseId}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const allItems = (data.items || []) as PendingItem[];
        const communityItems = allItems.filter(
          (i) => i.type === "community_post" || i.type === "community_comment"
        );
        setPendingItems(communityItems);
        setPendingTotal(communityItems.length);
      }
    } finally {
      setPendingLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPosts(courseFilter, groupFilter || undefined);
    loadGroupsForFilter(courseFilter);
    loadPending(courseFilter);
  }, [courseFilter, groupFilter, loadGroupsForFilter, loadPending]);

  useEffect(() => {
    if (subTab === "groups") loadGroups(courseFilter);
  }, [subTab, courseFilter, loadGroups]);

  // Reset group filter when course changes
  useEffect(() => {
    setGroupFilter("");
  }, [courseFilter]);

  async function togglePin(id: string) {
    const res = await fetch(`/api/posts/${id}/pin`, { method: "POST" });
    if (res.ok) {
      const body = await res.json();
      setPosts((prev) => {
        const next = prev.map((p) =>
          p.id === id ? { ...p, pinned: body.pinned } : p
        );
        next.sort((a, b) => {
          if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        });
        return next;
      });
    }
  }

  async function deletePost(id: string) {
    if (
      !(await confirm({
        title: "Excluir post",
        message: "Excluir este post?",
        variant: "danger",
        confirmText: "Excluir",
      }))
    )
      return;
    const res = await fetch(`/api/posts/${id}`, { method: "DELETE" });
    if (res.ok) {
      setPosts((prev) => prev.filter((p) => p.id !== id));
    }
  }

  async function deleteGroup(g: CommunityGroup) {
    if (g.isDefault) return;
    if (
      !(await confirm({
        title: "Excluir grupo",
        message: `Excluir o grupo "${g.name}"? Os posts serão movidos para o grupo Geral.`,
        variant: "danger",
        confirmText: "Excluir",
      }))
    )
      return;
    const res = await fetch(`/api/producer/community/groups/${g.id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setGroups((prev) => prev.filter((gr) => gr.id !== g.id));
      showToast("Grupo excluído");
    }
  }

  async function handleModerate(item: PendingItem, action: "approve" | "reject") {
    const res = await fetch("/api/producer/moderation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: [{ type: item.type, id: item.id }], action }),
    });
    if (res.ok) {
      setPendingItems((prev) => prev.filter((p) => p.id !== item.id));
      setPendingTotal((prev) => prev - 1);
      setSelected((prev) => { const s = new Set(prev); s.delete(item.id); return s; });
      showToast(action === "approve" ? "Aprovado" : "Rejeitado");
      if (action === "approve") loadPosts(courseFilter, groupFilter || undefined);
    }
  }

  async function handleBulkAction(action: "approve" | "reject") {
    if (selected.size === 0) return;
    const items = pendingItems
      .filter((p) => selected.has(p.id))
      .map((p) => ({ type: p.type, id: p.id }));
    const res = await fetch("/api/producer/moderation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items, action }),
    });
    if (res.ok) {
      const ids = new Set(items.map((i) => i.id));
      setPendingItems((prev) => prev.filter((p) => !ids.has(p.id)));
      setPendingTotal((prev) => prev - items.length);
      setSelected(new Set());
      showToast(action === "approve" ? `${items.length} aprovado(s)` : `${items.length} rejeitado(s)`);
      if (action === "approve") loadPosts(courseFilter, groupFilter || undefined);
    }
  }

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id); else s.add(id);
      return s;
    });
  }

  function toggleSelectAll() {
    if (selected.size === pendingItems.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(pendingItems.map((p) => p.id)));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Comunidade
            <HelpTooltip text="Gerencie as postagens, grupos e moderação da comunidade de todos os cursos." />
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Postagens de todos os cursos
          </p>
        </div>
        <CustomSelect
          value={courseFilter}
          onChange={setCourseFilter}
          className="sm:min-w-[200px]"
          options={[
            { value: "", label: "Todos os cursos" },
            ...courses.map((c) => ({ value: c.id, label: c.title })),
          ]}
        />
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-0 border-b border-gray-200 dark:border-white/10">
        <button
          className={`px-4 py-2 text-sm border-b-2 transition ${
            subTab === "posts"
              ? "border-primary text-primary"
              : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          }`}
          onClick={() => setSubTab("posts")}
        >
          Posts
          <HelpTooltip text="Veja todas as postagens da comunidade. Fixe, edite ou exclua posts." />
        </button>
        <button
          className={`px-4 py-2 text-sm border-b-2 transition ${
            subTab === "groups"
              ? "border-primary text-primary"
              : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          }`}
          onClick={() => setSubTab("groups")}
        >
          Grupos
          <HelpTooltip text="Crie e gerencie grupos dentro da comunidade de cada curso." />
        </button>
        <button
          className={`px-4 py-2 text-sm border-b-2 transition flex items-center gap-1.5 ${
            subTab === "pending"
              ? "border-primary text-primary"
              : "border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          }`}
          onClick={() => setSubTab("pending")}
        >
          Pendentes
          <HelpTooltip text="Posts e comentários aguardando aprovação. Aprove ou rejeite em massa." />
          {pendingTotal > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-500 font-bold tabular-nums">
              {pendingTotal}
            </span>
          )}
        </button>
      </div>

      {/* Posts tab */}
      {subTab === "posts" && (
        <PostsTab
          posts={posts}
          loading={loading}
          courseFilter={courseFilter}
          groupFilter={groupFilter}
          groupsForFilter={groupsForFilter}
          onGroupFilterChange={setGroupFilter}
          onTogglePin={togglePin}
          onDeletePost={deletePost}
          setLightboxSrc={setLightboxSrc}
        />
      )}

      {/* Groups tab */}
      {subTab === "groups" && (
        <GroupsTab
          courseId={courseFilter}
          groups={groups}
          loading={groupsLoading}
          onReload={() => loadGroups(courseFilter)}
          onDelete={deleteGroup}
          onEdit={(g) => {
            setEditingGroup(g);
            setModalOpen(true);
          }}
          onCreate={() => {
            setEditingGroup(null);
            setModalOpen(true);
          }}
          showToast={showToast}
        />
      )}

      {/* Pending tab */}
      {subTab === "pending" && (
        <PendingTab
          selected={selected}
          pendingLoading={pendingLoading}
          pendingItems={pendingItems}
          onBulkAction={handleBulkAction}
          onToggleSelectAll={toggleSelectAll}
          onToggleSelected={toggleSelected}
          onModerate={handleModerate}
        />
      )}

      {/* Group modal */}
      {modalOpen && courseFilter && (
        <GroupModal
          courseId={courseFilter}
          group={editingGroup}
          onClose={() => {
            setModalOpen(false);
            setEditingGroup(null);
          }}
          onSaved={() => {
            setModalOpen(false);
            setEditingGroup(null);
            loadGroups(courseFilter);
            showToast(editingGroup ? "Grupo atualizado" : "Grupo criado");
          }}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-4 py-3 rounded-lg shadow-2xl text-sm font-medium">
          {toast}
        </div>
      )}
      <ConfirmDialog />
      {lightboxSrc && (
        <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />
      )}
    </div>
  );
}
