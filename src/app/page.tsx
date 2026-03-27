// src/app/page.tsx
"use client";
import { useState, useEffect, useCallback } from "react";
import { MOCK_PROPS } from "@/lib/mock-data/props";
import { MOCK_NEWS } from "@/lib/mock-data/news";
import { TodayGames } from "@/components/dashboard/TodayGames";
import { TopEdges } from "@/components/dashboard/TopEdges";
import { LeagueFilter } from "@/components/dashboard/LeagueFilter";
import { NewsPanel } from "@/components/game/NewsPanel";
import { Card, SectionHeader } from "@/components/ui/Card";
import { Activity, Zap, TrendingUp, Database, RefreshCw } from "lucide-react";
import type { Game } from "@/lib/types";

type Sport = "ALL" | "NBA" | "NCAAMB" | "MLB";

export default function DashboardPage() {
  const [sport, setSport] = useState<Sport>("ALL");
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [dataSource, setDataSource] = useState<string>("loading");
  const [lastUpdated, setLastUpdated] = useState<string>("");

  const fetchGames = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/games", { cache: "no-store" });
      const data = await res.json();
      setGames(data.games ?? []);
      setDataSource(data.meta?.dataSource ?? "live");
      setLastUpdated(new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }));
    } catch {
      const { MOCK_GAMES } = await import("@/lib/mock-data/games");
      setGames(MOCK_GAMES);
      setDataSource("mock_fallback");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGames();
    const interval = setInterval(fetchGames, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchGames]);

  const filteredGames = sport === "ALL" ? games : games.filter((g) => g.sport === sport);
  const filteredProps = sport === "ALL" ? MOCK_PROPS : MOCK_PROPS.filter((p) => p.player.sport === sport);
  const filteredNews = sport === "ALL" ? MOCK_NEWS : MOCK_NEWS.filter((n) => n.sport === sport);

  const counts = {
    ALL: games.length,
    NBA: games.filter((g) => g.sport === "NBA").length,
    NCAAMB: games.filter((g) => g.sport === "NCAAMB").length,
    MLB: games.filter((g) => g.sport === "MLB").length,
  };

  const topEdge = filteredProps.length ? filteredProps.reduce((a, b) => a.edge > b.edge ? a : b) : null;

  const STATS = [
    { label: "Active Games", value: loading ? "..." : String(games.length), sub: "Today", icon: Activity, color: "#00FF87" },
    { label: "Top Edge", value: topEdge ? `+${topEdge.edge}%` : "--", sub: topEdge?.player?.name?.split(" ").pop() ?? "Best prop", icon: Zap, color: "#00FF87" },
    { label: "Season ROI", value: "+8.7%", sub: "Model v2.1", icon: TrendingUp, color: "#F59E0B" },
    { label: "Sim Iterations", value: "10K", sub: "Per game", icon: Database, color: "#0EA5E9" },
  ];

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-xl text-text-primary">Intelligence Dashboard</h1>
          <p className="text-xs text-text-muted mt-1">
            {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            {" · "}Model v2.1 · 10K simulations
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${dataSource === "live" ? "bg-accent-green live-indicator" : "bg-accent-amber"}`} />
            <span className="text-[9px] font-mono text-text-muted">
              {dataSource === "live" ? `LIVE · ${lastUpdated}` : dataSource === "loading" ? "LOADING" : "MOCK DATA"}
            </span>
          </div>
          <button onClick={fetchGames} disabled={loading}
            className="flex items-center gap-1.5 text-[11px] font-mono text-text-muted hover:text-text-secondary transition-colors px-2.5 py-1.5 border border-bg-border rounded-md hover:border-bg-hover disabled:opacity-40">
            <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {STATS.map((stat) => (
          <Card key={stat.label} padding="sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-mono text-text-muted uppercase tracking-wider">{stat.label}</span>
              <stat.icon size={13} style={{ color: stat.color }} />
            </div>
            <div className="text-xl font-mono font-bold" style={{ color: stat.color }}>{stat.value}</div>
            <div className="text-[9px] text-text-muted mt-0.5">{stat.sub}</div>
          </Card>
        ))}
      </div>

      <div className="mb-5">
        <LeagueFilter active={sport} onChange={setSport} counts={counts} />
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16 text-text-muted text-xs font-mono">
          <RefreshCw size={14} className="animate-spin mr-2" />
          Fetching today&apos;s games...
        </div>
      )}

      {!loading && (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
          <div className="space-y-8">
            <section>
              <SectionHeader title="Today's Games" subtitle={`${filteredGames.length} games with model projections`}
                action={<span className="text-[10px] font-mono text-text-muted">Sorted by confidence</span>} />
              {filteredGames.length === 0 ? (
                <div className="p-8 bg-bg-card border border-bg-border rounded-xl text-center">
                  <p className="text-sm text-text-muted font-mono">No {sport === "ALL" ? "" : sport + " "}games today.</p>
                </div>
              ) : (
                <TodayGames games={filteredGames} />
              )}
            </section>
            <section>
              <SectionHeader title="Best Edges Tonight" subtitle="Model vs. sportsbook line analysis"
                action={<span className="text-[10px] font-mono text-accent-green bg-accent-green/10 border border-accent-green/20 px-2 py-0.5 rounded">{filteredProps.length} props</span>} />
              <TopEdges props={filteredProps} />
            </section>
          </div>
          <div className="space-y-4">
            <Card padding="sm">
              <div className="text-[9px] font-mono text-text-muted uppercase tracking-wider mb-3">Model Performance</div>
              {[
                { label: "Season Win Rate", val: "58.8%", color: "#00FF87" },
                { label: "Season ROI", val: "+8.7%", color: "#00FF87" },
                { label: "Avg Confidence", val: "63/100", color: "#F59E0B" },
                { label: "Props Tracked", val: "216", color: "#0EA5E9" },
                { label: "Total Bets", val: "127-89", color: "#7B8FA6" },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between py-1.5 border-b border-bg-border/50 last:border-0">
                  <span className="text-[10px] text-text-secondary">{row.label}</span>
                  <span className="text-xs font-mono font-semibold" style={{ color: row.color }}>{row.val}</span>
                </div>
              ))}
            </Card>
            <Card padding="sm">
              <p className="text-[9px] text-text-muted leading-relaxed">
                <span className="text-accent-amber font-mono font-semibold">⚠ DISCLAIMER</span>{" "}
                AlphaEdge is a research tool. All probabilities carry uncertainty. Never bet more than you can afford to lose.
              </p>
            </Card>
            <Card padding="md">
              <NewsPanel news={filteredNews} title="Latest Intelligence" />
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
