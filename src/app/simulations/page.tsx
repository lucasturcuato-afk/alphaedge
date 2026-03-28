
"use client";
import { useState, useEffect } from "react";
import { SportBadge } from "@/components/ui/Badge";
import { Activity, Play, RefreshCw } from "lucide-react";
import type { Game } from "@/lib/types";

// Real Monte Carlo simulation running in the browser
// Uses Box-Muller transform for normally distributed scores
function normalRandom(mean: number, stddev: number): number {
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(Math.max(u1, 1e-10))) * Math.cos(2 * Math.PI * u2);
  return mean + z * stddev;
}

function poissonRandom(lambda: number): number {
  const L = Math.exp(-lambda);
  let k = 0, p = 1;
  do { k++; p *= Math.random(); } while (p > L);
  return Math.max(0, k - 1);
}

interface SimResult {
  homeWinPct: number;
  awayWinPct: number;
  avgTotal: number;
  homeAvg: number;
  awayAvg: number;
  spreadCoverPct: number;
  overPct: number;
  distribution: Array<{ range: string; pct: number }>;
  iterations: number;
}

function runRealSimulation(game: Game, iterations: number): SimResult {
  const pred = game.prediction;
  const sport = game.sport;
  const line = game.lines?.[0];

  // Extract real stats from prediction — these come from Log5/ESPN data
  const homeWinProb = pred?.winProbHome ?? 0.5;
  const projTotal = pred?.projectedTotal ?? (sport === "MLB" ? 8.5 : 224);
  const projSpread = pred?.projectedSpread ?? 0;

  let homeWins = 0;
  const totals: number[] = [];
  const homeFinals: number[] = [];
  const awayFinals: number[] = [];

  if (sport === "MLB") {
    // MLB: Poisson model — each team's runs as independent Poisson variable
    const homeRunsExpected = projTotal / 2 + (-projSpread / 2);
    const awayRunsExpected = projTotal / 2 - (-projSpread / 2);

    for (let i = 0; i < iterations; i++) {
      // Add variance to expected runs per game (~15% stddev)
      const homeRuns = poissonRandom(Math.max(1, normalRandom(homeRunsExpected, homeRunsExpected * 0.15)));
      const awayRuns = poissonRandom(Math.max(1, normalRandom(awayRunsExpected, awayRunsExpected * 0.15)));
      homeFinals.push(homeRuns);
      awayFinals.push(awayRuns);
      totals.push(homeRuns + awayRuns);
      if (homeRuns > awayRuns) homeWins++;
    }
  } else {
    // Basketball: Normal distribution model
    // Expected scores from win probability and projected total
    const homeExpected = projTotal / 2 + (-projSpread / 2);
    const awayExpected = projTotal / 2 - (-projSpread / 2);
    // Score std dev ~8-10% of total for basketball
    const stddev = sport === "NBA" ? projTotal * 0.088 : projTotal * 0.095;

    for (let i = 0; i < iterations; i++) {
      const homeScore = Math.round(normalRandom(homeExpected, stddev));
      const awayScore = Math.round(normalRandom(awayExpected, stddev));
      homeFinals.push(homeScore);
      awayFinals.push(awayScore);
      totals.push(homeScore + awayScore);
      if (homeScore > awayScore) homeWins++;
    }
  }

  // Calculate spread cover %
  const postedSpread = line?.homeSpread ?? projSpread;
  const spreadCovers = homeFinals.filter((h, i) => (h - awayFinals[i]) > -postedSpread).length;
  const postedTotal = line?.total ?? projTotal;
  const overCount = totals.filter(t => t > postedTotal).length;

  // Build score distribution buckets
  const bucketSize = sport === "MLB" ? 1 : 8;
  const minT = Math.min(...totals);
  const maxT = Math.max(...totals);
  const buckets: Record<number, number> = {};
  totals.forEach(t => {
    const b = Math.floor(t / bucketSize) * bucketSize;
    buckets[b] = (buckets[b] || 0) + 1;
  });
  const distribution = Object.entries(buckets)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([b, count]) => ({
      range: sport === "MLB" ? `${b}` : `${b}-${Number(b)+bucketSize-1}`,
      pct: Number(((count / iterations) * 100).toFixed(1)),
    }));

  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;

  return {
    homeWinPct: Number(((homeWins / iterations) * 100).toFixed(1)),
    awayWinPct: Number((((iterations - homeWins) / iterations) * 100).toFixed(1)),
    avgTotal: Number(avg(totals).toFixed(1)),
    homeAvg: Number(avg(homeFinals).toFixed(1)),
    awayAvg: Number(avg(awayFinals).toFixed(1)),
    spreadCoverPct: Number(((spreadCovers / iterations) * 100).toFixed(1)),
    overPct: Number(((overCount / iterations) * 100).toFixed(1)),
    distribution: distribution.slice(0, 12),
    iterations,
  };
}

