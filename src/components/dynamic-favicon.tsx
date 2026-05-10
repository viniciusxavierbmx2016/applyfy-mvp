"use client";

import { useEffect, useState } from "react";

let fetched = false;

export function DynamicFavicon() {
  const [customFaviconUrl, setCustomFaviconUrl] = useState<string | null>(null);

  useEffect(() => {
    if (fetched) return;
    fetched = true;

    fetch("/api/admin/platform-settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const url = data?.settings?.faviconUrl;
        if (url) setCustomFaviconUrl(url);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: light)");
    const faviconUrl = customFaviconUrl || "/logo.png";

    function setLinkHref(href: string) {
      let link = document.querySelector<HTMLLinkElement>('link[rel~="icon"]');
      if (!link) {
        link = document.createElement("link");
        link.rel = "icon";
        document.head.appendChild(link);
      }
      link.href = href;
    }

    function updateFavicon() {
      const isLight = mediaQuery.matches;

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          setLinkHref(faviconUrl);
          return;
        }

        if (isLight) {
          ctx.fillStyle = "#1e293b";
          ctx.beginPath();
          ctx.roundRect(0, 0, 64, 64, 14);
          ctx.fill();
          ctx.drawImage(img, 8, 8, 48, 48);
        } else {
          ctx.drawImage(img, 0, 0, 64, 64);
        }

        try {
          setLinkHref(canvas.toDataURL("image/png"));
        } catch {
          setLinkHref(faviconUrl);
        }
      };
      img.onerror = () => setLinkHref(faviconUrl);
      img.src = faviconUrl;
    }

    updateFavicon();
    mediaQuery.addEventListener("change", updateFavicon);
    return () => mediaQuery.removeEventListener("change", updateFavicon);
  }, [customFaviconUrl]);

  return null;
}
