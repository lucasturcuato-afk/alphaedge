"use client";
import { useState } from "react";
import { MOCK_GAMES } from "@/lib/mock-data/games";
import { SportBadge } from "@/components/ui/Badge";
import { runGameSimulation } from "@/lib/simulation/engine";
import Link from "next/link";
import { Activity, Play, ChevronRight } from "lucide-react";

type SimResult = {
  homeWinPct: number;
  awayWinPct: number;
  avgTotal: number;
  homeAvg: number;
  awayAvg: number;
  spreadCoverPct: number;
  percentiles: { p10: { home: number; away: number }; p50: { home: number; away: number }; p90: { home: number; away: number } };
};

export default function SimulationsPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const [iterations, setIterations] = useState(10000);
  const [result, setResult] = useState<SimResult | null>(null);
  const [running, setRunning] = useState(false);

  const game = MOCK_GAMES.find(g => g.id === selected);

  async function runSim() {
    if (!selected) return;
    setRunning(true);
    setResult(null);
    await new Promise(r => setTimeout(r, 100));
    const sim = runGameSimulation(selected, iterations);
    setResult(sim);
    setRunning(false);
  }

  return (
    <div className="animate-fade-in space-y-6">

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-lg bg-accent-green/10 border border-accent-green/20 flex items-center justify-center">
            <Activity size={16} className="text-accent-green" />
          </div>
          <h1 className="font-display font-bold text-xl text-text-primary">Simulations Lab</h1>
        </div>
        <p className="text-xs text-text-muted ml-10">
          Run custom Monte Carlo simulations on any game — adjust iterations and compare outputs
        </p>
      </div>

      {/* Config */}
      <div className="p-4 bg-bg-card border border-bg-border rounded-xl space-y-4">
        <div>
          <label className="text-[10px] font-mono text-text-muted uppercase tracking-wider block mb-2">Select Game</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {MOCK_GAMES.filter(g => g.prediction).map(g => (
              <button
                key={g.id}
                onClick={() => { setSelected(g.id); setResult(null); }}
                className={`flex items-center gap-2 p-2.5 rounded-lg border text-left transition-all ${
                  selected === g.id
                    ? "border-accent-green/50 bg-accent-green/5 text-text-primary"
                    : "border-bg-border bg-bg-secondary text-text-secondary hover:border-accent-green/20 hover:text-text-primary"
                }`}
              >
                <SportBadge sport={g.sport} />
                <span className="text-xs font-semibold">{g.awayTeam.abbreviation} @ {g.homeTeam.abbreviation}</span>
                {selected === g.id && <span className="ml-auto text-accent-green text-[9px] font-mono">SELECTED</span>}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[10px] font-mono text-text-muted uppercase tracking-wider block mb-2">Iterations</label>
          <div className="flex gap-2">
            {[1000, 5000, 10000, 25000].map(n => (
              <button
                key={n}
                onClick={() => setIterations(n)}
                className={`px-3 py-1.5 rounded text-xs font-mono font-bold transition-all ${
                  iterations === n
                    ? "bg-accent-green text-bg-primary"
                    : "bg-bg-secondary text-text-muted border border-bg-border hover:border-accent-green/30"
                }`}
              >
                {n >= 1000 ? `${n/1000}K` : n}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={runSim}
          disabled={!selected || running}
          className="flex items-center gap-2 px-5 py-2.5 bg-accent-green text-bg-primary rounded-lg font-mono font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-accent-green/90 transition-all"
        >
          <Play size={14} />
          {running ? `Running ${iterations.toLocaleString()} sims...` : "Run Simulation"}
        </button>
      </div>

      {/* Results */}
      {result && game && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center gap-2">
            <Activity size={14} className="text-accent-green" />
            <h2 className="font-display font-bold text-base text-text-primary">
              Results — {game.awayTeam.abbreviation} @ {game.homeTeam.abbreviation}
            </h2>
            <span className="text-[9px] font-mono text-text-muted">{iterations.toLocaleString()} iterations</span>
          </div>

          {/* Win probs */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 bg-bg-card border border-bg-border rounded-xl text-center">
              <div className="text-[10px] font-mono text-text-muted mb-1">{game.awayTeam.abbreviation} WIN%</div>
              <div className="text-3xl font-display font-bold text-accent-blue">{result.awayWinPct.toFixed(1)}%</div>
            </div>
            <div className="p-4 bg-bg-card border border-bg-border rounded-xl text-center">
              <div className="text-[10px] font-mono text-text-muted mb-1">{game.homeTeam.abbreviation} WIN%</div>
              <div className="text-3xl font-display font-bold text-accent-green">{result.homeWinPct.toFixed(1)}%</div>
            </div>
          </div>

          {/* Score projections */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-bg-card border border-bg-border rounded-lg text-center">
              <div className="text-[9px] font-mono text-text-muted">{game.awayTeam.abbreviation} AVG</div>
              <div className="text-xl font-mono font-bold text-text-primary">{result.awayAvg.toFixed(1)}</div>
            </div>
            <div className="p-3 bg-bg-card border border-accent-blue/30 rounded-lg text-center">
              <div className="text-[9px] font-mono text-accent-blue">PROJ TOTAL</div>
              <div className="text-xl font-mono font-bold text-accent-blue">{result.avgTotal.toFixed(1)}</div>
              {game.lines?.[0] && (
                <div className="text-[9px] font-mono text-text-muted mt-0.5">
                  Line: {game.lines[0].total} ({result.avgTotal - game.lines[0].total > 0 ? "+" : ""}{(result.avgTotal - game.lines[0].total).toFixed(1)})
                </div>
              )}
            </div>
            <div className="p-3 bg-bg-card border border-bg-border rounded-lg text-center">
              <div className="text-[9px] font-mono text-text-muted">{game.homeTeam.abbreviation} AVG</div>
              <div className="text-xl font-mono font-bold text-text-primary">{result.homeAvg.toFixed(1)}</div>
            </div>
          </div>

          {/* Spread */}
          <div className="p-3 bg-bg-card border border-bg-border rounded-lg">
            <div className="text-[10px] font-mono text-text-muted mb-1">{game.homeTeam.abbreviation} ATS COVER %</div>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 bg-bg-border rounded-full overflow-hidden">
                <div className="h-full bg-accent-green rounded-full" style={{ width: `${result.spreadCoverPct}%` }} />
              </div>
              <span className="text-sm font-mono font-bold text-accent-green w-12 text-right">{result.spreadCoverPct.toFixed(1)}%</span>
            </div>
          </div>

          {/* Percentiles */}
          <div>
            <div className="text-[10px] font-mono text-text-muted mb-2 uppercase tracking-wider">Score Percentiles</div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="text-text-muted">
                    <td className="py-1.5 pr-4">Team</td>
                    <td className="py-1.5 pr-4 text-center">P10</td>
                    <td className="py-1.5 pr-4 text-center">P50</td>
                    <td className="py-1.5 text-center">P90</td>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-bg-border">
                    <td className="py-2 pr-4 text-text-primary font-semibold">{game.awayTeam.abbreviation}</td>
                    <td className="py-2 pr-4 text-center text-text-secondary">{result.percentiles.p10.away}</td>
                    <td className="py-2 pr-4 text-center text-accent-blue font-bold">{result.percentiles.p50.away}</td>
                    <td className="py-2 text-center text-text-secondary">{result.percentiles.p90.away}</td>
                  </tr>
                  <tr className="border-t border-bg-border">
                    <td className="py-2 pr-4 text-text-primary font-semibold">{game.homeTeam.abbreviation}</td>
                    <td className="py-2 pr-4 text-center text-text-secondary">{result.percentiles.p10.home}</td>
                    <td className="py-2 pr-4 text-center text-accent-green font-bold">{result.percentiles.p50.home}</td>
                    <td className="py-2 text-center text-text-secondary">{result.percentiles.p90.home}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <Link href={`/game/${game.id}`} className="flex items-center gap-2 text-xs text-accent-green font-mono hover:underline">
            View full game analysis <ChevronRight size={12} />
          </Link>
        </div>
      )}

      {!result && !running && (
        <div className="p-8 bg-bg-card border border-bg-border rounded-xl text-center text-text-muted text-xs font-mono">
          Select a game and hit Run Simulation to see results
        </div>
      )}

    </div>
  );
}
