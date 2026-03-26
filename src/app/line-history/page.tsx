"use client";
import { MOCK_GAMES } from "@/lib/mock-data/games";
import { SportBadge } from "@/components/ui/Badge";
import { useState } from "react";
import { TrendingUp, ArrowUp, ArrowDown, Minus } from "lucide-react";

// Generate synthetic line movement history for each game
function generateLineHistory(gameId: string, currentSpread: number, currentTotal: number) {
  const seed = gameId.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const rng = (i: number) => ((seed * (i + 1) * 1664525 + 1013904223) & 0xffffffff) / 0xffffffff;

  const hours = ["Open", "48h", "24h", "12h", "6h", "2h", "Now"];
  let spread = currentSpread + (rng(0) > 0.5 ? 1 : -1) * (Math.round(rng(1) * 3 * 2) / 2);
  let total = currentTotal + (rng(2) > 0.5 ? 1 : -1) * (Math.round(rng(3) * 3 * 2) / 2);

  return hours.map((label, i) => {
    if (i === hours.length - 1) return { label, spread: currentSpread, total: currentTotal };
    const s = spread - (rng(i * 2) - 0.5) * (rng(i * 3) * 1.5);
    const t = total - (rng(i * 2 + 1) - 0.5) * (rng(i * 3 + 1) * 2);
    const roundedS = Math.round(s * 2) / 2;
    const roundedT = Math.round(t * 2) / 2;
    const entry = { label, spread: roundedS, total: roundedT };
    spread = s;
    total = t;
    return entry;
  });
}

function Movement({ open, current }: { open: number; current: number }) {
  const diff = current - open;
  if (Math.abs(diff) < 0.1) return <Minus size={10} className="text-text-muted" />;
  if (diff > 0) return <span className="flex items-center gap-0.5 text-accent-green text-[9px] font-mono">+{diff.toFixed(1)} <ArrowUp size={9} /></span>;
  return <span className="flex items-center gap-0.5 text-accent-red text-[9px] font-mono">{diff.toFixed(1)} <ArrowDown size={9} /></span>;
}

export default function LineHistoryPage() {
  const [sport, setSport] = useState<string>("All");
  const [selected, setSelected] = useState<string | null>(null);

  const games = MOCK_GAMES.filter(g => g.lines?.[0] && (sport === "All" || g.sport === sport));
  const selectedGame = MOCK_GAMES.find(g => g.id === selected);

  return (
    <div className="animate-fade-in space-y-6">

      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-lg bg-accent-amber/10 border border-accent-amber/20 flex items-center justify-center">
            <TrendingUp size={16} className="text-accent-amber" />
          </div>
          <h1 className="font-display font-bold text-xl text-text-primary">Line History</h1>
        </div>
        <p className="text-xs text-text-muted ml-10">Track how spreads and totals have moved from open to now</p>
      </div>

      {/* Sport filter */}
      <div className="flex gap-2">
        {["All", "NBA", "NCAAMB", "MLB"].map(s => (
          <button key={s} onClick={() => setSport(s)}
            className={`px-3 py-1.5 rounded text-xs font-mono font-bold transition-all ${
              sport === s ? "bg-accent-amber text-bg-primary" : "bg-bg-secondary text-text-muted border border-bg-border hover:border-accent-amber/30"
            }`}
          >{s}</button>
        ))}
      </div>

      {/* Game list */}
      <div className="space-y-2">
        {games.map(g => {
          const line = g.lines![0];
          const history = generateLineHistory(g.id, line.homeSpread, line.total);
          const openEntry = history[0];
          const isSelected = selected === g.id;

          return (
            <div key={g.id} className="bg-bg-card border border-bg-border rounded-xl overflow-hidden">
              <button
                onClick={() => setSelected(isSelected ? null : g.id)}
                className="w-full flex items-center gap-3 p-3 hover:bg-bg-secondary/50 transition-colors text-left"
              >
                <SportBadge sport={g.sport} />
                <span className="text-sm font-semibold text-text-primary flex-1">
                  {g.awayTeam.abbreviation} @ {g.homeTeam.abbreviation}
                </span>

                {/* Spread movement */}
                <div className="text-right hidden sm:block">
                  <div className="text-[9px] font-mono text-text-muted">SPREAD</div>
                  <div className="flex items-center gap-1.5 justify-end">
                    <span className="text-xs font-mono text-text-secondary">{openEntry.spread > 0 ? "+" : ""}{openEntry.spread}</span>
                    <span className="text-text-muted text-[9px]">→</span>
                    <span className="text-xs font-mono font-bold text-text-primary">{line.homeSpread > 0 ? "+" : ""}{line.homeSpread}</span>
                    <Movement open={openEntry.spread} current={line.homeSpread} />
                  </div>
                </div>

                {/* Total movement */}
                <div className="text-right hidden sm:block">
                  <div className="text-[9px] font-mono text-text-muted">TOTAL</div>
                  <div className="flex items-center gap-1.5 justify-end">
                    <span className="text-xs font-mono text-text-secondary">{openEntry.total}</span>
                    <span className="text-text-muted text-[9px]">→</span>
                    <span className="text-xs font-mono font-bold text-text-primary">{line.total}</span>
                    <Movement open={openEntry.total} current={line.total} />
                  </div>
                </div>

                <span className="text-[9px] font-mono text-text-muted ml-2">{isSelected ? "▲" : "▼"}</span>
              </button>

              {/* Expanded timeline */}
              {isSelected && (
                <div className="border-t border-bg-border p-3 bg-bg-secondary/30">
                  <div className="text-[9px] font-mono text-text-muted uppercase tracking-wider mb-2">Line Movement Timeline</div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs font-mono">
                      <thead>
                        <tr className="text-text-muted">
                          <td className="pb-2 pr-6">Time</td>
                          <td className="pb-2 pr-6 text-center">{g.homeTeam.abbreviation} Spread</td>
                          <td className="pb-2 text-center">Total</td>
                        </tr>
                      </thead>
                      <tbody>
                        {history.map((entry, i) => (
                          <tr key={i} className={`border-t border-bg-border/50 ${i === history.length - 1 ? "text-text-primary font-bold" : "text-text-secondary"}`}>
                            <td className="py-1.5 pr-6">{entry.label}</td>
                            <td className="py-1.5 pr-6 text-center">{entry.spread > 0 ? "+" : ""}{entry.spread}</td>
                            <td className="py-1.5 text-center">{entry.total}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Model vs current */}
                  {g.prediction && (
                    <div className="mt-3 pt-3 border-t border-bg-border flex gap-6">
                      <div>
                        <div className="text-[9px] font-mono text-text-muted">MODEL SPREAD</div>
                        <div className="text-sm font-mono font-bold text-accent-green">
                          {g.prediction.projectedSpread > 0 ? "+" : ""}{g.prediction.projectedSpread?.toFixed(1)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[9px] font-mono text-text-muted">MODEL TOTAL</div>
                        <div className="text-sm font-mono font-bold text-accent-blue">
                          {g.prediction.projectedTotal?.toFixed(1)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[9px] font-mono text-text-muted">SPREAD EDGE</div>
                        <div className={`text-sm font-mono font-bold ${g.prediction.edgeHome > 0 ? "text-accent-green" : "text-accent-red"}`}>
                          {g.prediction.edgeHome > 0 ? "+" : ""}{g.prediction.edgeHome.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
