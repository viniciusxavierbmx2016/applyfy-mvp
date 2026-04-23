"use client";

import { useCallback, useEffect, useState } from "react";

interface QuizOption {
  id: string;
  text: string;
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

interface AttemptResult {
  questionId: string;
  selectedOptionId: string | null;
  correctOptionId: string | null;
  isCorrect: boolean;
}

interface LastAttempt {
  score: number;
  passed: boolean;
  answers: AttemptResult[];
}

interface SubmitResponse {
  score: number;
  passed: boolean;
  total: number;
  correct: number;
  results: AttemptResult[];
}

interface Props {
  lessonId: string;
}

export function LessonQuiz({ lessonId }: Props) {
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [lastAttempt, setLastAttempt] = useState<LastAttempt | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<SubmitResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch(`/api/lessons/${lessonId}/quiz`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) {
          setQuiz(d.quiz ?? null);
          setLastAttempt(d.lastAttempt ?? null);
        }
      })
      .finally(() => setLoading(false));
  }, [lessonId]);

  useEffect(() => { load(); }, [load]);

  function selectOption(questionId: string, optionId: string) {
    if (result) return;
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  }

  async function handleSubmit() {
    if (!quiz) return;
    const unanswered = quiz.questions.filter((q) => !answers[q.id]);
    if (unanswered.length > 0) {
      setError("Responda todas as perguntas antes de enviar.");
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/lessons/${lessonId}/quiz`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: quiz.questions.map((q) => ({
            questionId: q.id,
            selectedOptionId: answers[q.id],
          })),
        }),
      });
      if (res.ok) {
        const data: SubmitResponse = await res.json();
        setResult(data);
      } else {
        const d = await res.json().catch(() => ({}));
        setError(d.error || "Erro ao enviar respostas");
      }
    } finally {
      setSubmitting(false);
    }
  }

  function retry() {
    setResult(null);
    setAnswers({});
    setError(null);
  }

  if (loading) return null;
  if (!quiz || quiz.questions.length === 0) return null;

  const showingResult = !!result;
  const showingLastAttempt = !showingResult && !!lastAttempt;

  function getOptionState(questionId: string, optionId: string): "default" | "selected" | "correct" | "incorrect" {
    if (showingResult && result) {
      const r = result.results.find((x) => x.questionId === questionId);
      if (!r) return "default";
      if (quiz!.showAnswers) {
        if (r.correctOptionId === optionId) return "correct";
        if (r.selectedOptionId === optionId && !r.isCorrect) return "incorrect";
      } else {
        if (r.selectedOptionId === optionId) return r.isCorrect ? "correct" : "incorrect";
      }
      return "default";
    }
    if (answers[questionId] === optionId) return "selected";
    return "default";
  }

  return (
    <div className="mt-8">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
        Quiz
        {quiz.passingScore > 0 && (
          <span className="text-xs font-normal text-gray-500">
            (mínimo {quiz.passingScore}% para aprovação)
          </span>
        )}
      </h3>

      {showingLastAttempt && !result && (
        <div className={`mb-4 p-3 rounded-xl text-sm font-medium ${
          lastAttempt!.passed
            ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
            : "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400"
        }`}>
          {lastAttempt!.passed
            ? `Você já passou neste quiz com ${lastAttempt!.score}%. Pode tentar novamente se quiser.`
            : `Última tentativa: ${lastAttempt!.score}%. Tente novamente!`
          }
        </div>
      )}

      {showingResult && result && (
        <div className={`mb-4 p-4 rounded-xl ${
          result.passed
            ? "bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20"
            : "bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20"
        }`}>
          <div className="flex items-center gap-3">
            {result.passed ? (
              <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            )}
            <div>
              <p className={`text-lg font-bold ${result.passed ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"}`}>
                {result.passed ? "Aprovado!" : "Não aprovado"}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {result.correct} de {result.total} corretas ({result.score}%)
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {quiz.questions.map((q, qi) => (
          <div key={q.id} className="bg-white dark:bg-gray-900/60 border border-gray-200 dark:border-white/5 rounded-xl p-4">
            <p className="text-sm font-medium text-gray-900 dark:text-white mb-3">
              <span className="text-gray-500 mr-1.5">{qi + 1}.</span>
              {q.text}
            </p>
            <div className="space-y-2">
              {q.options.map((o) => {
                const state = getOptionState(q.id, o.id);
                const disabled = showingResult;
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => selectOption(q.id, o.id)}
                    disabled={disabled}
                    className={`w-full text-left flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm transition-colors ${
                      state === "correct"
                        ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-500/30"
                        : state === "incorrect"
                        ? "bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 ring-1 ring-red-500/30"
                        : state === "selected"
                        ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 ring-1 ring-indigo-500/30"
                        : "bg-gray-50 dark:bg-white/[0.03] text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.06]"
                    } ${disabled ? "cursor-default" : "cursor-pointer"}`}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                      state === "correct"
                        ? "border-emerald-500 bg-emerald-500"
                        : state === "incorrect"
                        ? "border-red-500 bg-red-500"
                        : state === "selected"
                        ? "border-indigo-500 bg-indigo-500"
                        : "border-gray-300 dark:border-gray-600"
                    }`}>
                      {(state === "selected" || state === "correct" || state === "incorrect") && (
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      )}
                    </div>
                    {o.text}
                    {state === "correct" && (
                      <svg className="w-4 h-4 ml-auto flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    {state === "incorrect" && (
                      <svg className="w-4 h-4 ml-auto flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

      <div className="mt-4 flex gap-3">
        {!showingResult ? (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl disabled:opacity-50 transition-colors"
          >
            {submitting ? "Enviando..." : "Enviar respostas"}
          </button>
        ) : (
          <button
            type="button"
            onClick={retry}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            Tentar novamente
          </button>
        )}
      </div>
    </div>
  );
}
