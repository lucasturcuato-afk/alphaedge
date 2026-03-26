// src/components/ui/EdgeBar.tsx
import { cn, gradeEdge } from "@/lib/utils";

interface EdgeBarProps {
  edge: number;
  showLabel?: boolean;
  showGrade?: boolean;
  size?: "sm" | "md" | "lg";
}

export function EdgeBar({
  edge,
  showLabel = true,
  showGrade = true,
  size = "md",
}: EdgeBarProps) {
  const rating = gradeEdge(edge);
  const barWidth = Math.min(Math.abs(edge) * 8, 100);
  const isPositive = edge > 0;

  const heightMap = { sm: "h-1", md: "h-1.5", lg: "h-2" };

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-mono text-text-muted">EDGE</span>
          <div className="flex items-center gap-1.5">
            {showGrade && (
              <span
                className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded"
                style={{
                  color: rating.color,
                  background: `${rating.color}15`,
                  border: `1px solid ${rating.color}30`,
                }}
              >
                {rating.grade}
              </span>
            )}
            <span
              className="text-xs font-mono font-semibold"
              style={{ color: rating.color }}
            >
              {isPositive ? "+" : ""}
              {edge.toFixed(1)}%
            </span>
          </div>
        </div>
      )}
      <div className="w-full bg-bg-border rounded-full overflow-hidden">
        <div
          className={cn("rounded-full transition-all duration-700", heightMap[size])}
          style={{
            width: `${barWidth}%`,
            background: isPositive
              ? `linear-gradient(90deg, ${rating.color}80, ${rating.color})`
              : "linear-gradient(90deg, #FF3B5C80, #FF3B5C)",
          }}
        />
      </div>
    </div>
  );
}

// ── Confidence Ring ────────────────────────────────────────────────────────────
interface ConfidenceRingProps {
  score: number; // 0-100
  size?: number;
  strokeWidth?: number;
}

export function ConfidenceRing({
  score,
  size = 56,
  strokeWidth = 4,
}: ConfidenceRingProps) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (circ * score) / 100;
  const color = score >= 75 ? "#00FF87" : score >= 60 ? "#F59E0B" : "#FF3B5C";

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="rotate-[-90deg]">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#1C2330"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1s ease-in-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono font-bold text-xs" style={{ color }}>
          {score}
        </span>
        <span className="text-[8px] text-text-muted font-mono">CONF</span>
      </div>
    </div>
  );
}

// ── Probability Bar ────────────────────────────────────────────────────────────
interface ProbBarProps {
  overProb: number; // 0-1
  line: number;
  propType: string;
}

export function ProbBar({ overProb, line, propType }: ProbBarProps) {
  const overPct = Math.round(overProb * 100);
  const underPct = 100 - overPct;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-mono text-accent-green font-semibold">
          OVER {overPct}%
        </span>
        <span className="text-[10px] font-mono text-text-muted">
          {line} {propType}
        </span>
        <span className="text-[10px] font-mono text-accent-red font-semibold">
          UNDER {underPct}%
        </span>
      </div>
      <div className="flex h-2 rounded-full overflow-hidden gap-px bg-bg-border">
        <div
          className="rounded-l-full"
          style={{
            width: `${overPct}%`,
            background: "linear-gradient(90deg, #00FF8780, #00FF87)",
          }}
        />
        <div
          className="rounded-r-full flex-1"
          style={{ background: "linear-gradient(90deg, #FF3B5C80, #FF3B5C)" }}
        />
      </div>
    </div>
  );
}
