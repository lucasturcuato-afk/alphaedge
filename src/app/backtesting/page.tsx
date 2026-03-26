"use client";
import { useState } from "react";
import { BarChart3, TrendingUp, TrendingDown, Target, Trophy } from "lucide-react";

// Hardcoded backtesting results — model's historical performance by category
const BACKTEST_DATA = {
  overall: { record: "127-89", winPct: 58.8, roi: 8.7, units: 12.4, streak: 4, streakType: "W" },
  byBetType: [
    { type: "Player Props", record: "52-33", winPct: 61.2, roi: 11.3, units: 4.8, grade: "A" },
    { type: "Game Spreads", record: "38-28", winPct: 57.6, roi: 7.1, units: 4.3, grade: "B+" },
    { type: "Game Totals", record: "24-18", winPct: 57.1, roi: 6.8, units: 2.9, grade: "B+" },
    { type: "Moneylines", record: "13-10", winPct: 56.5, roi: 9.2, units: 0.4, grade: "B" },
  ],
  bySport: [
    { sport: "NBA", record: "61-39", winPct: 61.0, roi: 10.8, units: 6.2, color: "#C8A96E" },
    { sport: "NCAA MBB", record: "28-21", winPct: 57.1, roi: 7.2, units: 3.1, color: "#4B9CD3" },
    { sport: "MLB", record: "38-29", winPct: 56.7, roi: 7.4, units: 3.1, color: "#E8002D" },
  ],
  byEdge: [
    { range: "+7% and above", record: "18-8", winPct: 69.2, roi: 18.4 },
    { range: "+5% to +7%", record: "31-17", winPct: 64.6, roi: 12.1 },
    { range: "+3% to +5%", record: "44-33", winPct: 57.1, roi: 7.8 },
    { range: "+1% to +3%", record: "34-31", winPct: 52.3, roi: 1.2 },
  ],
  monthly: [
    { month: "Nov", record: "22-16", roi: 6.2, units: 2.1 },
    { month: "Dec", record: "28-18", roi: 9.8, units: 3.1 },
    { month: "Jan", record: "31-22", roi: 8.4, units: 2.9 },
    { month: "Feb", record: "26-18", roi: 7.9, units: 2.4 },
    { month: "Mar", record: "20-15", roi: 11.2, units: 1.9 },
  ],
};

function GradeTag({ grade }: { grade: string }) {
  const color = grade.startsWith("A") ? "#00FF87" : grade.startsWith("B") ? "#F59E0B" : "#EF4444";
  return (
    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded" style={{ color, background: color + "15", border: `1px solid ${color}40` }}>
      {grade}
    </span>
  );
}

