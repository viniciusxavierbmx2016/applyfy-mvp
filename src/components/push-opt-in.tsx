"use client";

import { useState, useEffect } from "react";
import { usePushNotifications } from "@/hooks/use-push-notifications";

const DISMISSED_KEY = "push-opt-in-dismissed";

export function PushOptIn() {
  const { permission, isSubscribed, isLoading, subscribe } =
    usePushNotifications();
  const [dismissed, setDismissed] = useState(true);
  const [toast, setToast] = useState("");

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISSED_KEY) === "1");
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  if (
    typeof window === "undefined" ||
    !("Notification" in window) ||
    permission === "denied" ||
    permission === "granted" ||
    isSubscribed ||
    dismissed
  ) {
    return toast ? (
      <div className="fixed top-4 right-4 z-[60] bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium">
        {toast}
      </div>
    ) : null;
  }

  async function handleActivate() {
    await subscribe();
    setToast("Notificações ativadas!");
    setDismissed(true);
  }

  function handleDismiss() {
    localStorage.setItem(DISMISSED_KEY, "1");
    setDismissed(true);
  }

  return (
    <>
      {toast && (
        <div className="fixed top-4 right-4 z-[60] bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-medium">
          {toast}
        </div>
      )}
      <div className="mx-4 sm:mx-6 lg:mx-8 mt-3 bg-blue-600/10 border border-blue-500/30 rounded-xl px-4 py-3 flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-800 dark:text-gray-200">
            <span className="mr-1.5">🔔</span>
            Ative as notificações para saber quando lives começarem e receber
            avisos importantes.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleActivate}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition"
          >
            {isLoading ? "Ativando..." : "Ativar"}
          </button>
          <button
            onClick={handleDismiss}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 px-3 py-1.5 text-sm transition"
          >
            Agora não
          </button>
        </div>
      </div>
    </>
  );
}
