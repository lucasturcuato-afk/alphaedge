// src/app/props/page.tsx
"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { MOCK_PROPS } from "@/lib/mock-data/props";
import type { Prop } from "@/lib/types";
import { PropCard } from "@/components/player/PropCard";
import { LeagueFilter } from "@/components/dashboard/LeagueFilter";
import { EdgeBar } from "@/components/ui/EdgeBar";
import { SportBadge, StatusBadge, Badge } from "@/components/ui/Badge";
import { formatOdds, gradeEdge } from "@/lib/utils";
import { SlidersHorizontal, ArrowUpDown, LayoutGrid, LayoutList } from "lucide-react";

type Sport = "ALL" | "NBA" | "NCAAMB" | "MLB";
type SortKey = "edge" | "confidence" | "line" | "projectedValue";
type View = "grid" | "table";

const PROP_TYPES = ["ALL", "points", "rebounds", "assists", "hits", "home_runs", "strikeouts"];

export default function PropsPage() {
  const [sport, setSport] = useState<Sport>("ALL");
  const [propType, setPropType] = useState("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("edge");
  const [minEdge, setMinEdge] = useState(0);
  const [minConf, setMinConf] = useState(0);
  const [view, setView] = useState<View>("grid");
  const [showInjured, setShowInjured] = useState(true);

  const filtered = useMemo(() => {
    return MOCK_PROPS
      .filter((p) => sport === "ALL" || p.player.sport === sport)
      .filter((p) => propType === "ALL" || p.propType === propType)
      .filter((p) => p.edge >= minEdge)
      .filter((p) => p.confidenceScore >= minConf)
      .filter((p) => showInjured || p.player.status === "active")
      .sort((a, b) => {
        if (sortKey === "edge") return b.edge - a.edge;
        if (sortKey === "confidence") return b.confidenceScore - a.confidenceScore;
        if (sortKey === "line") return b.line - a.line;
        if (sortKey === "projectedValue") return b.projectedValue - a.projectedValue;
        return 0;
      });
  }, [sport, propType, sortKey, minEdge, minConf, showInjured]);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display font-bold text-xl text-text-primary mb-1">
          Props Hub
        </h1>
        <p className="text-xs text-text-muted">
          {MOCK_PROPS.length} props analyzed · Sorted by model edge
        </p>
      </div>

      {/* Controls */}
      <div className="bg-bg-card border border-bg-border rounded-xl p-4 mb-5 space-y-3">
        {/* League filter */}
        <LeagueFilter active={sport} onChange={setSport} />

        <div className="flex items-center gap-3 flex-wrap">
          {/* Prop type */}
          <div className="flex items-center gap-1 flex-wrap">
            {PROP_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setPropType(t)}
                className={`text-[10px] font-mono px-2 py-1 rounded border transition-all ${
                  propType === t
                    ? "border-accent-blue/40 bg-accent-blue/10 text-accent-blue"
                    : "border-bg-border text-text-muted hover:text-text-secondary"
                }`}
              >
                {t === "ALL" ? "All Types" : t.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-2">
            {/* View toggle */}
            <div className="flex border border-bg-border rounded-md overflow-hidden">
              {([["grid", LayoutGrid], ["table", LayoutList]] as const).map(([v, Icon]) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`p-1.5 transition-colors ${
                    view === v ? "bg-accent-green/10 text-accent-green" : "text-text-muted hover:text-text-secondary"
                  }`}
                >
                  <Icon size={13} />
                </button>
              ))}
            </div>

            {/* Sort */}
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="text-[10px] font-mono bg-bg-secondary border border-bg-border rounded px-2 py-1.5 text-text-secondary"
            >
              <option value="edge">Sort: Edge %</option>
              <option value="confidence">Sort: Confidence</option>
              <option value="line">Sort: Line Value</option>
              <option value="projectedValue">Sort: Projection</option>
            </select>
          </div>
        </div>

        {/* Sliders */}
        <div className="flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-[9px] font-mono text-text-muted whitespace-nowrap">
              MIN EDGE: <span className="text-accent-green">{minEdge}%</span>
            </label>
            <input
              type="range"
              min={0}
              max={10}
              step={0.5}
              value={minEdge}
              onChange={(e) => setMinEdge(Number(e.target.value))}
              className="w-20 accent-[#00FF87]"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[9px] font-mono text-text-muted whitespace-nowrap">
              MIN CONF: <span className="text-accent-blue">{minConf}</span>
            </label>
            <input
              type="range"
              min={0}
              max={90}
              step={5}
              value={minConf}
              onChange={(e) => setMinConf(Number(e.target.value))}
              className="w-20 accent-[#0EA5E9]"
            />
          </div>
          <label className="flex items-center gap-1.5 text-[10px] font-mono text-text-muted cursor-pointer">
            <input
              type="checkbox"
              checked={showInjured}
              onChange={(e) => setShowInjured(e.target.checked)}
              className="accent-[#00FF87]"
            />
            Show injured players
          </label>
        </div>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-mono text-text-muted">
          {filtered.length} props matching filters
        </span>
      </div>

      {/* Grid view */}
      {view === "grid" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((prop) => (
            <Link key={prop.id} href={`/player/${prop.player.id}`}>
              <PropCard prop={prop} expanded />
            </Link>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-3 text-center py-12 text-text-muted text-xs font-mono">
              No props match your filters. Try lowering the thresholds.
            </div>
          )}
        </div>
      )}

      {/* Table view */}
      {view === "table" && (
        <div className="bg-bg-card border border-bg-border rounded-xl overflow-hidden">
          <table className="w-full data-table">
            <thead className="bg-bg-secondary">
              <tr>
                {["Player", "Sport", "Prop", "Line", "Proj", "Over%", "Edge", "Conf", "Sentiment"].map(h => (
                  <th key={h} className="text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((prop) => {
                const rating = gradeEdge(prop.edge);
                const isOver = prop.overProbability > 0.5;
                return (
                  <tr key={prop.id} className="cursor-pointer">
                    <td>
                      <Link href={`/player/${prop.player.id}`} className="hover:text-accent-green transition-colors">
                        <div className="font-semibold text-text-primary text-xs">{prop.player.name}</div>
                        <div className="text-[10px] text-text-muted">{prop.player.team.abbreviation} · {prop.player.position}</div>
                      </Link>
                    </td>
                    <td><SportBadge sport={prop.player.sport} /></td>
                    <td className="font-mono text-text-secondary text-[11px]">
                      {prop.propType.replace(/_/g, " ")}
                    </td>
                    <td className="font-mono font-semibold text-text-primary">{prop.line}</td>
                    <td className="font-mono font-semibold text-accent-blue">{prop.projectedValue.toFixed(1)}</td>
                    <td>
                      <span className={`font-mono text-xs font-bold ${isOver ? "text-accent-green" : "text-accent-red"}`}>
                        {Math.round(prop.overProbability * 100)}% {isOver ? "OVER" : "UNDER"}
                      </span>
                    </td>
                    <td>
                      <span className="font-mono font-bold text-xs" style={{ color: rating.color }}>
                        +{prop.edge.toFixed(1)}%
                      </span>
                    </td>
                    <td>
                      <span className="font-mono text-xs" style={{
                        color: prop.confidenceScore >= 75 ? "#00FF87" : prop.confidenceScore >= 60 ? "#F59E0B" : "#FF3B5C"
                      }}>
                        {prop.confidenceScore}
                      </span>
                    </td>
                    <td>
                      <Badge
                        label={prop.sentiment}
                        variant="sentiment"
                        sentiment={prop.sentiment}
                        size="xs"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
