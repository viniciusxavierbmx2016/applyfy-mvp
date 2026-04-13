import { create } from "zustand";
import type { User } from "@/types";

export interface CollaboratorInfo {
  permissions: string[];
  courseIds: string[];
  workspaceId: string;
}

interface UserState {
  user: User | null;
  collaborator: CollaboratorInfo | null;
  isLoading: boolean;
  setUser: (user: User | null, collaborator?: CollaboratorInfo | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  collaborator: null,
  isLoading: true,
  setUser: (user, collaborator) =>
    set((state) => ({
      user,
      collaborator:
        typeof collaborator === "undefined" ? state.collaborator : collaborator,
      isLoading: false,
    })),
  setLoading: (isLoading) => set({ isLoading }),
  logout: () => set({ user: null, collaborator: null, isLoading: false }),
}));
