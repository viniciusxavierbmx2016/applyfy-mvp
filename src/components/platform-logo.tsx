"use client";

import { useEffect, useState } from "react";

interface PlatformLogoProps {
  className?: string;
  fallback?: React.ReactNode;
}

export function PlatformLogo({ className, fallback }: PlatformLogoProps) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    fetch("/api/admin/platform-settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.settings?.logoUrl) setLogoUrl(data.settings.logoUrl);
      })
      .catch(() => {})
      .finally(() => setChecked(true));
  }, []);

  if (!checked) return null;
  if (logoUrl) {
    return <img src={logoUrl} alt="Logo" className={className || "h-8 w-auto object-contain"} />;
  }
  return <>{fallback}</>;
}
