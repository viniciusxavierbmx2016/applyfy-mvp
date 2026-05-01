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
  setUser: (
    user: User | null,
    collaborator?: CollaboratorInfo | null,
    workspace?: UserWorkspaceInfo | null,
    adminPermissions?: string[]
  ) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  collaborator: null,
  workspace: null,
  adminPermissions: [],
  isLoading: true,
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
    })),
  setLoading: (isLoading) => set({ isLoading }),
  logout: () =>
    set({
      user: null,
      collaborator: null,
      workspace: null,
      adminPermissions: [],
      isLoading: false,
    }),
}));
