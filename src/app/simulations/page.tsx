"use client";
import { useState } from "react";
import { MOCK_GAMES } from "@/lib/mock-data/games";
import { SportBadge } from "@/components/ui/Badge";
import { runGameSimulation } from "@/lib/simulation/engine";
import Link from "next/link";
import { Activity, Play, ChevronRight } from "lucide-react";

export default function SimulationsPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const [iterations, setIterations] = useState(10000);
  const [result, setResult] = useState<ReturnType<typeof runGameSimulation> | null>(null);
  const [running, setRunning] = useState(false);

  const game = MOCK_GAMES.find(g => g.id === selected);

  async function runSim() {
    if (!selected) return;
    setRunning(true);
    setResult(null);
    await new Promise(r => setTimeout(r, 100));
    const sim = runGameSimulation(selected, iterations);
    setResult(sim as any);
    setRunning(false);
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-lg bg-accent-green/10 border border-accent-green/20 flex items-center justify-center">
            <Activity size={16} className="text-accent-green" />
          </div>
          <h1 className="font-display font-bold text-xl text-text-primary">Simulations Lab</h1>
        </div>
        <p className="text-xs text-text-muted ml-10">Run Monte Carlo simulations on any game — 10K iterations each</p>
      </div>

      <div className="p-4 bg-bg-card border border-bg-border rounded-xl space-y-4">
        <div>
          <label className="text-[10px] font-mono text-text-muted uppercase tracking-wider block mb-2">Select Game</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {MOCK_GAMES.filter(g => g.prediction).map(g => (
              <button key={g.id} onClick={() => { setSelected(g.id); setResult(null); }}
                className={`flex items-center gap-2 p-2.5 rounded-lg border text-left transition-all ${selected === g.id ? "border-accent-green/50 bg-accent-green/5 text-text-primary" : "border-bg-border bg-bg-secondary text-text-secondary hover:border-accent-green/20"}`}>
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
              <button key={n} onClick={() => setIterations(n)}
                className={`px-3 py-1.5 rounded text-xs font-mono font-bold transition-all ${iterations === n ? "bg-accent-green text-bg-primary" : "bg-bg-secondary text-text-muted border border-bg-border"}`}>
                {n >= 1000 ? `${n/1000}K` : n}
              </button>
            ))}
          </div>
        </div>
        <button onClick={runSim} disabled={!selected || running}
          className="flex items-center gap-2 px-5 py-2.5 bg-accent-green text-bg-primary rounded-lg font-mono font-bold text-sm disabled:opacity-40">
          <Play size={14} />
          {running ? `Running ${iterations.toLocaleString()} sims...` : "Run Simulation"}
        </button>
      </div>

      {result && game && (
        <div className="space-y-4 animate-fade-in">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 bg-bg-card border border-bg-border rounded-xl text-center">
              <div className="text-[10px] font-mono text-text-muted mb-1">{game.awayTeam.abbreviation} WIN%</div>
              <div className="text-3xl font-display font-bold text-accent-blue">{(result as any).awayWinPct?.toFixed(1)}%</div>
            </div>
            <div className="p-4 bg-bg-card border border-bg-border rounded-xl text-center">
              <div className="text-[10px] font-mono text-text-muted mb-1">{game.homeTeam.abbreviation} WIN%</div>
              <div className="text-3xl font-display font-bold text-accent-green">{(result as any).homeWinPct?.toFixed(1)}%</div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-bg-card border border-bg-border rounded-lg text-center">
              <div className="text-[9px] font-mono text-text-muted">{game.awayTeam.abbreviation} AVG</div>
              <div className="text-xl font-mono font-bold text-text-primary">{(result as any).awayAvg?.toFixed(1)}</div>
            </div>
            <div className="p-3 bg-bg-card border border-accent-blue/30 rounded-lg text-center">
              <div className="text-[9px] font-mono text-accent-blue">PROJ TOTAL</div>
              <div className="text-xl font-mono font-bold text-accent-blue">{(result as any).avgTotal?.toFixed(1)}</div>
            </div>
            <div className="p-3 bg-bg-card border border-bg-border rounded-lg text-center">
              <div className="text-[9px] font-mono text-text-muted">{game.homeTeam.abbreviation} AVG</div>
              <div className="text-xl font-mono font-bold text-text-primary">{(result as any).homeAvg?.toFixed(1)}</div>
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
