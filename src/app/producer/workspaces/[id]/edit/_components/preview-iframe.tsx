"use client";

import { useEffect, useRef, useState } from "react";

export function PreviewIframe({
  slug,
  reloadKey,
}: {
  slug: string;
  reloadKey: number;
}) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const update = () =>
      setSize({ w: el.offsetWidth, h: el.offsetHeight });
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const W = 1280;
  const H = 800;
  const scale =
    size.w > 0 && size.h > 0 ? Math.min(size.w / W, size.h / H) : 0;
  return (
    <div
      ref={wrapperRef}
      className="w-full h-full overflow-hidden flex items-center justify-center"
    >
      {slug && scale > 0 && (
        <iframe
          key={reloadKey}
          src={`/w/${slug}/login?preview=true&t=${reloadKey}`}
          title="Preview"
          width={W}
          height={H}
          style={{
            width: W,
            height: H,
            transform: `scale(${scale})`,
            transformOrigin: "center center",
            border: "none",
            pointerEvents: "none",
            flexShrink: 0,
          }}
        />
      )}
    </div>
  );
}
