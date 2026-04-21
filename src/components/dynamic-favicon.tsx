"use client";

import { useEffect } from "react";

let fetched = false;

export function DynamicFavicon() {
  useEffect(() => {
    if (fetched) return;
    fetched = true;

    fetch("/api/admin/platform-settings")
      .then((r) => {
        if (!r.ok) return null;
        return r.json();
      })
      .then((data) => {
        const url = data?.settings?.faviconUrl;
        if (!url) return;
        let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
        if (!link) {
          link = document.createElement("link");
          link.rel = "icon";
          document.head.appendChild(link);
        }
        link.href = url;
      })
      .catch(() => {});
  }, []);

  return null;
}
