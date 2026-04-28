"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useUserStore } from "@/stores/user-store";

interface BillingStatus {
  subscription: {
    status: string;
    exempt: boolean;
    currentPeriodEnd: string | null;
  } | null;
}

const cache: { data: BillingStatus | null; ts: number } = { data: null, ts: 0 };
const CACHE_TTL = 60_000;

export function SubscriptionGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading } = useUserStore();
  const [pastDueDays, setPastDueDays] = useState<number | null>(null);
  const fetched = useRef(false);

  const skip =
    pathname === "/producer/settings/billing" ||
    pathname === "/producer/login" ||
    pathname === "/producer/register";

  useEffect(() => {
    if (skip || isLoading || !user) return;
    if (user.role === "ADMIN" || user.role === "COLLABORATOR") return;

    const now = Date.now();
    if (cache.data && now - cache.ts < CACHE_TTL) {
      processResult(cache.data);
      return;
    }

    if (fetched.current) return;
    fetched.current = true;

    fetch("/api/producer/billing")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: BillingStatus | null) => {
        if (data) {
          cache.data = data;
          cache.ts = Date.now();
        }
        processResult(data);
      })
      .catch(() => {});

    function processResult(data: BillingStatus | null) {
      if (!data) return;

      const sub = data.subscription;

      if (!sub) {
        router.replace("/producer/settings/billing?reason=subscription_required");
        return;
      }

      if (sub.exempt || sub.status === "ACTIVE") return;

      if (sub.status === "PAST_DUE") {
        if (sub.currentPeriodEnd) {
          const daysSince = Math.floor(
            (Date.now() - new Date(sub.currentPeriodEnd).getTime()) / (1000 * 60 * 60 * 24)
          );
          if (daysSince <= 3) {
            setPastDueDays(3 - daysSince);
            return;
          }
        }
        router.replace("/producer/settings/billing?reason=subscription_required");
        return;
      }

      router.replace("/producer/settings/billing?reason=subscription_required");
    }
  }, [skip, isLoading, user, router, pathname]);

  return (
    <>
      {pastDueDays !== null && (
        <div className="mb-4 px-4 py-3 rounded-xl border bg-amber-50 dark:bg-amber-500/5 border-amber-200 dark:border-amber-500/20 text-amber-700 dark:text-amber-400 text-sm font-medium">
          Pagamento pendente. Regularize em {pastDueDays} dia{pastDueDays !== 1 ? "s" : ""} para evitar suspensão.
        </div>
      )}
      {children}
    </>
  );
}
