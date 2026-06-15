"use client";

import { useEffect, useState } from "react";
import { useUserStore } from "@/stores/user-store";

const TIMEOUT_MS = 8000;
// Backoff (ms) for transient network/5xx failures. Each entry = one retry on
// top of the initial attempt; isLoading stays true across them (no false
// skeleton flip). Exhausting them surfaces the retry overlay.
const NETWORK_BACKOFF = [300, 900, 2000];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const setUser = useUserStore((s) => s.setUser);
  const setLoading = useUserStore((s) => s.setLoading);
  const setAuthError = useUserStore((s) => s.setAuthError);
  const authError = useUserStore((s) => s.authError);
  // Bumping this re-runs the effect (the "Tentar novamente" button).
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const controllers: AbortController[] = [];
    const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

    // One /api/auth/me call with an 8s timeout. On 200 it commits the user.
    async function attempt(): Promise<"ok" | "unauth" | "fail"> {
      const controller = new AbortController();
      controllers.push(controller);
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      try {
        const res = await fetch("/api/auth/me", { signal: controller.signal });
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) {
            setUser(
              data.user,
              data.collaborator ?? null,
              data.workspace ?? null,
              data.adminPermissions ?? []
            );
          }
          return "ok";
        }
        if (res.status === 401) return "unauth";
        return "fail"; // 5xx / other non-ok
      } catch {
        return "fail"; // network error or timeout abort
      } finally {
        clearTimeout(timer);
      }
    }

    async function run() {
      if (cancelled) return;
      setLoading(true);

      let networkRetry = 0;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        if (cancelled) return;
        const r = await attempt();
        if (r === "ok") return;

        if (r === "unauth") {
          // Post-signup race: the just-minted session may not be readable on
          // the very first call. Retry once after a short delay; a second 401
          // means genuinely logged out → setUser(null) so the page can route
          // to login. This is NOT an error state (no overlay).
          await sleep(400);
          if (cancelled) return;
          const r2 = await attempt();
          if (r2 === "ok") return;
          if (!cancelled) setUser(null);
          return;
        }

        // r === "fail": transient network/timeout/5xx → backoff & retry.
        if (networkRetry >= NETWORK_BACKOFF.length) {
          // Exhausted: surface a retry overlay. Crucially NOT setUser(null) —
          // a transient failure must not masquerade as a logout.
          if (!cancelled) {
            setAuthError(true);
            setLoading(false);
          }
          return;
        }
        await sleep(NETWORK_BACKOFF[networkRetry]);
        networkRetry++;
        // loop: isLoading stays true while retrying
      }
    }

    run();

    return () => {
      cancelled = true;
      controllers.forEach((c) => c.abort());
    };
  }, [setUser, setLoading, setAuthError, reloadKey]);

  if (authError) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-50 dark:bg-[#0a0a1a] px-4">
        <div className="w-full max-w-sm text-center bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-8 shadow-xl">
          <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 dark:bg-white/10 flex items-center justify-center mb-4">
            <svg
              className="w-6 h-6 text-gray-500 dark:text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m0 3.75h.008M3 12a9 9 0 1118 0 9 9 0 01-18 0z"
              />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Não foi possível carregar sua conta
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Verifique sua conexão e tente novamente.
          </p>
          <button
            type="button"
            onClick={() => {
              setAuthError(false);
              setReloadKey((k) => k + 1);
            }}
            className="mt-5 w-full px-4 py-2.5 bg-primary hover:bg-primary-hover text-white text-sm font-medium rounded-lg transition"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
