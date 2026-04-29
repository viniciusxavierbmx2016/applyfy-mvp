"use client";

import { useState, useRef, useEffect } from "react";

interface HelpTooltipProps {
  text: string;
  side?: "top" | "bottom";
  maxWidth?: number;
}

export function HelpTooltip({ text, side = "top", maxWidth = 260 }: HelpTooltipProps) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState<"top" | "bottom">("top");
  const [align, setAlign] = useState<"left" | "center" | "right">("center");
  const triggerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (visible && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      if (rect.top < 80) setPosition("bottom");
      else setPosition(side === "bottom" ? "bottom" : "top");

      if (rect.right > window.innerWidth - 150) setAlign("right");
      else if (rect.left < 150) setAlign("left");
      else setAlign("center");
    }
  }, [visible, side]);

  return (
    <span
      ref={triggerRef}
      className="relative inline-flex items-center ml-1.5 cursor-help"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onClick={() => setVisible((v) => !v)}
    >
      <span className="w-4 h-4 rounded-full border border-gray-400/30 dark:border-white/15 flex items-center justify-center text-[10px] text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:border-gray-400 dark:hover:border-white/30 transition-colors">
        ?
      </span>

      {visible && (
        <span
          className={`
            absolute z-50 px-3 py-2 text-xs leading-relaxed text-gray-200
            bg-gray-900 dark:bg-[#1a1a2e] border border-white/10
            rounded-lg shadow-xl pointer-events-none
            ${position === "bottom" ? "top-full mt-2" : "bottom-full mb-2"}
            ${align === "right" ? "right-0" : align === "left" ? "left-0" : "left-1/2 -translate-x-1/2"}
          `}
          style={{ maxWidth, minWidth: 180 }}
        >
          {text}
          <span
            className={`
              absolute w-2 h-2 rotate-45
              bg-gray-900 dark:bg-[#1a1a2e] border border-white/10
              ${position === "bottom"
                ? "-top-1 border-b-0 border-r-0"
                : "-bottom-1 border-t-0 border-l-0"}
              ${align === "right" ? "right-3" : align === "left" ? "left-3" : "left-1/2 -translate-x-1/2"}
            `}
          />
        </span>
      )}
    </span>
  );
}
