import Image from "next/image";
import { cn } from "@/lib/utils";

interface AvatarProps {
  src?: string | null;
  name: string;
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
}

// ⚠️ Dois mapas, os dois precisam da entrada: `sizeMap` alimenta width/height do
// next/image (sem ele, avatar COM foto receberia undefined e o Image lança);
// `sizes` abaixo dá as classes. Acréscimo puro — sm/md/lg intocados.
const sizeMap = { xs: 24, sm: 32, md: 40, lg: 56 };

export function Avatar({ src, name, size = "md", className }: AvatarProps) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const sizes = {
    xs: "h-6 w-6 text-[10px]",
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-14 w-14 text-lg",
  };

  if (src) {
    return (
      <Image
        src={src}
        alt={name}
        width={sizeMap[size]}
        height={sizeMap[size]}
        className={cn("rounded-full object-cover", sizes[size], className)}
      />
    );
  }

  return (
    <div
      className={cn(
        "rounded-full bg-blue-600 flex items-center justify-center text-white font-medium",
        sizes[size],
        className
      )}
    >
      {initials}
    </div>
  );
}
