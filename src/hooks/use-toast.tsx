"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/* A régua de aviso do app (9.86).

   Antes disto havia **26 implementações locais** de `showToast`, cada página
   redeclarando a sua — e divergindo até na forma de dizer "isto é erro":
   `showToast(msg)` · `showToast(msg, error = false)` · `showToast(msg, ok)` ·
   `showToast(msg, variant: "default" | "red")`. Quatro contratos para o mesmo
   aviso.

   Molde: `use-confirm.tsx` — hook que devolve a função E o componente. Mesma
   forma de propósito: quem já usa o `confirm` não precisa aprender nada novo.

   ⚠️ ADOÇÃO INCREMENTAL. Este hook NÃO migra as 26 telas de uma vez — migração
   em massa de toast é diff enorme sem prova por tela. Ele entra onde há prova
   (9.85 e 9.94); o resto é item próprio. */

export type ToastVariant = "info" | "success" | "error";

interface Toast {
  msg: string;
  variant: ToastVariant;
  /** Muda a cada chamada — reinicia a animação quando o mesmo texto repete. */
  key: number;
}

const DURACAO_MS = 4000;

/* ───── A regra de exibição (§9) ─────
   O que o servidor manda em 4xx é frase de PRODUTO ("Sem permissão",
   "Não matriculado neste curso", "Post aguardando aprovação") — mostrar cru é o
   que faz o usuário entender a causa.

   ⚠️ 5xx NUNCA passa cru. Há rotas que fazem
   `error instanceof Error ? error.message : ...`, o que devolve mensagem de
   exceção — inclusive de Prisma, com nome de tabela e coluna. Isso vira frase da
   casa, e o detalhe fica no log do servidor.

   Uso: `showToast(await mensagemDeErro(res, "Não foi possível convidar"))`. */
export async function mensagemDeErro(
  res: Response,
  fallback: string
): Promise<string> {
  if (res.status >= 500) return `${fallback}. Tente novamente em instantes.`;
  const corpo = await res.json().catch(() => null);
  const doServidor = typeof corpo?.error === "string" ? corpo.error.trim() : "";
  return doServidor || fallback;
}

export function useToast() {
  const [toast, setToast] = useState<Toast | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  const showToast = useCallback((msg: string, variant: ToastVariant = "info") => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ msg, variant, key: Date.now() });
    timer.current = setTimeout(() => setToast(null), DURACAO_MS);
  }, []);

  const Toast = useCallback(() => {
    if (!toast) return null;
    // O neutro é byte-a-byte o visual dos 26 toasts atuais (fundo escuro no
    // claro, claro no escuro) — migrar tela não pode MUDAR o que já funciona.
    // O vermelho é o que não existia: hoje "salvo" e "falhou" têm a mesma cara.
    const cor =
      toast.variant === "error"
        ? "bg-red-600 text-white"
        : toast.variant === "success"
          ? "bg-emerald-600 text-white"
          : "bg-gray-900 dark:bg-white text-white dark:text-gray-900";
    return (
      <div
        key={toast.key}
        // `assertive` só no erro: aviso de sucesso não deve interromper o leitor
        // de tela no meio de outra leitura.
        role="status"
        aria-live={toast.variant === "error" ? "assertive" : "polite"}
        // `animate-fade-in-up` é a única animação de entrada que o projeto tem
        // (globals.css:76) — reusada em vez de inventar uma classe nova.
        className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-lg shadow-lg text-sm font-medium max-w-[90vw] text-center animate-fade-in-up motion-reduce:animate-none ${cor}`}
      >
        {toast.msg}
      </div>
    );
  }, [toast]);

  return { showToast, Toast };
}
