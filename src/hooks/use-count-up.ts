import { useState, useEffect, useRef } from "react";

interface CountUpOptions {
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  separator?: string;
  decimalSeparator?: string;
}

export function useCountUp(end: number, options?: CountUpOptions): string {
  const {
    duration = 800,
    decimals = 0,
    prefix = "",
    suffix = "",
    separator = ".",
    decimalSeparator = ",",
  } = options || {};

  const [current, setCurrent] = useState(0);
  const frameRef = useRef<number | undefined>(undefined);
  const prevEnd = useRef<number | null>(null);

  useEffect(() => {
    const startVal = prevEnd.current != null ? prevEnd.current : 0;
    prevEnd.current = end;

    if (end === startVal) {
      setCurrent(end);
      return;
    }

    const startTime = performance.now();

    function animate(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(startVal + (end - startVal) * eased);
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    }

    frameRef.current = requestAnimationFrame(animate);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [end, duration]);

  const fixed = current.toFixed(decimals);
  const [intPart, decPart] = fixed.split(".");
  const formatted = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
  return decPart
    ? `${prefix}${formatted}${decimalSeparator}${decPart}${suffix}`
    : `${prefix}${formatted}${suffix}`;
}
