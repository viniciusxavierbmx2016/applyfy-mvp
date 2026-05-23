export function formatDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatExpiry(iso: string | null) {
  if (!iso) return { text: "Vitalício", color: "text-gray-500" };
  const date = new Date(iso).getTime();
  const diffMs = date - Date.now();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffMs < 0)
    return { text: "Expirado", color: "text-red-500 font-medium" };
  if (diffDays <= 7)
    return {
      text: `Expira em ${diffDays}d`,
      color: "text-amber-600 dark:text-amber-400",
    };
  return {
    text: `Expira em ${diffDays}d`,
    color: "text-gray-600 dark:text-gray-400",
  };
}

export function formatRelative(iso: string | null) {
  if (!iso) return "Nunca";
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Hoje";
  if (days === 1) return "Ontem";
  if (days < 30) return `${days} dias atrás`;
  if (days < 365) return `${Math.floor(days / 30)} meses atrás`;
  return `${Math.floor(days / 365)} anos atrás`;
}
