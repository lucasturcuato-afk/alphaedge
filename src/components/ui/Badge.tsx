// src/components/ui/Badge.tsx
import { cn, sentimentColor } from "@/lib/utils";

interface BadgeProps {
  label: string;
  variant?: "green" | "red" | "amber" | "blue" | "purple" | "neutral" | "sentiment";
  sentiment?: string;
  size?: "sm" | "xs";
  dot?: boolean;
}

export function Badge({
  label,
  variant = "neutral",
  sentiment,
  size = "sm",
  dot = false,
}: BadgeProps) {
  const colorMap: Record<string, string> = {
    green: "text-accent-green bg-accent-green/10 border-accent-green/20",
    red: "text-accent-red bg-accent-red/10 border-accent-red/20",
    amber: "text-accent-amber bg-accent-amber/10 border-accent-amber/20",
    blue: "text-accent-blue bg-accent-blue/10 border-accent-blue/20",
    purple: "text-purple-400 bg-purple-400/10 border-purple-400/20",
    neutral: "text-text-muted bg-bg-border/50 border-bg-border",
    injury_concern:
      "text-accent-red bg-accent-red/10 border-accent-red/20",
    positive:
      "text-accent-green bg-accent-green/10 border-accent-green/20",
    negative: "text-accent-red bg-accent-red/10 border-accent-red/20",
    contrarian:
      "text-purple-400 bg-purple-400/10 border-purple-400/20",
    public_hype:
      "text-accent-amber bg-accent-amber/10 border-accent-amber/20",
  };

  const resolvedKey = variant === "sentiment" ? (sentiment ?? "neutral") : variant;
  const cls = colorMap[resolvedKey] ?? colorMap.neutral;
  const sizeClass = size === "xs" ? "text-[9px] px-1.5 py-0.5" : "text-[10px] px-2 py-0.5";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded border font-mono font-medium",
        sizeClass,
        cls
      )}
    >
      {dot && (
        <span
          className="w-1 h-1 rounded-full"
          style={{ background: "currentColor" }}
        />
      )}
      {label?.toUpperCase() ?? ""}
    </span>
  );
}

// ── Status badge for player status ────────────────────────────────────────────
interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const map: Record<string, { variant: BadgeProps["variant"]; label: string }> = {
    active: { variant: "green", label: "ACTIVE" },
    questionable: { variant: "amber", label: "QUEST." },
    "day-to-day": { variant: "amber", label: "DTD" },
    out: { variant: "red", label: "OUT" },
  };
  const { variant, label } = map[status] ?? { variant: "neutral", label: status.toUpperCase() };
  return <Badge label={label} variant={variant} size="xs" dot />;
}

// ── Sport badge ────────────────────────────────────────────────────────────────
interface SportBadgeProps {
  sport: string;
}

export function SportBadge({ sport }: SportBadgeProps) {
  const map: Record<string, string> = {
    NBA: "text-[#C8A96E] bg-[#C8A96E]/10 border-[#C8A96E]/20",
    NCAAMB: "text-[#4B9CD3] bg-[#4B9CD3]/10 border-[#4B9CD3]/20",
    MLB: "text-[#E8002D] bg-[#E8002D]/10 border-[#E8002D]/20",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border font-mono font-semibold text-[9px] px-1.5 py-0.5",
        map[sport] ?? "text-text-muted bg-bg-border/50 border-bg-border"
      )}
    >
      {sport}
    </span>
  );
}
