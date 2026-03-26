// src/components/dashboard/TopEdges.tsx
"use client";
import Link from "next/link";
import type { Prop } from "@/lib/types";
import { formatOdds, gradeEdge, cn } from "@/lib/utils";
import { SportBadge, StatusBadge } from "@/components/ui/Badge";
import { EdgeBar, ConfidenceRing, ProbBar } from "@/components/ui/EdgeBar";
import { Card } from "@/components/ui/Card";
import { TrendingUp, AlertTriangle } from "lucide-react";

interface TopEdgesProps {
  props: Prop[];
}

function PropEdgeCard({ prop }: { prop: Prop }) {
  const rating = gradeEdge(prop.edge);
  const isOver = prop.overProbability > 0.5;
  const isInjury = prop.player.status !== "active";
  const propLabel = prop.propType
    .replace("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <Link href={`/player/${prop.player.id}`}>
      <Card hover className="group animate-slide-up">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <SportBadge sport={prop.player.sport} />
              {isInjury && <StatusBadge status={prop.player.status} />}
              {prop.sentiment === "injury_concern" && (
                <span className="flex items-center gap-1 text-[9px] font-mono text-accent-red">
                  <AlertTriangle size={9} />
                  INJURY FLAG
                </span>
              )}
            </div>
            <div className="font-display font-bold text-sm text-text-primary group-hover:text-accent-green transition-colors truncate">
              {prop.player.name}
            </div>
            <div className="text-[10px] text-text-muted">
              {prop.player.team.abbreviation} · {prop.player.position}
            </div>
          </div>
          <ConfidenceRing score={prop.confidenceScore} size={48} />
        </div>

        {/* Prop line */}
        <div className="bg-bg-secondary rounded-md border border-bg-border p-2.5 mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-mono text-text-muted uppercase">
              {propLabel}
            </span>
            <span className="text-[10px] font-mono text-text-muted">
              {prop.sportsbook}
            </span>
          </div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-xl font-mono font-bold text-text-primary">
              {prop.line}
            </span>
            <span className="text-xs font-mono text-text-muted">{propLabel}</span>
            <span
              className={cn(
                "ml-auto text-sm font-mono font-bold",
                isOver ? "text-accent-green" : "text-accent-red"
              )}
            >
              {isOver ? "OVER" : "UNDER"}
            </span>
          </div>
          <ProbBar
            overProb={prop.overProbability}
            line={prop.line}
            propType={propLabel}
          />
        </div>

        {/* Odds comparison */}
        <div className="grid grid-cols-3 gap-1.5 mb-3">
          <div className="text-center p-1.5 bg-bg-secondary rounded border border-bg-border">
            <div className="text-[8px] text-text-muted font-mono">BOOK OVER</div>
            <div className="text-xs font-mono text-text-primary font-semibold">
              {formatOdds(prop.overOdds)}
            </div>
          </div>
          <div className="text-center p-1.5 bg-bg-secondary rounded border border-accent-green/20 relative">
            <div className="text-[8px] text-accent-green font-mono">FAIR ODDS</div>
            <div className="text-xs font-mono text-accent-green font-bold">
              {formatOdds(isOver ? prop.fairOddsOver : prop.fairOddsUnder)}
            </div>
            <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 text-[7px] font-mono text-accent-green bg-bg-secondary px-1">
              MODEL
            </span>
          </div>
          <div className="text-center p-1.5 bg-bg-secondary rounded border border-bg-border">
            <div className="text-[8px] text-text-muted font-mono">PROJ VAL</div>
            <div className="text-xs font-mono text-accent-blue font-semibold">
              {prop.projectedValue.toFixed(1)}
            </div>
          </div>
        </div>

        {/* Edge bar */}
        <EdgeBar edge={prop.edge} />

        {/* Recent performance sparkline (text) */}
        {prop.recentPerformance && (
          <div className="mt-3 pt-3 border-t border-bg-border">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[9px] font-mono text-text-muted">LAST 5</span>
              <TrendingUp size={10} className="text-text-muted" />
            </div>
            <div className="flex items-end gap-1 h-8">
              {prop.recentPerformance.map((val, i) => {
                const maxVal = Math.max(...prop.recentPerformance!);
                const pct = (val / (maxVal * 1.2)) * 100;
                const overLine = val >= prop.line;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                    <div
                      className="w-full rounded-sm transition-all"
                      style={{
                        height: `${pct}%`,
                        background: overLine ? "#00FF87" : "#FF3B5C",
                        opacity: i === 4 ? 1 : 0.5 + i * 0.1,
                      }}
                    />
                    <span className="text-[8px] font-mono text-text-muted">
                      {val}
                    </span>
                  </div>
                );
              })}
            </div>
            <div
              className="border-t border-dashed mt-0.5"
              style={{ borderColor: "#7B8FA640" }}
              title={`Line: ${prop.line}`}
            />
          </div>
        )}

        {/* Top factor */}
        {prop.factors[0] && (
          <div className="mt-3 flex gap-2 p-2 bg-accent-green/5 border border-accent-green/10 rounded">
            <span className="text-accent-green text-[10px] mt-0.5">▶</span>
            <p className="text-[10px] text-text-secondary leading-relaxed">
              {prop.factors[0].description}
            </p>
          </div>
        )}
      </Card>
    </Link>
  );
}

export function TopEdges({ props }: TopEdgesProps) {
  const sorted = [...props].sort((a, b) => b.edge - a.edge);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {sorted.map((prop) => (
        <PropEdgeCard key={prop.id} prop={prop} />
      ))}
    </div>
  );
}
