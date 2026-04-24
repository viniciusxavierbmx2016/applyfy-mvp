"use client";

import { useEffect, useState, useRef } from "react";

const DISMISS_KEY = "pwa_install_dismissed";
const DISMISS_DAYS = 7;

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isIOS() {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && (navigator as unknown as { standalone: boolean }).standalone)
  );
}

function isDismissed(): boolean {
  try {
    const val = localStorage.getItem(DISMISS_KEY);
    if (!val) return false;
    const ts = parseInt(val, 10);
    if (isNaN(ts)) return false;
    return Date.now() - ts < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

function saveDismiss() {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {}
}

export function InstallPrompt() {
  const [show, setShow] = useState(false);
  const [showIOS, setShowIOS] = useState(false);
  const deferredRef = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isStandalone() || isDismissed()) return;

    if (isIOS()) {
      setShowIOS(true);
      return;
    }

    function handlePrompt(e: Event) {
      e.preventDefault();
      deferredRef.current = e as BeforeInstallPromptEvent;
      setShow(true);
    }

    window.addEventListener("beforeinstallprompt", handlePrompt);
    return () => window.removeEventListener("beforeinstallprompt", handlePrompt);
  }, []);

  async function handleInstall() {
    const prompt = deferredRef.current;
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") {
      setShow(false);
    }
    deferredRef.current = null;
  }

  function handleDismiss() {
    saveDismiss();
    setShow(false);
    setShowIOS(false);
  }

  if (!show && !showIOS) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 p-3 sm:p-4 animate-slide-up">
      <div className="max-w-lg mx-auto bg-indigo-600 rounded-2xl shadow-2xl shadow-indigo-900/40 px-4 py-3 flex items-center gap-3">
        <div className="flex-shrink-0 w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
          <svg
            className="w-5 h-5 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
            />
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          {showIOS ? (
            <p className="text-white text-sm leading-snug">
              Toque em{" "}
              <svg className="inline w-4 h-4 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>{" "}
              <strong>Compartilhar</strong> e depois{" "}
              <strong>&quot;Adicionar à Tela de Início&quot;</strong>
            </p>
          ) : (
            <p className="text-white text-sm font-medium">
              Instale o app para uma experiência melhor
            </p>
          )}
        </div>

        {!showIOS && (
          <button
            onClick={handleInstall}
            className="flex-shrink-0 px-4 py-1.5 bg-white text-indigo-700 text-xs font-bold rounded-lg hover:bg-indigo-50 transition"
          >
            Instalar
          </button>
        )}

        <button
          onClick={handleDismiss}
          className="flex-shrink-0 p-1 text-white/70 hover:text-white transition"
          aria-label="Fechar"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
