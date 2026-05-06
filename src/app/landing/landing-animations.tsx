"use client";

import { useEffect } from "react";

export function LandingAnimations() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) entry.target.classList.add("visible");
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
    );
    const reveals = document.querySelectorAll(".reveal");
    reveals.forEach((el) => observer.observe(el));

    const onAnchorClick = (event: Event) => {
      const anchor = event.currentTarget as HTMLAnchorElement;
      const href = anchor.getAttribute("href");
      if (!href || !href.startsWith("#") || href === "#") return;
      const target = document.querySelector(href);
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: "smooth" });
    };

    const anchors =
      document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]');
    anchors.forEach((a) => a.addEventListener("click", onAnchorClick));

    return () => {
      observer.disconnect();
      anchors.forEach((a) => a.removeEventListener("click", onAnchorClick));
    };
  }, []);

  return null;
}
