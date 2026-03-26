"use client";
// src/components/game/LiveSimulationPanel.tsx
// Runs Monte Carlo simulation in the browser using the TypeScript engine

import { useState, useEffect, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, ReferenceLine, Area, AreaChart,
} from "recharts";
import { runGameSimulation } from "@/lib/simulation/engine";
import type { SimulationResult } from "@/lib/types";
import { RefreshCw, Zap, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

interface LiveSimulationPanelProps {
  gameId: string;
  homeAbbr: string;
  awayAbbr: string;
  sport: string;
  precomputedSim?: SimulationResult;
}

const ITERATION_STEPS = [1000, 5000, 10000, 25000];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="bg-bg-card border border-bg-border rounded p-2 text-xs">
        <p className="font-mono text-text-muted">{label}</p>
        <p className="font-mono font-bold text-accent-green">{payload[0].value.toFixed(1)}%</p>
      </div>
    );
  }
  return null;
};

export function LiveSimulationPanel({
  gameId, homeAbbr, awayAbbr, sport, precomputedSim,
}: LiveSimulationPanelProps) {
  const [sim, setSim] = useState<SimulationResult | null>(precomputedSim ?? null);
  const [iterations, setIterations] = useState(10000);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [runCount, setRunCount] = useState(0);
  const [showMethod, setShowMethod] = useState(false);

  const runSim = useCallback(async () => {
    setRunning(true);
    setProgress(0);

    // Animate progress bar
    const steps = 20;
    const stepTime = 80;
    for (let i = 1; i <= steps; i++) {
      await new Promise((r) => setTimeout(r, stepTime));
      setProgress(Math.round((i / steps) * 95));
    }

    // Run the actual simulation
    const result = runGameSimulation(gameId, iterations);
    if (result) {
      setSim(result);
      setRunCount((c) => c + 1);
    }

    setProgress(100);
    await new Promise((r) => setTimeout(r, 200));
    setRunning(false);
    setProgress(0);
  }, [gameId, iterations]);

  // Run once on mount if no precomputed
  useEffect(() => {
    if (!precomputedSim) {
      runSim();
    }
  }, []);

  const data = sim?.distribution ?? [];

  return (
    <div className="bg-bg-card border border-bg-border rounded-xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <Activity size={13} className="text-accent-green" />
            <h3 className="text-xs font-mono font-semibold text-text-secondary uppercase tracking-wider">
              Monte Carlo Simulation
            </h3>
            {runCount > 0 && (
              <span className="text-[9px] font-mono text-accent-green bg-accent-green/10 px-1.5 py-0.5 rounded">
                RUN #{runCount}
              </span>
            )}
          </div>
          <p className="text-[10px] text-text-muted mt-0.5">
            {iterations.toLocaleString()} iterations · {sport}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Iteration selector */}
          <div className="flex border border-bg-border rounded-md overflow-hidden">
            {ITERATION_STEPS.map((n) => (
              <button
                key={n}
                onClick={() => setIterations(n)}
                className={cn(
                  "text-[9px] font-mono px-2 py-1.5 transition-colors",
                  iterations === n
                    ? "bg-accent-green/10 text-accent-green"
                    : "text-text-muted hover:text-text-secondary"
                )}
              >
                {n >= 1000 ? `${n / 1000}K` : n}
              </button>
            ))}
          </div>
          <button
            onClick={runSim}
            disabled={running}
            className="flex items-center gap-1.5 text-[10px] font-mono px-2.5 py-1.5 bg-accent-green/10 border border-accent-green/20 text-accent-green rounded-md hover:bg-accent-green/20 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={11} className={running ? "animate-spin" : ""} />
            {running ? "Running..." : "Re-run"}
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {running && (
        <div className="mb-4">
          <div className="h-1 bg-bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-accent-green rounded-full transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-[9px] font-mono text-text-muted mt-1">
            Simulating {iterations.toLocaleString()} game outcomes...
          </p>
        </div>
      )}

      {sim && !running && (
        <>
          {/* Win probability split */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className="p-3 bg-bg-secondary rounded-md border border-bg-border text-center">
              <div className="text-[9px] font-mono text-text-muted mb-0.5">{awayAbbr} WIN%</div>
              <div className="text-2xl font-mono font-bold text-text-secondary">
                {sim.awayWinPct.toFixed(1)}<span className="text-sm">%</span>
              </div>
            </div>
            <div className="p-3 bg-bg-secondary rounded-md border border-accent-green/20 text-center">
              <div className="text-[9px] font-mono text-accent-green mb-0.5">{homeAbbr} WIN%</div>
              <div className="text-2xl font-mono font-bold text-accent-green">
                {sim.homeWinPct.toFixed(1)}<span className="text-sm text-accent-green/60">%</span>
              </div>
            </div>
          </div>

          {/* Score projections */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              { label: `${awayAbbr} AVG`, val: sim.avgAwayScore.toFixed(1), color: "#7B8FA6" },
              { label: "TOTAL", val: sim.avgTotal.toFixed(1), color: "#0EA5E9" },
              { label: `${homeAbbr} AVG`, val: sim.avgHomeScore.toFixed(1), color: "#00FF87" },
            ].map((item) => (
              <div key={item.label} className="p-2 bg-bg-secondary rounded border border-bg-border text-center">
                <div className="text-[9px] font-mono text-text-muted">{item.label}</div>
                <div className="text-lg font-mono font-bold" style={{ color: item.color }}>
                  {item.val}
                </div>
              </div>
            ))}
          </div>

          {/* Distribution chart */}
          <div className="mb-4">
            <div className="text-[9px] font-mono text-text-muted mb-2 uppercase tracking-wider">
              Combined Score Distribution
            </div>
            <div className="h-28">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                  <XAxis
                    dataKey="range"
                    tick={{ fontSize: 7, fill: "#4A5D6E", fontFamily: "IBM Plex Mono" }}
                    axisLine={false} tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 7, fill: "#4A5D6E", fontFamily: "IBM Plex Mono" }}
                    axisLine={false} tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="pct" radius={[2, 2, 0, 0]}>
                    {data.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.pct === Math.max(...data.map((d) => d.pct)) ? "#00FF87" : "#1C2330"}
                        stroke={entry.pct === Math.max(...data.map((d) => d.pct)) ? "#00FF8740" : "transparent"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Percentile table */}
          <div className="mb-4">
            <div className="text-[9px] font-mono text-text-muted mb-2 uppercase tracking-wider">
              Score Percentiles ({iterations.toLocaleString()} sims)
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-bg-border">
                  {["TEAM", "P10", "P25", "P50", "P75", "P90"].map((h) => (
                    <th key={h} className="text-[9px] font-mono text-text-muted py-1 text-center">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: awayAbbr, vals: [sim.percentiles.p10.away, sim.percentiles.p25.away, sim.percentiles.p50.away, sim.percentiles.p75.away, sim.percentiles.p90.away] },
                  { label: homeAbbr, vals: [sim.percentiles.p10.home, sim.percentiles.p25.home, sim.percentiles.p50.home, sim.percentiles.p75.home, sim.percentiles.p90.home] },
                ].map((row) => (
                  <tr key={row.label} className="border-b border-bg-border/50">
                    <td className="text-[10px] font-mono text-text-secondary py-1.5 text-center font-semibold">{row.label}</td>
                    {row.vals.map((v, i) => (
                      <td key={i} className="text-[10px] font-mono font-semibold text-text-primary py-1.5 text-center">{v}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ATS + model signal */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 bg-bg-secondary rounded border border-bg-border text-center">
              <div className="text-[9px] font-mono text-text-muted">{homeAbbr} ATS Cover %</div>
              <div
                className="text-sm font-mono font-bold"
                style={{ color: sim.spreadCoverPct > 52 ? "#00FF87" : sim.spreadCoverPct > 48 ? "#F59E0B" : "#7B8FA6" }}
              >
                {sim.spreadCoverPct.toFixed(1)}%
              </div>
            </div>
            <div className="p-2 bg-bg-secondary rounded border border-bg-border text-center">
              <div className="text-[9px] font-mono text-text-muted">ITERATIONS</div>
              <div className="text-sm font-mono font-bold text-accent-blue">
                {iterations.toLocaleString()}
              </div>
            </div>
          </div>

          {/* Methodology explanation */}
          <div className="mt-3 border border-bg-border rounded-lg overflow-hidden">
            <button
              onClick={() => setShowMethod((v) => !v)}
              className="w-full flex items-center justify-between px-3 py-2 bg-bg-secondary hover:bg-bg-border/40 transition-colors"
            >
              <span className="text-[9px] font-mono text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                <Activity size={9} className="text-accent-green" />
                How this simulation works
              </span>
              <span className="text-[9px] font-mono text-text-muted">{showMethod ? "▲" : "▼"}</span>
            </button>
            {showMethod && (
              <div className="px-3 py-3 space-y-2.5 text-[9px] font-mono text-text-muted leading-relaxed bg-bg-secondary/40">
                {sport === "MLB" ? (
                  <>
                    <div>
                      <span className="text-accent-green font-semibold block mb-1">⚾ MLB Poisson Run Model</span>
                      Each iteration simulates both teams' run scoring independently using a Poisson distribution — the same statistical model used by Vegas quants for baseball. Expected runs are derived from: starting pitcher ERA vs. league average ({"> "}ERA = fewer runs), lineup quality (85–115 scale), home field (+4%), temperature, and wind direction/speed.
                    </div>
                    <div>
                      <span className="text-accent-amber font-semibold">Run line ({homeAbbr} -1.5):</span> Home covers when they win by 2+ runs. Model counts that across {iterations.toLocaleString()} simulations to produce the {sim.spreadCoverPct.toFixed(1)}% cover rate shown above.
                    </div>
                    <div>
                      <span className="text-text-secondary font-semibold">Total projection ({sim.avgTotal.toFixed(1)}):</span> Average combined runs across all {iterations.toLocaleString()} simulations. Compare to the posted {sport === "MLB" ? "total" : "total"} line to find over/under value.
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <span className="text-accent-green font-semibold block mb-1">🏀 Monte Carlo Basketball Engine</span>
                      Each of the {iterations.toLocaleString()} iterations simulates a full game by sampling from normal distributions centered on each team's expected score. Expected scores are derived from: offensive rating (points per 100 possessions), defensive rating (points allowed per 100), pace (possessions per game), home court advantage ({sport === "NBA" ? "+3.1" : "+4.8"} pts), rest days, and injury deductions (star = -6 pts, starter = -3.5 pts).
                    </div>
                    <div>
                      <span className="text-accent-amber font-semibold">Correlated noise:</span> Both teams share a pace component — faster-paced games push both scores up together, which is why the total distribution is tighter than individual score distributions.
                    </div>
                    <div>
                      <span className="text-text-secondary font-semibold">Win% ({homeAbbr} {sim.homeWinPct.toFixed(1)}% / {awayAbbr} {sim.awayWinPct.toFixed(1)}%):</span> Simple count of which team scored more across all iterations. The spread cover% ({sim.spreadCoverPct.toFixed(1)}%) counts how often {homeAbbr} won by more than the spread.
                    </div>
                    <div>
                      <span className="text-text-secondary font-semibold">Percentile table:</span> P10 = worst realistic outcome (10th percentile), P50 = median game, P90 = best realistic outcome. A team projected P50 of {sim.percentiles.p50.home} means half of simulations had them score above that.
                    </div>
                  </>
                )}
                <div className="pt-1 border-t border-bg-border">
                  <span className="text-accent-amber font-semibold">Monte Carlo variance:</span> Each re-run produces slightly different numbers — that's intentional. More iterations = more stable estimates. 25K iterations has ~3x lower variance than 5K. The distribution shape stabilizes before individual numbers do.
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {!sim && !running && (
        <div className="text-center py-8">
          <p className="text-xs text-text-muted font-mono">No simulation data for this game.</p>
          <button onClick={runSim} className="mt-2 text-[10px] text-accent-green font-mono underline">
            Run now
          </button>
        </div>
      )}
    </div>
  );
}
