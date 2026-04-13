"use client";

import { useEffect, useState } from "react";

export function GatewayLogo({
  src,
  label,
  size = 48,
}: {
  src: string | null | undefined;
  label: string;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  const showFallback = failed || !src;
  const letter = (label.trim()[0] || "?").toUpperCase();

  return (
    <div
      className="rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0 shadow-md ring-1 ring-gray-200 dark:ring-gray-800 bg-white"
      style={{ width: size, height: size }}
    >
      {showFallback ? (
        <div
          className="w-full h-full flex items-center justify-center font-bold text-black"
          style={{ backgroundColor: "#EAB308", fontSize: size * 0.5 }}
        >
          {letter}
        </div>
      ) : (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={src!}
          alt={label}
          width={size}
          height={size}
          className="w-full h-full object-contain"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}