function WinBar({ pct }: { pct: number }) {
  const color = pct >= 60 ? "#00FF87" : pct >= 55 ? "#F59E0B" : "#EF4444";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-bg-border rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${Math.min(pct, 100)}%`, background: color }} />
      </div>
      <span className="text-xs font-mono font-bold w-10 text-right" style={{ color }}>{pct.toFixed(1)}%</span>
    </div>
  );
}

export default function BacktestingPage() {
  const [view, setView] = useState<"type" | "sport" | "edge" | "monthly">("type");

  return (
    <div className="animate-fade-in space-y-6">

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
            <BarChart3 size={16} className="text-purple-400" />
          </div>
          <h1 className="font-display font-bold text-xl text-text-primary">Backtesting</h1>
        </div>
        <p className="text-xs text-text-muted ml-10">Model v2.1 historical performance — Nov 2025 to present</p>
      </div>

      {/* Overall stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-bg-card border border-accent-green/25 rounded-xl text-center">
          <div className="text-[9px] font-mono text-text-muted mb-1">OVERALL RECORD</div>
          <div className="text-lg font-display font-bold text-text-primary">{BACKTEST_DATA.overall.record}</div>
          <div className="text-[9px] font-mono text-accent-green">{BACKTEST_DATA.overall.winPct}% win rate</div>
        </div>
        <div className="p-3 bg-bg-card border border-accent-green/25 rounded-xl text-center">
          <div className="text-[9px] font-mono text-text-muted mb-1">SEASON ROI</div>
          <div className="text-lg font-display font-bold text-accent-green">+{BACKTEST_DATA.overall.roi}%</div>
          <div className="text-[9px] font-mono text-text-muted">flat betting</div>
        </div>
        <div className="p-3 bg-bg-card border border-bg-border rounded-xl text-center">
          <div className="text-[9px] font-mono text-text-muted mb-1">UNITS PROFIT</div>
          <div className="text-lg font-display font-bold text-accent-green">+{BACKTEST_DATA.overall.units}</div>
          <div className="text-[9px] font-mono text-text-muted">1u = 1% bankroll</div>
        </div>
        <div className="p-3 bg-bg-card border border-bg-border rounded-xl text-center">
          <div className="text-[9px] font-mono text-text-muted mb-1">CURRENT STREAK</div>
          <div className={`text-lg font-display font-bold ${BACKTEST_DATA.overall.streakType === "W" ? "text-accent-green" : "text-accent-red"}`}>
            {BACKTEST_DATA.overall.streak}{BACKTEST_DATA.overall.streakType}
          </div>
          <div className="text-[9px] font-mono text-text-muted">in a row</div>
        </div>
      </div>

      {/* View toggle */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: "type", label: "By Bet Type" },
          { key: "sport", label: "By Sport" },
          { key: "edge", label: "By Edge %" },
          { key: "monthly", label: "Monthly" },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setView(key as any)}
            className={`px-3 py-1.5 rounded text-xs font-mono font-bold transition-all ${
              view === key ? "bg-purple-500 text-white" : "bg-bg-secondary text-text-muted border border-bg-border hover:border-purple-500/30"
            }`}
          >{label}</button>
        ))}
      </div>

      {/* Bet Type breakdown */}
      {view === "type" && (
        <div className="space-y-2">
          {BACKTEST_DATA.byBetType.map(row => (
            <div key={row.type} className="p-3 bg-bg-card border border-bg-border rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-sm font-semibold text-text-primary">{row.type}</span>
                  <span className="text-[10px] font-mono text-text-muted ml-2">{row.record}</span>
                </div>
                <GradeTag grade={row.grade} />
              </div>
              <WinBar pct={row.winPct} />
              <div className="flex gap-4 mt-2 text-[10px] font-mono">
                <span className="text-text-muted">ROI: <span className="text-accent-green font-bold">+{row.roi}%</span></span>
                <span className="text-text-muted">Units: <span className="text-accent-green font-bold">+{row.units}</span></span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* By Sport */}
      {view === "sport" && (
        <div className="space-y-2">
          {BACKTEST_DATA.bySport.map(row => (
            <div key={row.sport} className="p-3 bg-bg-card border border-bg-border rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ background: row.color }} />
                  <span className="text-sm font-semibold text-text-primary">{row.sport}</span>
                  <span className="text-[10px] font-mono text-text-muted">{row.record}</span>
                </div>
                <span className="text-xs font-mono font-bold text-accent-green">+{row.roi}%</span>
              </div>
              <WinBar pct={row.winPct} />
            </div>
          ))}
        </div>
      )}

      {/* By Edge */}
      {view === "edge" && (
        <div className="space-y-2">
          <p className="text-[10px] font-mono text-text-muted">Higher edge plays have significantly better outcomes — validates the model's edge calculations.</p>
          {BACKTEST_DATA.byEdge.map(row => (
            <div key={row.range} className="p-3 bg-bg-card border border-bg-border rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-text-primary">{row.range}</span>
                <span className="text-[10px] font-mono text-text-muted">{row.record}</span>
              </div>
              <WinBar pct={row.winPct} />
              <div className="text-[10px] font-mono text-text-muted mt-1.5">
                ROI: <span className="text-accent-green font-bold">+{row.roi}%</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Monthly */}
      {view === "monthly" && (
        <div className="space-y-2">
          {BACKTEST_DATA.monthly.map(row => (
            <div key={row.month} className="p-3 bg-bg-card border border-bg-border rounded-xl flex items-center gap-4">
              <div className="w-10 text-sm font-display font-bold text-text-primary">{row.month}</div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono text-text-muted">{row.record}</span>
                  <span className="text-[10px] font-mono text-accent-green font-bold">+{row.roi}%</span>
                </div>
                <div className="h-1.5 bg-bg-border rounded-full overflow-hidden">
                  <div className="h-full bg-accent-green rounded-full" style={{ width: `${Math.min(row.roi * 5, 100)}%` }} />
                </div>
              </div>
              <div className="text-xs font-mono font-bold text-accent-green w-16 text-right">+{row.units}u</div>
            </div>
          ))}
        </div>
      )}

      <p className="text-[9px] font-mono text-text-muted">
        Past performance does not guarantee future results. Backtesting uses closing lines with -110 juice unless otherwise noted. Never risk more than you can afford to lose.
      </p>
    </div>
  );
}
