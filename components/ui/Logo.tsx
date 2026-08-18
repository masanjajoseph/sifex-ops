import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

type LogoSize = "xs" | "sm" | "md" | "lg" | "xl";

interface LogoProps {
  size?: LogoSize;
  height?: number;
  href?: string;
  className?: string;
  priority?: boolean;
  container?: boolean;
  containerClassName?: string;
}

const sizeMap: Record<LogoSize, { height: number; width: number; container?: boolean }> = {
  xs: { height: 24, width: 60 },
  sm: { height: 32, width: 80 },
  md: { height: 36, width: 90 },
  lg: { height: 48, width: 120, container: true },
  xl: { height: 64, width: 160, container: true },
};

export function Logo({
  size = "md",
  height,
  href,
  className,
  priority,
  container,
  containerClassName,
}: LogoProps) {
  const dims = sizeMap[size];
  const h = height ?? dims.height;
  const w = Math.round(h * 2.45);
  const showContainer = container ?? dims.container ?? false;

  const image = (
    <Image
      src="/logo.png"
      alt="Sifex Air Cargo"
      width={w}
      height={h}
      priority={priority}
      className={cn("object-contain", className)}
      style={{ width: "auto", height: h }}
    />
  );

  const logo = href ? (
    <Link href={href} className="flex items-center shrink-0">
      {image}
    </Link>
  ) : (
    image
  );

  if (showContainer) {
    return (
      <div className={cn("bg-white rounded-lg p-2 shadow-sm", containerClassName)}>
        {logo}
      </div>
    );
  }

  return logo;
}
