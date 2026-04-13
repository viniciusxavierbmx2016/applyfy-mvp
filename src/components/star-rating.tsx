"use client";

interface Props {
  value: number;
  size?: "sm" | "md" | "lg";
  onChange?: (value: number) => void;
  className?: string;
}

const SIZE_CLASS: Record<NonNullable<Props["size"]>, string> = {
  sm: "w-3.5 h-3.5",
  md: "w-4 h-4",
  lg: "w-7 h-7",
};

export function StarRating({ value, size = "md", onChange, className }: Props) {
  const interactive = typeof onChange === "function";
  const sizeCls = SIZE_CLASS[size];

  return (
    <div className={`inline-flex items-center gap-0.5 ${className ?? ""}`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= Math.round(value);
        const StarBtn = interactive ? "button" : "span";
        return (
          <StarBtn
            key={n}
            type={interactive ? "button" : undefined}
            onClick={interactive ? () => onChange!(n) : undefined}
            className={
              interactive
                ? "p-0.5 transition hover:scale-110"
                : "inline-flex"
            }
            aria-label={interactive ? `${n} estrela${n > 1 ? "s" : ""}` : undefined}
          >
            <svg
              className={`${sizeCls} ${filled ? "text-amber-400" : "text-gray-600"}`}
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 17.27l6.18 3.73-1.64-7.03L22 9.24l-7.19-.62L12 2 9.19 8.62 2 9.24l5.46 4.73L5.82 21z" />
            </svg>
          </StarBtn>
        );
      })}
    </div>
  );
}
