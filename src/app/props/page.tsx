"use client";
import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { MOCK_PROPS } from "@/lib/mock-data/props";
import type { Prop } from "@/lib/types";
import { PropCard } from "@/components/player/PropCard";
import { LeagueFilter } from "@/components/dashboard/LeagueFilter";
import { SportBadge } from "@/components/ui/Badge";
import { formatOdds, gradeEdge } from "@/lib/utils";
import { SlidersHorizontal, ArrowUpDown, RefreshCw } from "lucide-react";

type Sport = "ALL" | "NBA" | "NCAAMB" | "MLB";
type SortKey = "edge" | "confidence" | "line" | "projectedValue";

const PROP_TYPES = ["ALL", "points", "rebounds", "assists", "hits", "home_runs", "strikeouts"];

export default function PropsPage() {
  const [sport, setSport] = useState<Sport>("ALL");
  const [propType, setPropType] = useState("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("edge");
  const [minEdge, setMinEdge] = useState(0);
  const [loading, setLoading] = useState(true);
  const [props, setProps] = useState<Prop[]>([]);

  // Load props — currently from mock, but enriched with today's date
  useEffect(() => {
    // Props are player-specific and don't change with games API
    // Load them immediately from mock data (real prop API would go here)
    setProps(MOCK_PROPS);
    setLoading(false);
  }, []);

  const filtered = useMemo(() => {
    return props
      .filter(p => sport === "ALL" || p.player.sport === sport)
      .filter(p => propType === "ALL" || p.propType === propType)
      .filter(p => p.edge >= minEdge)
      .sort((a, b) => {
        if (sortKey === "edge") return b.edge - a.edge;
        if (sortKey === "confidence") return b.confidenceScore - a.confidenceScore;
        if (sortKey === "line") return b.line - a.line;
        if (sortKey === "projectedValue") return b.projectedValue - a.projectedValue;
        return 0;
      });
  }, [props, sport, propType, sortKey, minEdge]);

  const counts = {
    ALL: props.length,
    NBA: props.filter(p => p.player.sport === "NBA").length,
    NCAAMB: props.filter(p => p.player.sport === "NCAAMB").length,
    MLB: props.filter(p => p.player.sport === "MLB").length,
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="font-display font-bold text-xl text-text-primary">Props Hub</h1>
            <span className="text-[9px] font-mono text-accent-green bg-accent-green/10 border border-accent-green/20 px-2 py-0.5 rounded">{filtered.length} props</span>
          </div>
          <p className="text-xs text-text-muted">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} · Model v2.1</p>
        </div>
      </div>

      {/* League filter */}
      <div className="mb-4">
        <LeagueFilter active={sport} onChange={setSport} counts={counts} />
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-3 mb-5 p-3 bg-bg-card border border-bg-border rounded-xl">
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-text-muted">
          <SlidersHorizontal size={12} /> Filters
        </div>

        {/* Prop type */}
        <div className="flex gap-1 flex-wrap">
          {PROP_TYPES.map(t => (
            <button key={t} onClick={() => setPropType(t)}
              className={`px-2.5 py-1 rounded text-[10px] font-mono transition-all ${propType === t ? "bg-accent-green text-bg-primary font-bold" : "bg-bg-secondary text-text-muted border border-bg-border hover:border-accent-green/30"}`}>
              {t === "ALL" ? "All Types" : t.replace(/_/g, " ")}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="flex items-center gap-1.5 ml-auto">
          <ArrowUpDown size={11} className="text-text-muted" />
          <select value={sortKey} onChange={e => setSortKey(e.target.value as SortKey)}
            className="text-[10px] font-mono bg-bg-secondary border border-bg-border rounded px-2 py-1 text-text-secondary">
            <option value="edge">Sort: Edge %</option>
            <option value="confidence">Sort: Confidence</option>
            <option value="projectedValue">Sort: Proj Value</option>
            <option value="line">Sort: Line</option>
          </select>
        </div>

        {/* Min edge */}
        <div className="flex items-center gap-2 text-[10px] font-mono text-text-muted">
          Min edge:
          <input type="range" min={0} max={10} step={1} value={minEdge} onChange={e => setMinEdge(Number(e.target.value))}
            className="w-20 accent-accent-green" />
          <span className="text-accent-green font-bold w-6">+{minEdge}%</span>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12 text-text-muted text-xs font-mono">
          <RefreshCw size={14} className="animate-spin mr-2" />Loading props...
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="p-8 bg-bg-card border border-bg-border rounded-xl text-center">
          <p className="text-sm text-text-muted font-mono">No props match your filters.</p>
          <button onClick={() => { setSport("ALL"); setPropType("ALL"); setMinEdge(0); }} className="mt-3 text-xs text-accent-green font-mono hover:underline">Clear filters</button>
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map(prop => <PropCard key={prop.id} prop={prop} />)}
        </div>
      )}
    </div>
  );
}
