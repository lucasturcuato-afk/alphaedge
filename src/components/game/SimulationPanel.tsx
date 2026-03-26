// src/components/game/SimulationPanel.tsx
"use client";
import type { SimulationResult } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface SimulationPanelProps {
  sim: SimulationResult;
  homeAbbr: string;
  awayAbbr: string;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-bg-card border border-bg-border rounded p-2">
        <p className="text-[10px] font-mono text-text-muted">
          Combined: {label}
        </p>
        <p className="text-[11px] font-mono text-accent-green">
          {payload[0].value.toFixed(1)}% of sims
        </p>
      </div>
    );
  }
  return null;
};

export function SimulationPanel({
  sim,
  homeAbbr,
  awayAbbr,
}: SimulationPanelProps) {
  const totalPct = sim.avgTotal;
  const data = sim.distribution.map((b) => ({
    range: b.range,
    pct: b.pct,
  }));

  return (
    <Card padding="md">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xs font-mono font-semibold text-text-secondary uppercase tracking-wider">
            Monte Carlo Simulation
          </h3>
          <p className="text-[10px] text-text-muted mt-0.5">
            {sim.iterations.toLocaleString()} iterations
          </p>
        </div>
        <div className="flex items-center gap-1 text-[9px] font-mono text-accent-green bg-accent-green/10 border border-accent-green/20 px-2 py-1 rounded">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-green" />
          v2.1 MODEL
        </div>
      </div>

      {/* Win probability split */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="p-3 bg-bg-secondary rounded-md border border-bg-border text-center">
          <div className="text-[9px] font-mono text-text-muted mb-1">
            {awayAbbr} WIN%
          </div>
          <div className="text-2xl font-mono font-bold text-text-primary">
            {sim.awayWinPct.toFixed(1)}
            <span className="text-sm text-text-muted">%</span>
          </div>
        </div>
        <div className="p-3 bg-bg-secondary rounded-md border border-accent-green/20 text-center">
          <div className="text-[9px] font-mono text-accent-green mb-1">
            {homeAbbr} WIN%
          </div>
          <div className="text-2xl font-mono font-bold text-accent-green">
            {sim.homeWinPct.toFixed(1)}
            <span className="text-sm text-accent-green/60">%</span>
          </div>
        </div>
      </div>

      {/* Score projections */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          {
            label: `${awayAbbr} AVG`,
            val: sim.avgAwayScore.toFixed(1),
            color: "#7B8FA6",
          },
          {
            label: "TOTAL",
            val: sim.avgTotal.toFixed(1),
            color: "#0EA5E9",
          },
          {
            label: `${homeAbbr} AVG`,
            val: sim.avgHomeScore.toFixed(1),
            color: "#00FF87",
          },
        ].map((item) => (
          <div
            key={item.label}
            className="p-2 bg-bg-secondary rounded border border-bg-border text-center"
          >
            <div className="text-[9px] font-mono text-text-muted">
              {item.label}
            </div>
            <div
              className="text-lg font-mono font-bold"
              style={{ color: item.color }}
            >
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
                tick={{ fontSize: 8, fill: "#4A5D6E", fontFamily: "IBM Plex Mono" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 8, fill: "#4A5D6E", fontFamily: "IBM Plex Mono" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="pct" radius={[2, 2, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell
                    key={index}
                    fill={
                      entry.pct === Math.max(...data.map((d) => d.pct))
                        ? "#00FF87"
                        : "#1C2330"
                    }
                    stroke={
                      entry.pct === Math.max(...data.map((d) => d.pct))
                        ? "#00FF8740"
                        : "transparent"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Percentile table */}
      <div>
        <div className="text-[9px] font-mono text-text-muted mb-2 uppercase tracking-wider">
          Score Percentiles
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-bg-border">
              {["PCT", "P10", "P25", "P50", "P75", "P90"].map((h) => (
                <th
                  key={h}
                  className="text-[9px] font-mono text-text-muted py-1 text-center"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              {
                label: awayAbbr,
                vals: [
                  sim.percentiles.p10.away,
                  sim.percentiles.p25.away,
                  sim.percentiles.p50.away,
                  sim.percentiles.p75.away,
                  sim.percentiles.p90.away,
                ],
              },
              {
                label: homeAbbr,
                vals: [
                  sim.percentiles.p10.home,
                  sim.percentiles.p25.home,
                  sim.percentiles.p50.home,
                  sim.percentiles.p75.home,
                  sim.percentiles.p90.home,
                ],
              },
            ].map((row) => (
              <tr key={row.label} className="border-b border-bg-border/50">
                <td className="text-[10px] font-mono text-text-secondary py-1.5 text-center">
                  {row.label}
                </td>
                {row.vals.map((v, i) => (
                  <td
                    key={i}
                    className="text-[10px] font-mono font-semibold text-text-primary py-1.5 text-center"
                  >
                    {v}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ATS coverage */}
      <div className="mt-3 pt-3 border-t border-bg-border flex items-center justify-between">
        <span className="text-[10px] font-mono text-text-muted">
          {homeAbbr} ATS Cover %
        </span>
        <span
          className="text-sm font-mono font-bold"
          style={{
            color: sim.spreadCoverPct > 52 ? "#00FF87" : "#7B8FA6",
          }}
        >
          {sim.spreadCoverPct.toFixed(1)}%
        </span>
      </div>
    </Card>
  );
}
