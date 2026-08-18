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

/* ───── A METADE QUE FALTAVA NA RÉGUA (E3.12) ─────

   `mensagemDeErro` acima exige um `Response` na assinatura — ela modela "o
   servidor respondeu e recusou". O caso "o servidor NUNCA respondeu" não estava
   no desenho: quando o `fetch` REJEITA (offline, DNS, TLS, CORS, servidor fora
   do ar, extensão ou proxy bloqueando), não existe `res` e a função não pode nem
   ser chamada. A exceção subia, saía do handler, e o estado otimista ficava de
   pé sem uma palavra — foi assim que o teste do menu reprovou um fix que já
   tratava 500 corretamente.

   ⚠️ ESTE HELPER NÃO DECIDE O QUE A TELA FAZ. Ele normaliza a FALHA, não o
   fluxo: devolve `{ok:false, mensagem}` e o handler continua dono do próprio
   rollback. Um helper que engolisse o fluxo apagaria justamente a parte que
   varia entre os nove call-sites.

   ⚠️ A mensagem de rede NÃO crava a causa. O mesmo `TypeError` aparece com CORS
   ou com o servidor fora do ar, quando a conexão do usuário está ótima. Ela diz
   o que FAZER, não o que aconteceu. */
export async function fetchJson(
  input: RequestInfo | URL,
  init?: RequestInit,
  fallback = "Não foi possível concluir"
): Promise<{ ok: true; data: unknown } | { ok: false; mensagem: string }> {
  let res: Response;
  try {
    res = await fetch(input, init);
  } catch {
    return { ok: false, mensagem: `${fallback}. Verifique sua conexão e tente de novo.` };
  }
  // A régua do 9.86 continua intacta e continua verdadeira: ela só é chamada
  // DEPOIS de existir um `res`, que é a condição que ela sempre pressupôs.
  if (!res.ok) return { ok: false, mensagem: await mensagemDeErro(res, fallback) };
  // ⚠️ 204 e respostas sem corpo são normais aqui (DELETE, PATCH): `data` vira
  // null em vez de estourar, e quem não usa o corpo simplesmente o ignora.
  return { ok: true, data: await res.json().catch(() => null) };
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
