"use client";

import { useEffect } from "react";
import { useUserStore } from "@/stores/user-store";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setLoading } = useUserStore();

  useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          setUser(
            data.user,
            data.collaborator ?? null,
            data.workspace ?? null,
            data.adminPermissions ?? []
          );
        } else {
          setUser(null);
        }
      } catch {
        setUser(null);
      }
    }

    setLoading(true);
    loadUser();
  }, [setUser, setLoading]);

  return <>{children}</>;
}
