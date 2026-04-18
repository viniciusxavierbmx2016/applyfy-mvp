"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useUserStore } from "@/stores/user-store";

interface BillingStatus {
  subscription: {
    status: string;
    exempt: boolean;
    currentPeriodEnd: string | null;
  } | null;
}

export function SubscriptionGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading } = useUserStore();
  const [checked, setChecked] = useState(false);
  const [pastDueDays, setPastDueDays] = useState<number | null>(null);

  const skip =
    pathname === "/producer/billing" ||
    pathname === "/producer/login" ||
    pathname === "/producer/register";

  useEffect(() => {
    if (skip || isLoading || !user) {
      setChecked(true);
      return;
    }

    if (user.role === "ADMIN") {
      setChecked(true);
      return;
    }

    if (user.role === "COLLABORATOR") {
      setChecked(true);
      return;
    }

    fetch("/api/producer/billing")
      .then((r) => (r.ok ? r.json() : null))
      .then((data: BillingStatus | null) => {
        if (!data) {
          setChecked(true);
          return;
        }

        const sub = data.subscription;

        if (!sub) {
          router.replace("/producer/billing?reason=subscription_required");
          return;
        }

        if (sub.exempt || sub.status === "ACTIVE") {
          setChecked(true);
          return;
        }

        if (sub.status === "PAST_DUE") {
          if (sub.currentPeriodEnd) {
            const daysSince = Math.floor(
              (Date.now() - new Date(sub.currentPeriodEnd).getTime()) / (1000 * 60 * 60 * 24)
            );
            if (daysSince <= 3) {
              setPastDueDays(3 - daysSince);
              setChecked(true);
              return;
            }
          }
          router.replace("/producer/billing?reason=subscription_required");
          return;
        }

        router.replace("/producer/billing?reason=subscription_required");
      })
      .catch(() => setChecked(true));
  }, [skip, isLoading, user, router, pathname]);

  if (!checked && !skip) return null;

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
