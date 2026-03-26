// src/components/game/LineComparison.tsx
import type { BookLine, GamePrediction } from "@/lib/types";
import { formatOdds, formatSpread, americanToImplied, cn } from "@/lib/utils";

interface LineComparisonProps {
  lines: BookLine[];
  prediction?: GamePrediction;
  homeAbbr: string;
  awayAbbr: string;
}

const BOOK_COLORS: Record<string, string> = {
  DraftKings: "#00D4AA",
  FanDuel: "#1493FF",
  BetMGM: "#D4AF37",
  Caesars: "#C4A35A",
  PointsBet: "#E44040",
};

export function LineComparison({
  lines,
  prediction,
  homeAbbr,
  awayAbbr,
}: LineComparisonProps) {
  if (!lines?.length) return null;

  return (
    <div>
      <div className="text-[9px] font-mono text-text-muted mb-3 uppercase tracking-wider">
        Sportsbook Line Comparison
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-bg-border">
              <th className="text-left py-2 px-2 text-[9px] font-mono text-text-muted">
                BOOK
              </th>
              <th className="text-center py-2 px-2 text-[9px] font-mono text-text-muted">
                SPREAD
              </th>
              <th className="text-center py-2 px-2 text-[9px] font-mono text-text-muted">
                TOTAL
              </th>
              <th className="text-center py-2 px-2 text-[9px] font-mono text-text-muted">
                {homeAbbr} ML
              </th>
              <th className="text-center py-2 px-2 text-[9px] font-mono text-text-muted">
                {awayAbbr} ML
              </th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => {
              const color = BOOK_COLORS[line.sportsbook] ?? "#7B8FA6";
              return (
                <tr
                  key={line.sportsbook}
                  className="border-b border-bg-border/50 hover:bg-bg-secondary transition-colors"
                >
                  <td className="py-2 px-2">
                    <span
                      className="font-mono font-semibold text-[10px]"
                      style={{ color }}
                    >
                      {line.sportsbook}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-center font-mono text-text-primary">
                    {formatSpread(line.homeSpread)}
                  </td>
                  <td className="py-2 px-2 text-center font-mono text-text-primary">
                    {line.total}
                  </td>
                  <td className="py-2 px-2 text-center font-mono text-text-primary">
                    {formatOdds(line.homeML)}
                  </td>
                  <td className="py-2 px-2 text-center font-mono text-text-primary">
                    {formatOdds(line.awayML)}
                  </td>
                </tr>
              );
            })}

            {/* Model row */}
            {prediction && (
              <tr className="border-t-2 border-accent-green/20 bg-accent-green/5">
                <td className="py-2 px-2">
                  <span className="font-mono font-bold text-[10px] text-accent-green">
                    ★ MODEL
                  </span>
                </td>
                <td className="py-2 px-2 text-center font-mono font-bold text-accent-green">
                  {formatSpread(prediction.projectedSpread)}
                </td>
                <td className="py-2 px-2 text-center font-mono font-bold text-accent-green">
                  {prediction.projectedTotal.toFixed(1)}
                </td>
                <td className="py-2 px-2 text-center font-mono font-bold text-accent-green">
                  {formatOdds(prediction.fairOddsHome)}
                </td>
                <td className="py-2 px-2 text-center font-mono font-bold text-accent-green">
                  {formatOdds(prediction.fairOddsAway)}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edge analysis */}
      {prediction && lines[0] && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div
            className={cn(
              "p-2 rounded border text-center",
              prediction.edgeHome > 0
                ? "border-accent-green/20 bg-accent-green/5"
                : "border-bg-border bg-bg-secondary"
            )}
          >
            <div className="text-[9px] font-mono text-text-muted">
              {homeAbbr} ML EDGE
            </div>
            <div
              className="text-sm font-mono font-bold"
              style={{
                color: prediction.edgeHome > 0 ? "#00FF87" : "#FF3B5C",
              }}
            >
              {prediction.edgeHome > 0 ? "+" : ""}
              {prediction.edgeHome.toFixed(1)}%
            </div>
            <div className="text-[9px] text-text-muted font-mono">
              Fair: {formatOdds(prediction.fairOddsHome)} vs{" "}
              {formatOdds(lines[0].homeML)}
            </div>
          </div>
          <div
            className={cn(
              "p-2 rounded border text-center",
              prediction.edgeAway > 0
                ? "border-accent-green/20 bg-accent-green/5"
                : "border-bg-border bg-bg-secondary"
            )}
          >
            <div className="text-[9px] font-mono text-text-muted">
              {awayAbbr} ML EDGE
            </div>
            <div
              className="text-sm font-mono font-bold"
              style={{
                color: prediction.edgeAway > 0 ? "#00FF87" : "#FF3B5C",
              }}
            >
              {prediction.edgeAway > 0 ? "+" : ""}
              {prediction.edgeAway.toFixed(1)}%
            </div>
            <div className="text-[9px] text-text-muted font-mono">
              Fair: {formatOdds(prediction.fairOddsAway)} vs{" "}
              {formatOdds(lines[0].awayML)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
