"use client";

import { useCallback, useEffect, useState } from "react";
import { useConfirm } from "@/hooks/use-confirm";

interface QuizOption {
  id: string;
  text: string;
  isCorrect: boolean;
  sortOrder: number;
}

interface QuizQuestion {
  id: string;
  text: string;
  sortOrder: number;
  options: QuizOption[];
}

interface Quiz {
  id: string;
  title: string | null;
  passingScore: number;
  showAnswers: boolean;
  questions: QuizQuestion[];
}

interface Props {
  lessonId: string;
}

export function QuizManager({ lessonId }: Props) {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuizQuestion | null>(null);
  const { confirm, ConfirmDialog } = useConfirm();

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2600);
  }

  const load = useCallback(() => {
    fetch(`/api/producer/lessons/${lessonId}/quiz`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setQuiz(d?.quiz ?? null))
      .finally(() => setLoading(false));
  }, [lessonId]);

  useEffect(() => { load(); }, [load]);

  async function createQuiz() {
    setSaving(true);
    try {
      const res = await fetch(`/api/producer/lessons/${lessonId}/quiz`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const d = await res.json();
        setQuiz(d.quiz);
        showToast("Quiz criado");
      }
    } finally {
      setSaving(false);
    }
  }

  async function updateQuiz(data: Partial<Pick<Quiz, "passingScore" | "showAnswers">>) {
    if (!quiz) return;
    const res = await fetch(`/api/producer/lessons/${lessonId}/quiz`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const d = await res.json();
      setQuiz(d.quiz);
    }
  }

  async function deleteQuiz() {
    if (!(await confirm({ title: "Excluir quiz", message: "Excluir o quiz e todas as perguntas?", variant: "danger", confirmText: "Excluir" }))) return;
    const res = await fetch(`/api/producer/lessons/${lessonId}/quiz`, { method: "DELETE" });
    if (res.ok) {
      setQuiz(null);
      showToast("Quiz excluído");
    }
  }

  async function deleteQuestion(qId: string) {
    if (!(await confirm({ title: "Excluir pergunta", message: "Excluir esta pergunta?", variant: "danger", confirmText: "Excluir" }))) return;
    const res = await fetch(`/api/producer/lessons/${lessonId}/quiz/questions/${qId}`, { method: "DELETE" });
    if (res.ok) load();
  }

  if (loading) {
    return <div className="h-20 bg-gray-100 dark:bg-gray-900 rounded-xl animate-pulse" />;
  }

  if (!quiz) {
    return (
      <div className="border-2 border-dashed border-gray-300 dark:border-white/10 rounded-xl p-6 text-center">
        <p className="text-sm text-gray-500 mb-3">Nenhum quiz nesta aula</p>
        <button
          type="button"
          onClick={createQuiz}
          disabled={saving}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg disabled:opacity-50"
        >
          Adicionar quiz
        </button>
        <ConfirmDialog />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Quiz</h4>
          <button
            type="button"
            onClick={deleteQuiz}
            className="text-xs text-red-500 hover:text-red-400"
          >
            Excluir quiz
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <span className="text-gray-600 dark:text-gray-400">Nota mínima:</span>
            <input
              type="number"
              min={0}
              max={100}
              value={quiz.passingScore}
              onChange={(e) => updateQuiz({ passingScore: Number(e.target.value) })}
              className="w-16 px-2 py-1 bg-gray-50 dark:bg-white/[0.04] border border-gray-300 dark:border-white/[0.08] rounded-lg text-sm text-gray-900 dark:text-white text-center focus:outline-none focus:border-blue-500/50"
            />
            <span className="text-gray-500">%</span>
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={quiz.showAnswers}
              onChange={(e) => updateQuiz({ showAnswers: e.target.checked })}
              className="rounded border-gray-300 dark:border-white/20 text-blue-600"
            />
            <span className="text-gray-600 dark:text-gray-400">Mostrar respostas corretas</span>
          </label>
        </div>
      </div>

      {quiz.questions.map((q) => (
        <div key={q.id} className="bg-white dark:bg-white/[0.03] border border-gray-200 dark:border-white/[0.06] rounded-xl p-4">
          <div className="flex items-start justify-between gap-3 mb-3">
            <p className="text-sm font-medium text-gray-900 dark:text-white">{q.text}</p>
            <div className="flex gap-2 flex-shrink-0">
              <button
                type="button"
                onClick={() => { setEditingQuestion(q); setModalOpen(true); }}
                className="text-xs text-blue-500 hover:text-blue-400"
              >
                Editar
              </button>
              <button
                type="button"
                onClick={() => deleteQuestion(q.id)}
                className="text-xs text-red-500 hover:text-red-400"
              >
                Excluir
              </button>
            </div>
          </div>
          <div className="space-y-1.5">
            {q.options.map((o) => (
              <div
                key={o.id}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${
                  o.isCorrect
                    ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                    : "text-gray-600 dark:text-gray-400"
                }`}
              >
                <div className={`w-3.5 h-3.5 rounded-full border flex-shrink-0 flex items-center justify-center ${
                  o.isCorrect ? "border-emerald-500 bg-emerald-500" : "border-gray-300 dark:border-gray-600"
                }`}>
                  {o.isCorrect && (
                    <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                {o.text}
              </div>
            ))}
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={() => { setEditingQuestion(null); setModalOpen(true); }}
        className="w-full py-3 border-2 border-dashed border-gray-300 dark:border-white/10 rounded-xl text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white hover:border-gray-400 dark:hover:border-white/20 transition-colors"
      >
        + Adicionar pergunta
      </button>

      {modalOpen && (
        <QuestionModal
          lessonId={lessonId}
          question={editingQuestion}
          onClose={() => { setModalOpen(false); setEditingQuestion(null); }}
          onSaved={() => { setModalOpen(false); setEditingQuestion(null); load(); }}
        />
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-4 py-3 rounded-lg shadow-2xl text-sm font-medium">
          {toast}
        </div>
      )}
      <ConfirmDialog />
    </div>
  );
}

function QuestionModal({
  lessonId,
  question,
  onClose,
  onSaved,
}: {
  lessonId: string;
  question: QuizQuestion | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [text, setText] = useState(question?.text ?? "");
  const [options, setOptions] = useState<Array<{ text: string; isCorrect: boolean }>>(
    question?.options.map((o) => ({ text: o.text, isCorrect: o.isCorrect })) ??
    [{ text: "", isCorrect: true }, { text: "", isCorrect: false }]
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setCorrect(idx: number) {
    setOptions((prev) => prev.map((o, i) => ({ ...o, isCorrect: i === idx })));
  }

  function updateOptionText(idx: number, val: string) {
    setOptions((prev) => prev.map((o, i) => (i === idx ? { ...o, text: val } : o)));
  }

  function addOption() {
    if (options.length >= 6) return;
    setOptions((prev) => [...prev, { text: "", isCorrect: false }]);
  }

  function removeOption(idx: number) {
    if (options.length <= 2) return;
    setOptions((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      if (!next.some((o) => o.isCorrect)) next[0].isCorrect = true;
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) { setError("Texto obrigatório"); return; }
    if (options.some((o) => !o.text.trim())) { setError("Todas as opções precisam de texto"); return; }
    setError(null);
    setSaving(true);
    try {
      const url = question
        ? `/api/producer/lessons/${lessonId}/quiz/questions/${question.id}`
        : `/api/producer/lessons/${lessonId}/quiz/questions`;
      const res = await fetch(url, {
        method: question ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim(), options }),
      });
      if (res.ok) {
        onSaved();
      } else {
        const d = await res.json().catch(() => ({}));
        setError(d.error || "Erro ao salvar");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-white dark:bg-[#141416] border border-gray-200 dark:border-[#28282e] rounded-2xl p-6 max-w-lg w-full mx-4 shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {question ? "Editar pergunta" : "Nova pergunta"}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Pergunta</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-white/[0.04] border border-gray-300 dark:border-white/[0.08] rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500/50 resize-none"
              placeholder="Digite a pergunta..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Opções</label>
            <div className="space-y-2">
              {options.map((o, i) => (
                <div key={i} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCorrect(i)}
                    className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                      o.isCorrect
                        ? "border-emerald-500 bg-emerald-500"
                        : "border-gray-300 dark:border-gray-600 hover:border-emerald-400"
                    }`}
                    title="Marcar como correta"
                  >
                    {o.isCorrect && (
                      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                  <input
                    type="text"
                    value={o.text}
                    onChange={(e) => updateOptionText(i, e.target.value)}
                    className="flex-1 px-3 py-2 bg-gray-50 dark:bg-white/[0.04] border border-gray-300 dark:border-white/[0.08] rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:border-blue-500/50"
                    placeholder={`Opção ${i + 1}`}
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeOption(i)}
                      className="p-1 text-gray-400 hover:text-red-400"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
            </div>
            {options.length < 6 && (
              <button
                type="button"
                onClick={addOption}
                className="mt-2 text-xs text-blue-500 hover:text-blue-400"
              >
                + Adicionar opção
              </button>
            )}
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-[#1d1d21] hover:bg-gray-200 dark:hover:bg-[#28282e] text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl border border-gray-200 dark:border-[#28282e]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl disabled:opacity-50"
            >
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
