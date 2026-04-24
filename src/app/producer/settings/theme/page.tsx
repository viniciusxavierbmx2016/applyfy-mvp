"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ThemeRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/producer/settings");
  }, [router]);
  return null;
}
