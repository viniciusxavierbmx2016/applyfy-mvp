import { useEffect, useState } from "react";
import { arrayMove } from "@dnd-kit/sortable";
import type { DragEndEvent } from "@dnd-kit/core";
import { useConfirm } from "@/hooks/use-confirm";
import { mensagemDeErro, useToast } from "@/hooks/use-toast";

/* O menu do curso é editado em DOIS lugares: a página
   `/producer/courses/[id]/menu` e o `CourseMenuManager` embutido na aba
   Personalizar. Até o E3.12 os dois carregavam a MESMA lógica em cópias
   literais — mesmos 6 estados, mesmos 5 handlers, linha por linha.

   ⚠️ Um COMPONENTE só não resolve: a moldura é diferença real (a página tem
   voltar, título e abas; o embutido tem um spinner e nada em volta). O que dá
   para ser único é o HANDLER — e é o que vive aqui. As duas telas continuam
   desenhando o que cada uma precisa.

   ⭐ E foi a duplicata que tornou o defeito caro: o `handleDragEnd` fazia
   `await fetch(...)` sem sequer GUARDAR a resposta. A ordem mudava na tela e
   não no servidor, e ao recarregar voltava — sem uma palavra. Estava assim nas
   duas cópias. Consertar uma e esquecer a outra é a família 9.42/9.54/9.57. */

export interface MenuItem {
  id: string;
  label: string;
  icon: string;
  url: string;
  order: number;
  isDefault: boolean;
  enabled: boolean;
}

export function useCourseMenu(courseId: string) {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newIcon, setNewIcon] = useState("link");
  const [newUrl, setNewUrl] = useState("");
  const { confirm, ConfirmDialog } = useConfirm();
  const { showToast, Toast } = useToast();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/immutability -- JS hoists function declarations; rule's TDZ check is overly strict
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  async function load() {
    setLoading(true);
    const res = await fetch(`/api/courses/${courseId}/menu`);
    if (res.ok) {
      const data = await res.json();
      setItems(data.items);
    }
    // ⚠️ Falha de CARGA continua silenciosa aqui, de propósito: é o padrão do
    // Tier 3 do 9.107 (~91 sítios, "lista vazia sem explicação"), que espera
    // uma régua própria. Inventar um tratamento só neste arquivo criaria a
    // 92ª forma diferente de dizer a mesma coisa.
    setLoading(false);
  }

  /* ⭐ O molde de otimista-com-rollback vem do `handleDeleteMessage` de
     `producer/lives/[id]/page.tsx` — guardar o estado anterior, aplicar na
     hora, e VOLTAR se o servidor recusar. Não foi inventado aqui. */
  async function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const anterior = items;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    const reordered = arrayMove(items, oldIndex, newIndex);
    setItems(reordered);
    const res = await fetch(`/api/courses/${courseId}/menu/reorder`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemIds: reordered.map((i) => i.id) }),
    });
    if (!res.ok) {
      setItems(anterior);
      showToast(await mensagemDeErro(res, "Não foi possível salvar a nova ordem"));
    }
  }

  async function handleUpdate(id: string, patch: Partial<MenuItem>) {
    const anterior = items;
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...patch } : i)));
    const res = await fetch(`/api/courses/${courseId}/menu/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      setItems(anterior);
      showToast(await mensagemDeErro(res, "Não foi possível salvar a alteração"));
    }
  }

  async function handleDelete(id: string) {
    if (
      !(await confirm({
        title: "Excluir item",
        message: "Excluir este item?",
        variant: "danger",
        confirmText: "Excluir",
      }))
    ) {
      return;
    }
    const res = await fetch(`/api/courses/${courseId}/menu/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      showToast(await mensagemDeErro(res, "Não foi possível excluir o item"));
      return;
    }
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  async function handleCreate() {
    if (!newLabel.trim() || !newUrl.trim()) return;
    const res = await fetch(`/api/courses/${courseId}/menu`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: newLabel.trim(),
        icon: newIcon,
        url: newUrl.trim(),
      }),
    });
    if (!res.ok) {
      showToast(await mensagemDeErro(res, "Não foi possível criar o item"));
      return;
    }
    const data = await res.json();
    setItems((prev) => [...prev, data.item]);
    setNewLabel("");
    setNewIcon("link");
    setNewUrl("");
    setCreating(false);
  }

  return {
    items,
    loading,
    creating,
    setCreating,
    newLabel,
    setNewLabel,
    newIcon,
    setNewIcon,
    newUrl,
    setNewUrl,
    load,
    handleDragEnd,
    handleUpdate,
    handleDelete,
    handleCreate,
    ConfirmDialog,
    Toast,
  };
}
