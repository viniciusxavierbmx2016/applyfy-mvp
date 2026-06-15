import { create } from "zustand";
import type { User } from "@/types";

export interface CollaboratorInfo {
  permissions: string[];
  courseIds: string[];
  workspaceId: string;
}

export interface UserWorkspaceInfo {
  slug: string;
  name: string;
  logoUrl: string | null;
}

interface UserState {
  user: User | null;
  collaborator: CollaboratorInfo | null;
  workspace: UserWorkspaceInfo | null;
  adminPermissions: string[];
  isLoading: boolean;
  // True only when /api/auth/me failed after exhausting retries (network/5xx).
  // Distinct from "logged out" (user:null): a transient failure must NOT look
  // like a logout — it surfaces a retry overlay instead of trapping in skeleton.
  authError: boolean;
  setUser: (
    user: User | null,
    collaborator?: CollaboratorInfo | null,
    workspace?: UserWorkspaceInfo | null,
    adminPermissions?: string[]
  ) => void;
  setLoading: (loading: boolean) => void;
  setAuthError: (v: boolean) => void;
  logout: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  collaborator: null,
  workspace: null,
  adminPermissions: [],
  isLoading: true,
  authError: false,
  setUser: (user, collaborator, workspace, adminPermissions) =>
    set((state) => ({
      user,
      collaborator:
        typeof collaborator === "undefined" ? state.collaborator : collaborator,
      workspace:
        typeof workspace === "undefined" ? state.workspace : workspace,
      adminPermissions:
        typeof adminPermissions === "undefined"
          ? state.adminPermissions
          : adminPermissions,
      isLoading: false,
      // A successful load clears any prior transient error.
      authError: false,
    })),
  setLoading: (isLoading) => set({ isLoading }),
  setAuthError: (authError) => set({ authError }),
  logout: () =>
    set({
      user: null,
      collaborator: null,
      workspace: null,
      adminPermissions: [],
      isLoading: false,
      authError: false,
    }),
}));
