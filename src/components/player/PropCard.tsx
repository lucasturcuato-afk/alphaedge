// src/components/player/PropCard.tsx
import type { Prop } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { EdgeBar, ConfidenceRing, ProbBar } from "@/components/ui/EdgeBar";
import { Badge } from "@/components/ui/Badge";
import { formatOdds, gradeEdge } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface PropCardProps {
  prop: Prop;
  expanded?: boolean;
}

export function PropCard({ prop, expanded = false }: PropCardProps) {
  const isOver = prop.overProbability > 0.5;
  const rating = gradeEdge(prop.edge);
  const propLabel = prop.propType
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const DirectionIcon =
    prop.projectedValue > prop.line
      ? TrendingUp
      : prop.projectedValue < prop.line
      ? TrendingDown
      : Minus;

  return (
    <Card>
      {/* Prop type + sportsbook */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono font-semibold text-text-secondary uppercase tracking-wider">
            {propLabel}
          </span>
          <Badge
            label={isOver ? "OVER" : "UNDER"}
            variant={isOver ? "green" : "red"}
            size="xs"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono text-text-muted">
            {prop.sportsbook}
          </span>
          <ConfidenceRing score={prop.confidenceScore} size={40} strokeWidth={3} />
        </div>
      </div>

      {/* Line + projection */}
      <div className="flex items-baseline gap-3 mb-3">
        <div>
          <div className="text-[9px] font-mono text-text-muted">BOOK LINE</div>
          <div className="text-2xl font-mono font-bold text-text-primary">
            {prop.line}
          </div>
        </div>
        <div className="text-text-muted">→</div>
        <div>
          <div className="text-[9px] font-mono text-accent-blue">MODEL PROJ</div>
          <div className="flex items-center gap-1">
            <span className="text-2xl font-mono font-bold text-accent-blue">
              {prop.projectedValue.toFixed(1)}
            </span>
            <DirectionIcon
              size={16}
              className={
                prop.projectedValue > prop.line
                  ? "text-accent-green"
                  : "text-accent-red"
              }
            />
          </div>
        </div>
      </div>

      {/* Probability bar */}
      <div className="mb-3">
        <ProbBar
          overProb={prop.overProbability}
          line={prop.line}
          propType={propLabel}
        />
      </div>

      {/* Odds comparison */}
      <div className="grid grid-cols-4 gap-1.5 mb-3">
        {[
          { label: "OVER", val: formatOdds(prop.overOdds), key: "over" },
          { label: "UNDER", val: formatOdds(prop.underOdds), key: "under" },
          {
            label: "FAIR O",
            val: formatOdds(prop.fairOddsOver),
            key: "fairO",
            highlight: true,
          },
          {
            label: "FAIR U",
            val: formatOdds(prop.fairOddsUnder),
            key: "fairU",
            highlight: true,
          },
        ].map((col) => (
          <div
            key={col.key}
            className={`text-center p-1.5 rounded border ${
              col.highlight
                ? "border-accent-green/20 bg-accent-green/5"
                : "border-bg-border bg-bg-secondary"
            }`}
          >
            <div
              className={`text-[8px] font-mono ${
                col.highlight ? "text-accent-green" : "text-text-muted"
              }`}
            >
              {col.label}
            </div>
            <div
              className={`text-xs font-mono font-semibold ${
                col.highlight ? "text-accent-green" : "text-text-primary"
              }`}
            >
              {col.val}
            </div>
          </div>
        ))}
      </div>

      {/* Edge bar */}
      <EdgeBar edge={prop.edge} />

      {/* Factors */}
      {expanded && prop.factors.length > 0 && (
        <div className="mt-3 pt-3 border-t border-bg-border space-y-2">
          <div className="text-[9px] font-mono text-text-muted uppercase tracking-wider">
            Key Factors
          </div>
          {prop.factors.map((factor, i) => (
            <div
              key={i}
              className="flex gap-2 p-2 bg-bg-secondary rounded border border-bg-border"
            >
              <div className="shrink-0 mt-0.5">
                <span
                  className={`text-[8px] font-mono ${
                    factor.direction === "positive"
                      ? "text-accent-green"
                      : factor.direction === "negative"
                      ? "text-accent-red"
                      : "text-text-muted"
                  }`}
                >
                  {factor.direction === "positive"
                    ? "▲"
                    : factor.direction === "negative"
                    ? "▼"
                    : "●"}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-semibold text-text-primary">
                    {factor.label}
                  </span>
                  {factor.value && (
                    <span className="text-[9px] font-mono text-accent-blue">
                      {factor.value}
                    </span>
                  )}
                  <span
                    className={`text-[8px] font-mono ${
                      factor.impact === "high"
                        ? "text-accent-red"
                        : factor.impact === "medium"
                        ? "text-accent-amber"
                        : "text-text-muted"
                    }`}
                  >
                    {factor.impact.toUpperCase()} IMPACT
                  </span>
                </div>
                <p className="text-[10px] text-text-secondary mt-0.5 leading-relaxed">
                  {factor.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
