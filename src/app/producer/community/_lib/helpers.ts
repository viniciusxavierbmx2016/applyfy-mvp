import type { AdminPost } from "../_types";

export const typeLabels: Record<AdminPost["type"], { label: string; color: string }> =
  {
    QUESTION: { label: "Dúvida", color: "bg-yellow-500/20 text-yellow-400" },
    RESULT: { label: "Resultado", color: "bg-green-500/20 text-green-400" },
    FEEDBACK: { label: "Feedback", color: "bg-purple-500/20 text-purple-400" },
    FREE: { label: "Livre", color: "bg-primary/20 text-primary" },
  };