export default function SimulationsPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [iterations, setIterations] = useState(10000);
  const [result, setResult] = useState<SimResult | null>(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    fetch("/api/games", { cache: "no-store" })
      .then(r => r.json())
      .then(d => { setGames(d.games ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const game = games.find(g => g.id === selected);

  function runSim() {
    if (!game) return;
    setRunning(true);
    setResult(null);
    // Run async so UI updates
    setTimeout(() => {
      const r = runRealSimulation(game, iterations);
      setResult(r);
      setRunning(false);
    }, 50);
  }

  const ITERATION_OPTIONS = [1000, 5000, 10000, 25000];

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-lg bg-accent-green/10 border border-accent-green/20 flex items-center justify-center">
            <Activity size={16} className="text-accent-green" />
          </div>
          <h1 className="font-display font-bold text-xl text-text-primary">Simulations Lab</h1>
        </div>
        <p className="text-xs text-text-muted ml-10">Real Monte Carlo simulation — Box-Muller normal distribution for basketball, Poisson for MLB</p>
      </div>

      <div className="p-4 bg-bg-card border border-bg-border rounded-xl space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-xs text-text-muted font-mono"><RefreshCw size={12} className="animate-spin" />Loading today&apos;s games...</div>
        ) : (
          <>
            <div>
              <label className="text-[10px] font-mono text-text-muted uppercase tracking-wider block mb-2">Select Game ({games.length} today)</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                {games.map(g => (
                  <button key={g.id} onClick={() => { setSelected(g.id); setResult(null); }}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border text-left transition-all ${selected === g.id ? "border-accent-green/50 bg-accent-green/5 text-text-primary" : "border-bg-border bg-bg-secondary text-text-secondary hover:border-accent-green/20"}`}>
                    <SportBadge sport={g.sport} />
                    <span className="text-xs font-semibold">{g.awayTeam.abbreviation} @ {g.homeTeam.abbreviation}</span>
                    {g.prediction?.winProbHome && (
                      <span className="ml-auto text-[9px] font-mono text-text-muted">{Math.round(g.prediction.winProbHome * 100)}%</span>
                    )}
                    {selected === g.id && <span className="ml-auto text-accent-green text-[9px] font-mono">SELECTED</span>}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[10px] font-mono text-text-muted uppercase tracking-wider block mb-2">Iterations</label>
              <div className="flex gap-2">
                {ITERATION_OPTIONS.map(n => (
                  <button key={n} onClick={() => setIterations(n)}
                    className={`px-3 py-1.5 rounded text-xs font-mono font-bold transition-all ${iterations === n ? "bg-accent-green text-bg-primary" : "bg-bg-secondary text-text-muted border border-bg-border"}`}>
                    {n >= 1000 ? `${n/1000}K` : n}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={runSim} disabled={!selected || running}
              className="flex items-center gap-2 px-5 py-2.5 bg-accent-green text-bg-primary rounded-lg font-mono font-bold text-sm disabled:opacity-40 hover:bg-accent-green/90 transition-colors">
              <Play size={14} />
              {running ? `Simulating ${iterations.toLocaleString()} games...` : "Run Simulation"}
            </button>
          </>
        )}
      </div>

      {result && game && (
        <div className="space-y-4 animate-fade-in">
          <div className="p-3 bg-accent-green/5 border border-accent-green/20 rounded-lg text-[10px] font-mono text-accent-green">
            ✓ Ran {result.iterations.toLocaleString()} Monte Carlo iterations — {game.sport === "MLB" ? "Poisson run model" : "Box-Muller normal distribution"} · Based on {game.sport === "NBA" ? "Log5 net ratings" : "Vegas-implied win probability"}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 bg-bg-card border border-bg-border rounded-xl text-center">
              <div className="text-[10px] font-mono text-text-muted mb-1">{game.awayTeam.abbreviation} WIN%</div>
              <div className={`text-3xl font-display font-bold ${result.awayWinPct > 50 ? "text-accent-green" : "text-accent-blue"}`}>{result.awayWinPct}%</div>
              <div className="text-[9px] font-mono text-text-muted mt-1">Avg: {result.awayAvg} {game.sport === "MLB" ? "runs" : "pts"}</div>
            </div>
            <div className="p-4 bg-bg-card border border-bg-border rounded-xl text-center">
              <div className="text-[10px] font-mono text-text-muted mb-1">{game.homeTeam.abbreviation} WIN%</div>
              <div className={`text-3xl font-display font-bold ${result.homeWinPct > 50 ? "text-accent-green" : "text-accent-blue"}`}>{result.homeWinPct}%</div>
              <div className="text-[9px] font-mono text-text-muted mt-1">Avg: {result.homeAvg} {game.sport === "MLB" ? "runs" : "pts"}</div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 bg-bg-card border border-accent-blue/30 rounded-lg text-center">
              <div className="text-[9px] font-mono text-accent-blue">PROJ TOTAL</div>
              <div className="text-xl font-mono font-bold text-accent-blue">{result.avgTotal}</div>
              {game.lines?.[0]?.total && (
                <div className="text-[9px] font-mono text-text-muted">Line: {game.lines[0].total}</div>
              )}
            </div>
            <div className="p-3 bg-bg-card border border-bg-border rounded-lg text-center">
              <div className="text-[9px] font-mono text-text-muted">SPREAD CVR%</div>
              <div className="text-xl font-mono font-bold text-text-primary">{result.spreadCoverPct}%</div>
              <div className="text-[9px] font-mono text-text-muted">{game.homeTeam.abbreviation} covers</div>
            </div>
            <div className="p-3 bg-bg-card border border-bg-border rounded-lg text-center">
              <div className="text-[9px] font-mono text-text-muted">OVER%</div>
              <div className={`text-xl font-mono font-bold ${result.overPct > 52 ? "text-accent-green" : result.overPct < 48 ? "text-accent-red" : "text-text-primary"}`}>{result.overPct}%</div>
              {game.lines?.[0]?.total && (
                <div className="text-[9px] font-mono text-text-muted">O/U {game.lines[0].total}</div>
              )}
            </div>
          </div>

          {/* Score distribution */}
          <div className="p-4 bg-bg-card border border-bg-border rounded-xl">
            <div className="text-[10px] font-mono text-text-muted mb-3 uppercase tracking-wider">Score Distribution ({game.sport === "MLB" ? "Total Runs" : "Total Points"})</div>
            <div className="space-y-1.5">
              {result.distribution.map((bucket, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-[9px] font-mono text-text-muted w-14 text-right shrink-0">{bucket.range}</span>
                  <div className="flex-1 h-3 bg-bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-accent-green/60 rounded-full transition-all" style={{ width: `${Math.min(100, bucket.pct * 4)}%` }} />
                  </div>
                  <span className="text-[9px] font-mono text-text-muted w-10 shrink-0">{bucket.pct}%</span>
                </div>
              ))}
            </div>
          </div>

          {game.prediction?.reasoning && (
            <div className="p-3 bg-bg-secondary rounded-lg border border-bg-border">
              <div className="text-[9px] font-mono text-text-muted mb-1 uppercase tracking-wider">Model Basis</div>
              <p className="text-[10px] text-text-secondary leading-relaxed">{game.prediction.reasoning}</p>
            </div>
          )}
        </div>
      )}

      {!result && !running && selected && (
        <div className="p-6 bg-bg-card border border-bg-border rounded-xl text-center text-text-muted text-xs font-mono">
          Game selected — hit Run Simulation to execute {iterations.toLocaleString()} iterations
        </div>
      )}
    </div>
  );
}
