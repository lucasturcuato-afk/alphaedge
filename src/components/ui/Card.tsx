// src/components/ui/Card.tsx
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  glow?: "green" | "red" | "blue" | "none";
  padding?: "sm" | "md" | "lg" | "none";
}

const padMap = {
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "p-5",
};

export function Card({
  children,
  className,
  hover = false,
  glow = "none",
  padding = "md",
}: CardProps) {
  return (
    <div
      className={cn(
        "card",
        padMap[padding],
        hover && "card-hover cursor-pointer",
        glow === "green" && "glow-green",
        glow === "red" && "glow-red",
        glow === "blue" && "glow-blue",
        className
      )}
    >
      {children}
    </div>
  );
}

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  mono?: boolean;
}

export function SectionHeader({
  title,
  subtitle,
  action,
  mono = false,
}: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div>
        <h2
          className={cn(
            "text-sm font-semibold text-text-primary",
            mono ? "font-mono uppercase tracking-wider text-xs" : "font-display"
          )}
        >
          {title}
        </h2>
        {subtitle && (
          <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}
