"use client";

import { useEffect, useState } from "react";

export const ACTIVE_WORKSPACE_COOKIE = "active_workspace_id";

interface WorkspaceInfo {
  id: string;
  slug: string;
  name: string;
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

export function useActiveWorkspace(): WorkspaceInfo | null {
  const [workspace, setWorkspace] = useState<WorkspaceInfo | null>(null);

  useEffect(() => {
    fetch("/api/workspaces")
      .then((r) => (r.ok ? r.json() : { workspaces: [] }))
      .then((d) => {
        const list: WorkspaceInfo[] = d.workspaces || [];
        if (list.length === 0) return;
        const cookie = readCookie(ACTIVE_WORKSPACE_COOKIE);
        const current = (cookie && list.find((w) => w.id === cookie)) || list[0];
        setWorkspace(current);
      })
      .catch(() => {});
  }, []);

  return workspace;
}
