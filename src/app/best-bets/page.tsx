"use client";
import { useState, useEffect } from "react";
import { MOCK_PROPS } from "@/lib/mock-data/props";
import { PropCard } from "@/components/player/PropCard";
import { Card } from "@/components/ui/Card";
import { gradeEdge } from "@/lib/utils";
import { SportBadge } from "@/components/ui/Badge";
import Link from "next/link";
import { Trophy, Zap, Target, RefreshCw } from "lucide-react";
import type { Game } from "@/lib/types";

const TOP_PROPS = [...MOCK_PROPS].sort((a, b) => b.edge - a.edge).slice(0, 4);

export default function BestBetsPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/games", { cache: "no-store" })
      .then(r => r.json())
      .then(d => { setGames(d.games ?? []); setLoading(false); })
      .catch(() => { import("@/lib/mock-data/games").then(m => { setGames(m.MOCK_GAMES); setLoading(false); }); });
  }, []);

  const TOP_GAME_BETS = games.filter(g => g.prediction).map(g => ({
    game: g,
    maxEdge: Math.max(Math.abs(g.prediction!.edgeHome), Math.abs(g.prediction!.edgeAway)),
  })).sort((a, b) => b.maxEdge - a.maxEdge);

  const totalEdgeValue = TOP_PROPS.reduce((a, b) => a + b.edge, 0) / TOP_PROPS.length;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-accent-green/10 border border-accent-green/20 flex items-center justify-center">
              <Trophy size={16} className="text-accent-green" />
            </div>
            <h1 className="font-display font-bold text-xl text-text-primary">Best Edges</h1>
          </div>
          <p className="text-xs text-text-muted ml-10">Where the model finds the most value vs. the sportsbook</p>
        </div>
        <div className="text-[9px] font-mono text-text-muted text-right">
          <div>{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</div>
          <div>Model v2.1</div>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Card padding="sm">
          <div className="text-[9px] font-mono text-text-muted mb-1">TOP PROP EDGE</div>
          <div className="text-lg font-mono font-bold text-accent-green">+{TOP_PROPS[0]?.edge ?? 0}%</div>
          <div className="text-[9px] text-text-muted">{TOP_PROPS[0]?.player.name.split(" ").pop()}</div>
        </Card>
        <Card padding="sm">
          <div className="text-[9px] font-mono text-text-muted mb-1">AVG PROP EDGE</div>
          <div className="text-lg font-mono font-bold text-accent-green">+{totalEdgeValue.toFixed(1)}%</div>
          <div className="text-[9px] text-text-muted">{TOP_PROPS.length} top plays</div>
        </Card>
        <Card padding="sm">
          <div className="text-[9px] font-mono text-text-muted mb-1">GAMES TODAY</div>
          <div className="text-lg font-mono font-bold text-accent-blue">{loading ? "..." : games.length}</div>
          <div className="text-[9px] text-text-muted">with predictions</div>
        </Card>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12 text-text-muted text-xs font-mono">
          <RefreshCw size={14} className="animate-spin mr-2" />Fetching today&apos;s games...
        </div>
      )}

      {!loading && (
        <div className="space-y-8">
          {/* Top Prop Edges */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Zap size={14} className="text-accent-green" />
              <h2 className="font-display font-bold text-base text-text-primary">Best Prop Edges Today</h2>
              <span className="text-[9px] font-mono text-accent-green bg-accent-green/10 border border-accent-green/20 px-2 py-0.5 rounded">{TOP_PROPS.length} plays</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {TOP_PROPS.map(prop => <PropCard key={prop.id} prop={prop} />)}
            </div>
          </section>

          {/* Top Game Edges */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Target size={14} className="text-accent-blue" />
              <h2 className="font-display font-bold text-base text-text-primary">Game Edges — Today&apos;s Slate</h2>
              <span className="text-[9px] font-mono text-text-muted bg-bg-secondary px-2 py-0.5 rounded">{TOP_GAME_BETS.length} games analyzed</span>
            </div>
            <div className="space-y-2">
              {TOP_GAME_BETS.slice(0, 8).map(({ game, maxEdge }) => {
                const pred = game.prediction!;
                const homeBetter = Math.abs(pred.edgeHome) >= Math.abs(pred.edgeAway);
                const edge = homeBetter ? pred.edgeHome : pred.edgeAway;
                const team = homeBetter ? game.homeTeam : game.awayTeam;
                const spread = homeBetter ? game.lines?.[0]?.homeSpread : game.lines?.[0]?.awaySpread;
                const ml = homeBetter ? game.lines?.[0]?.homeML : game.lines?.[0]?.awayML;
                const grade = gradeEdge(maxEdge);
                const gradeColor = grade === "S" ? "#00FF87" : grade === "A" ? "#00FF87" : grade === "B" ? "#F59E0B" : "#94A3B8";

                return (
                  <Link key={game.id} href={`/game/${game.id}`}>
                    <div className="p-3 bg-bg-card border border-bg-border rounded-lg hover:border-accent-green/30 transition-colors group">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-mono font-bold w-8 shrink-0" style={{ color: gradeColor }}>{grade}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <SportBadge sport={game.sport} />
                            <span className="text-sm font-semibold text-text-primary">{game.awayTeam.abbreviation} @ {game.homeTeam.abbreviation}</span>
                          </div>
                          <div className="text-[10px] font-mono text-text-muted">
                            Best bet: <span className="text-accent-green font-semibold">{team.abbreviation}</span>
                            {spread && <span> · Spread {spread > 0 ? "+" : ""}{spread}</span>}
                            {ml && <span> · ML {ml > 0 ? "+" : ""}{ml}</span>}
                          </div>
                          {pred.reasoning && <div className="text-[9px] text-text-muted mt-1 leading-relaxed line-clamp-1">{pred.reasoning}</div>}
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-[9px] font-mono text-text-muted">EDGE</div>
                          <div className="text-sm font-mono font-bold" style={{ color: gradeColor }}>+{maxEdge.toFixed(1)}%</div>
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
