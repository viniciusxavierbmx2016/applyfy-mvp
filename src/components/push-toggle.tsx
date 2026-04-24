"use client";

import { usePushNotifications } from "@/hooks/use-push-notifications";

export function PushToggle() {
  const { permission, isSubscribed, isLoading, subscribe, unsubscribe } =
    usePushNotifications();

  if (typeof window === "undefined" || !("Notification" in window)) {
    return (
      <p className="text-sm text-gray-500">
        Seu navegador não suporta notificações push.
      </p>
    );
  }

  if (permission === "denied") {
    return (
      <div className="flex items-center gap-3">
        <div className="w-9 h-5 bg-gray-300 dark:bg-gray-700 rounded-full opacity-50" />
        <div>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Notificações push
          </p>
          <p className="text-xs text-red-500">
            Bloqueadas pelo navegador. Altere nas configurações do browser.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => (isSubscribed ? unsubscribe() : subscribe())}
        disabled={isLoading}
        className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ${
          isSubscribed
            ? "bg-blue-600"
            : "bg-gray-300 dark:bg-gray-700"
        } ${isLoading ? "opacity-50" : ""}`}
      >
        <span
          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 mt-0.5 ${
            isSubscribed ? "translate-x-4 ml-0.5" : "translate-x-0.5"
          }`}
        />
      </button>
      <div>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          Notificações push
        </p>
        <p className="text-xs text-gray-500">
          {isLoading
            ? "Processando..."
            : isSubscribed
              ? "Ativadas — você receberá alertas de lives e avisos"
              : "Desativadas"}
        </p>
      </div>
    </div>
  );
}
