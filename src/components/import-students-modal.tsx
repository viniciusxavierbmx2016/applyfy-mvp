"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface CourseOption {
  id: string;
  title: string;
}

interface ImportError {
  line: number;
  email: string;
  reason: string;
}

interface ImportSummary {
  total: number;
  created: number;
  alreadyExisted: number;
  reactivated: number;
  errors: ImportError[];
  enrollmentsCreated: number;
  enrollmentsSkipped: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  courses: CourseOption[];
}

type Step = 1 | 2 | 3;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ImportStudentsModal({ open, onClose, courses }: Props) {
  const [step, setStep] = useState<Step>(1);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState("");
  const [selectedCourses, setSelectedCourses] = useState<Set<string>>(
    new Set()
  );
  const [importing, setImporting] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [downloadCsv, setDownloadCsv] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [errorsExpanded, setErrorsExpanded] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      setStep(1);
      setFile(null);
      setFileError("");
      setSelectedCourses(new Set());
      setImporting(false);
      setSummary(null);
      setDownloadCsv(null);
      setApiError(null);
      setErrorsExpanded(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !importing) onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, importing, onClose]);

  const handleFile = useCallback((f: File | null) => {
    setFileError("");
    if (!f) return;
    if (!f.name.endsWith(".csv")) {
      setFileError("Apenas arquivos .csv são aceitos");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setFileError("Arquivo excede 10MB");
      return;
    }
    setFile(f);
  }, []);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }

  function toggleCourse(id: string) {
    setSelectedCourses((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleImport() {
    if (!file || selectedCourses.size === 0) return;
    setStep(3);
    setImporting(true);
    setApiError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append(
        "courseIds",
        JSON.stringify(Array.from(selectedCourses))
      );

      const res = await fetch("/api/producer/students/import", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setApiError(body.error || `Erro ${res.status}`);
        return;
      }

      const data = await res.json();
      setSummary(data.summary);
      setDownloadCsv(data.downloadCsv || null);
    } catch {
      setApiError("Erro de rede. Tente novamente.");
    } finally {
      setImporting(false);
    }
  }

  function handleDownload() {
    if (!downloadCsv) return;
    const bytes = Uint8Array.from(atob(downloadCsv), (c) => c.charCodeAt(0));
    const blob = new Blob([bytes], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `alunos_importados_${date}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={() => !importing && onClose()}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Importar Alunos
          </h2>
          {!importing && (
            <button
              onClick={onClose}
              className="p-1.5 text-gray-500 hover:text-gray-900 dark:hover:text-white transition"
              aria-label="Fechar"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 px-6 py-3 border-b border-gray-100 dark:border-gray-800/50">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                  step >= s
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                }`}
              >
                {s}
              </div>
              {s < 3 && (
                <div
                  className={`w-8 h-0.5 rounded-full transition-colors ${
                    step > s
                      ? "bg-blue-600"
                      : "bg-gray-200 dark:bg-gray-700"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <div className="px-6 py-5">
          {/* STEP 1 — File upload */}
          {step === 1 && (
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Selecione um arquivo CSV com as colunas <strong>email</strong>{" "}
                e opcionalmente <strong>nome</strong>.
              </p>

              {!file ? (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => inputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                    dragOver
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10"
                      : "border-gray-300 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500"
                  }`}
                >
                  <svg
                    className="w-10 h-10 mx-auto text-gray-400 dark:text-gray-500 mb-3"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                    Arraste seu CSV aqui ou clique para selecionar
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Máximo 500 linhas · 10MB
                  </p>
                  <input
                    ref={inputRef}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={(e) => handleFile(e.target.files?.[0] || null)}
                  />
                </div>
              ) : (
                <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl">
                  <svg
                    className="w-8 h-8 text-green-500 flex-shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatBytes(file.size)}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setFile(null);
                      setFileError("");
                      if (inputRef.current) inputRef.current.value = "";
                    }}
                    className="text-xs text-red-500 hover:text-red-400 font-medium"
                  >
                    Remover
                  </button>
                </div>
              )}

              {fileError && (
                <p className="mt-2 text-sm text-red-500">{fileError}</p>
              )}

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setStep(2)}
                  disabled={!file}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Próximo
                </button>
              </div>
            </div>
          )}

          {/* STEP 2 — Course selection */}
          {step === 2 && (
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Em quais cursos matricular os alunos?
              </p>

              {courses.length === 0 ? (
                <p className="text-sm text-gray-500 py-4">
                  Nenhum curso disponível.
                </p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {courses.map((c) => (
                    <label
                      key={c.id}
                      className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                    >
                      <input
                        type="checkbox"
                        checked={selectedCourses.has(c.id)}
                        onChange={() => toggleCourse(c.id)}
                        className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 bg-white dark:bg-gray-800"
                      />
                      <span className="text-sm text-gray-900 dark:text-white flex-1 min-w-0 truncate">
                        {c.title}
                      </span>
                    </label>
                  ))}
                </div>
              )}

              <div className="mt-6 flex justify-between">
                <button
                  onClick={() => setStep(1)}
                  className="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition"
                >
                  Voltar
                </button>
                <button
                  onClick={handleImport}
                  disabled={selectedCourses.size === 0}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Importar
                </button>
              </div>
            </div>
          )}

          {/* STEP 3 — Result */}
          {step === 3 && (
            <div>
              {importing ? (
                <div className="py-12 flex flex-col items-center gap-4">
                  <div className="w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Importando alunos...
                  </p>
                </div>
              ) : apiError ? (
                <div className="py-8 text-center">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-red-500/10 flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-red-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </div>
                  <p className="text-sm text-red-500 font-medium">
                    {apiError}
                  </p>
                  <div className="mt-6 flex justify-center gap-3">
                    <button
                      onClick={() => {
                        setStep(2);
                        setApiError(null);
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition"
                    >
                      Voltar
                    </button>
                    <button
                      onClick={onClose}
                      className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm font-medium rounded-lg transition hover:bg-gray-300 dark:hover:bg-gray-600"
                    >
                      Fechar
                    </button>
                  </div>
                </div>
              ) : summary ? (
                <div>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                      <svg
                        className="w-5 h-5 text-green-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                    <div>
                      <p className="text-base font-semibold text-gray-900 dark:text-white">
                        Importação concluída
                      </p>
                      <p className="text-xs text-gray-500">
                        {summary.total} aluno
                        {summary.total !== 1 ? "s" : ""} processado
                        {summary.total !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <StatCard
                      label="Criados"
                      value={summary.created}
                      color="green"
                    />
                    <StatCard
                      label="Já existiam"
                      value={summary.alreadyExisted}
                      color="blue"
                    />
                    <StatCard
                      label="Reativados"
                      value={summary.reactivated}
                      color="amber"
                    />
                    <StatCard
                      label="Erros"
                      value={summary.errors.length}
                      color="red"
                    />
                  </div>

                  <div className="flex gap-4 text-xs text-gray-500 mb-4 px-1">
                    <span>
                      Matrículas criadas:{" "}
                      <strong className="text-gray-900 dark:text-white">
                        {summary.enrollmentsCreated}
                      </strong>
                    </span>
                    <span>
                      Já matriculados:{" "}
                      <strong className="text-gray-900 dark:text-white">
                        {summary.enrollmentsSkipped}
                      </strong>
                    </span>
                  </div>

                  {summary.errors.length > 0 && (
                    <div className="mb-4">
                      <button
                        onClick={() => setErrorsExpanded(!errorsExpanded)}
                        className="flex items-center gap-1.5 text-xs font-medium text-red-500 hover:text-red-400 transition"
                      >
                        <svg
                          className={`w-3 h-3 transition-transform ${errorsExpanded ? "rotate-90" : ""}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2.5}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                        Ver {summary.errors.length} erro
                        {summary.errors.length !== 1 ? "s" : ""}
                      </button>
                      {errorsExpanded && (
                        <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
                          {summary.errors.map((err, i) => (
                            <div
                              key={i}
                              className="flex items-start gap-2 text-xs bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-lg px-3 py-2"
                            >
                              <span className="text-red-400 font-mono flex-shrink-0">
                                L{err.line}
                              </span>
                              <span className="text-gray-700 dark:text-gray-300 truncate">
                                {err.email}
                              </span>
                              <span className="text-red-500 flex-shrink-0 ml-auto">
                                {err.reason}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-2 mt-5">
                    {downloadCsv && (
                      <button
                        onClick={handleDownload}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3"
                          />
                        </svg>
                        Baixar CSV com acessos
                      </button>
                    )}
                    <button
                      onClick={onClose}
                      className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm font-medium rounded-lg transition"
                    >
                      Fechar
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "green" | "blue" | "amber" | "red";
}) {
  const styles = {
    green:
      "bg-green-50 dark:bg-green-500/10 border-green-200 dark:border-green-500/20 text-green-700 dark:text-green-400",
    blue: "bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/20 text-blue-700 dark:text-blue-400",
    amber:
      "bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-400",
    red: "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400",
  };
  return (
    <div className={`border rounded-xl px-3 py-2.5 ${styles[color]}`}>
      <p className="text-xl font-bold">{value}</p>
      <p className="text-xs opacity-80">{label}</p>
    </div>
  );
}
