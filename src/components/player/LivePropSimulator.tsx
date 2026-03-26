"use client";
// src/components/player/LivePropSimulator.tsx
// Interactive prop simulator — user can adjust inputs and re-run

import { useState, useCallback } from "react";
import { simulateProp } from "@/lib/simulation/engine";
import type { PropSimResult } from "@/lib/simulation/engine";
import { formatOdds, probToAmerican } from "@/lib/utils";
import { RefreshCw, Sliders } from "lucide-react";
import { AreaChart, Area, ReferenceLine, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

interface LivePropSimulatorProps {
  playerName: string;
  propType: string;
  bookLine: number;
  seasonAvg: number;
  last5Avg: number;
  last10Avg: number;
  opponentDefRank?: number;
  homeAway?: "home" | "away";
  restDays?: number;
  playerStatus?: "active" | "questionable" | "day-to-day";
}

export function LivePropSimulator({
  playerName, propType, bookLine,
  seasonAvg, last5Avg, last10Avg,
  opponentDefRank = 15,
  homeAway = "home",
  restDays = 1,
  playerStatus = "active",
}: LivePropSimulatorProps) {
  const [line, setLine] = useState(bookLine);
  const [last5, setLast5] = useState(last5Avg);
  const [oppRank, setOppRank] = useState(opponentDefRank);
  const [status, setStatus] = useState<"active" | "questionable" | "day-to-day">(playerStatus);
  const [result, setResult] = useState<PropSimResult | null>(null);
  const [running, setRunning] = useState(false);

  const runSim = useCallback(async () => {
    setRunning(true);
    await new Promise((r) => setTimeout(r, 300)); // small delay for UX
    const r = simulateProp({
      propType, bookLine: line,
      seasonAvg, last5Avg: last5, last10Avg,
      opponentDefRank: oppRank,
      homeAway, restDays,
      playerStatus: status,
      iterations: 20000,
    });
    setResult(r);
    setRunning(false);
  }, [line, last5, oppRank, status, propType, seasonAvg, last10Avg, homeAway, restDays]);

  const isOver = result ? result.overProbability > 0.5 : true;

  return (
    <div className="bg-bg-secondary border border-bg-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-1.5">
            <Sliders size={12} className="text-accent-blue" />
            <span className="text-xs font-mono font-semibold text-text-secondary uppercase tracking-wider">
              Prop Simulator
            </span>
          </div>
          <p className="text-[10px] text-text-muted mt-0.5">
            {playerName} · {propType.replace(/_/g, " ")}
          </p>
        </div>
        <button
          onClick={runSim}
          disabled={running}
          className="flex items-center gap-1.5 text-[10px] font-mono px-2.5 py-1.5 bg-accent-blue/10 border border-accent-blue/20 text-accent-blue rounded-md hover:bg-accent-blue/20 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={11} className={running ? "animate-spin" : ""} />
          {running ? "Running..." : "Simulate"}
        </button>
      </div>

      {/* Adjustable inputs */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="text-[9px] font-mono text-text-muted block mb-1">
            BOOK LINE: <span className="text-accent-amber">{line}</span>
          </label>
          <input
            type="range"
            min={Math.max(0, bookLine - 8)}
            max={bookLine + 8}
            step={0.5}
            value={line}
            onChange={(e) => setLine(Number(e.target.value))}
            className="w-full accent-[#F59E0B]"
          />
        </div>
        <div>
          <label className="text-[9px] font-mono text-text-muted block mb-1">
            LAST 5 AVG: <span className="text-accent-blue">{last5.toFixed(1)}</span>
          </label>
          <input
            type="range"
            min={Math.max(0, seasonAvg * 0.4)}
            max={seasonAvg * 1.8}
            step={0.5}
            value={last5}
            onChange={(e) => setLast5(Number(e.target.value))}
            className="w-full accent-[#0EA5E9]"
          />
        </div>
        <div>
          <label className="text-[9px] font-mono text-text-muted block mb-1">
            OPP DEF RANK: <span className="text-text-primary">{oppRank}</span>
            <span className="text-text-muted"> (1=best, 30=worst)</span>
          </label>
          <input
            type="range" min={1} max={30} step={1}
            value={oppRank}
            onChange={(e) => setOppRank(Number(e.target.value))}
            className="w-full accent-[#A855F7]"
          />
        </div>
        <div>
          <label className="text-[9px] font-mono text-text-muted block mb-1.5">PLAYER STATUS</label>
          <div className="flex gap-1">
            {(["active", "questionable", "day-to-day"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`text-[8px] font-mono px-1.5 py-1 rounded border transition-colors ${
                  status === s
                    ? s === "active" ? "border-accent-green/40 bg-accent-green/10 text-accent-green"
                    : "border-accent-red/40 bg-accent-red/10 text-accent-red"
                    : "border-bg-border text-text-muted hover:text-text-secondary"
                }`}
              >
                {s === "active" ? "ACTIVE" : s === "questionable" ? "QUEST." : "DTD"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Result */}
      {result && !running && (
        <div className="space-y-3">
          {/* Main result */}
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center p-2 bg-bg-card rounded border border-bg-border">
              <div className="text-[9px] font-mono text-text-muted">PROJ VALUE</div>
              <div className="text-lg font-mono font-bold text-accent-blue">
                {result.projectedValue}
              </div>
            </div>
            <div className={`text-center p-2 rounded border ${
              isOver ? "bg-accent-green/10 border-accent-green/20" : "bg-accent-red/10 border-accent-red/20"
            }`}>
              <div className={`text-[9px] font-mono ${isOver ? "text-accent-green" : "text-accent-red"}`}>
                {isOver ? "OVER" : "UNDER"} PROB
              </div>
              <div className={`text-lg font-mono font-bold ${isOver ? "text-accent-green" : "text-accent-red"}`}>
                {Math.round((isOver ? result.overProbability : result.underProbability) * 100)}%
              </div>
            </div>
            <div className="text-center p-2 bg-bg-card rounded border border-bg-border">
              <div className="text-[9px] font-mono text-text-muted">MODEL EDGE</div>
              <div className={`text-lg font-mono font-bold ${result.edge >= 3 ? "text-accent-green" : "text-accent-amber"}`}>
                +{result.edge}%
              </div>
            </div>
          </div>

          {/* Fair odds */}
          <div className="grid grid-cols-4 gap-1.5">
            {[
              { label: "FAIR OVER", val: formatOdds(result.fairOddsOver), highlight: isOver },
              { label: "FAIR UNDER", val: formatOdds(result.fairOddsUnder), highlight: !isOver },
              { label: "CONF", val: `${result.confidenceScore}`, highlight: false },
              { label: "P50", val: `${result.p50}`, highlight: false },
            ].map((item) => (
              <div
                key={item.label}
                className={`text-center p-1.5 rounded border ${
                  item.highlight ? "bg-accent-green/10 border-accent-green/20" : "bg-bg-card border-bg-border"
                }`}
              >
                <div className={`text-[8px] font-mono ${item.highlight ? "text-accent-green" : "text-text-muted"}`}>
                  {item.label}
                </div>
                <div className={`text-xs font-mono font-semibold ${item.highlight ? "text-accent-green" : "text-text-primary"}`}>
                  {item.val}
                </div>
              </div>
            ))}
          </div>

          {/* Percentile band */}
          <div>
            <div className="text-[9px] font-mono text-text-muted mb-1.5">OUTCOME DISTRIBUTION (P10–P90)</div>
            <div className="flex items-center gap-1 h-8">
              {[
                { label: "P10", val: result.p10, color: "#4A5D6E" },
                { label: "P25", val: result.p25, color: "#7B8FA6" },
                { label: "P50", val: result.p50, color: "#0EA5E9" },
                { label: "P75", val: result.p75, color: "#7B8FA6" },
                { label: "P90", val: result.p90, color: "#4A5D6E" },
              ].map((pt) => {
                const overLine = pt.val > line;
                return (
                  <div key={pt.label} className="flex-1 flex flex-col items-center gap-0.5">
                    <div
                      className="w-full h-4 rounded-sm"
                      style={{ background: overLine ? "#00FF8760" : "#FF3B5C60" }}
                    />
                    <span className="text-[7px] font-mono text-text-muted">{pt.val}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center justify-between text-[8px] font-mono text-text-muted mt-0.5">
              <span>P10</span><span>P25</span><span className="text-accent-blue">P50</span><span>P75</span><span>P90</span>
            </div>
          </div>

          <p className="text-[9px] text-text-muted leading-relaxed">
            Adjust sliders to see how different scenarios change the projection. 
            20,000 iterations per run.
          </p>
        </div>
      )}

      {!result && !running && (
        <div className="text-center py-4">
          <p className="text-[10px] text-text-muted font-mono">Click Simulate to run the prop model</p>
        </div>
      )}

      {running && (
        <div className="text-center py-4">
          <div className="w-6 h-6 border-2 border-accent-blue border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-[10px] text-text-muted font-mono">Running 20,000 simulations...</p>
        </div>
      )}
    </div>
  );
}
