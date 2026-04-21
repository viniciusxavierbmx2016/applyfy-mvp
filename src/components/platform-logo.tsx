"use client";

import { useEffect, useState } from "react";

interface PlatformLogoProps {
  className?: string;
  fallback?: React.ReactNode;
}

let logoCache: { url: string | null; loaded: boolean } = { url: null, loaded: false };

export function PlatformLogo({ className, fallback }: PlatformLogoProps) {
  const [logoUrl, setLogoUrl] = useState<string | null>(logoCache.url);
  const [checked, setChecked] = useState(logoCache.loaded);

  useEffect(() => {
    if (logoCache.loaded) {
      setLogoUrl(logoCache.url);
      setChecked(true);
      return;
    }

    fetch("/api/admin/platform-settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const url = data?.settings?.logoUrl || null;
        logoCache = { url, loaded: true };
        setLogoUrl(url);
      })
      .catch(() => {})
      .finally(() => setChecked(true));
  }, []);

  if (!checked) return <>{fallback}</>;
  if (logoUrl) {
    return <img src={logoUrl} alt="Logo" className={className || "h-8 w-auto object-contain"} />;
  }
  return <>{fallback}</>;
}
