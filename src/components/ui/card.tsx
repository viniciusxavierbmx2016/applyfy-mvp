import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: string;
}

function Card({ className, padding = "p-6", children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl",
        padding,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export { Card };
