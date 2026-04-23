"use client";

import { useCallback, useState } from "react";
import { ConfirmModal } from "@/components/confirm-modal";

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
}

interface State extends ConfirmOptions {
  isOpen: boolean;
  resolve: ((value: boolean) => void) | null;
}

export function useConfirm() {
  const [state, setState] = useState<State>({
    isOpen: false,
    title: "",
    message: "",
    variant: "info",
    resolve: null,
  });

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      setState({ isOpen: true, resolve, ...options });
    });
  }, []);

  const handleClose = useCallback(() => {
    state.resolve?.(false);
    setState((s) => ({ ...s, isOpen: false, resolve: null }));
  }, [state.resolve]);

  const handleConfirm = useCallback(() => {
    state.resolve?.(true);
    setState((s) => ({ ...s, isOpen: false, resolve: null }));
  }, [state.resolve]);

  const ConfirmDialog = useCallback(
    () => (
      <ConfirmModal
        isOpen={state.isOpen}
        onClose={handleClose}
        onConfirm={handleConfirm}
        title={state.title}
        message={state.message}
        confirmText={state.confirmText}
        cancelText={state.cancelText}
        variant={state.variant}
      />
    ),
    [state.isOpen, state.title, state.message, state.confirmText, state.cancelText, state.variant, handleClose, handleConfirm]
  );

  return { confirm, ConfirmDialog };
}
