// src/app/page.tsx
"use client";
import { useState, useEffect } from "react";
import { useGames } from "@/hooks/useGames";
import { useProps } from "@/hooks/useProps";
import { MOCK_NEWS } from "@/lib/mock-data/news";
import { TodayGames } from "@/components/dashboard/TodayGames";
import { TopEdges } from "@/components/dashboard/TopEdges";
import { LeagueFilter } from "@/components/dashboard/LeagueFilter";
import { NewsPanel } from "@/components/game/NewsPanel";
import { Card, SectionHeader } from "@/components/ui/Card";
import {
  Activity,
  Zap,
  TrendingUp,
  Database,
  RefreshCw,
} from "lucide-react";

type Sport = "ALL" | "NBA" | "NCAAMB" | "MLB";

function formatLastUpdated(date: Date | null): string {
  if (!date) return "—";
  const mins = Math.floor((Date.now() - date.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins === 1) return "1 min ago";
  return `${mins} mins ago`;
}

export default function DashboardPage() {
  const [sport, setSport] = useState<Sport>("ALL");
  const [dateLabel, setDateLabel] = useState("Thursday, March 26, 2026");

  // Hydration-safe date label
  useEffect(() => {
    setDateLabel(
      new Date().toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    );
  }, []);

  const {
    games: allGames,
    loading: gamesLoading,
    dataSource,
    lastUpdated,
    refresh,
  } = useGames();

  const { props: allProps, loading: propsLoading } = useProps();

  const filteredGames =
    sport === "ALL" ? allGames : allGames.filter((g) => g.sport === sport);

  const filteredProps =
    sport === "ALL"
      ? allProps
      : allProps.filter((p) => p.player.sport === sport);

  const filteredNews =
    sport === "ALL" ? MOCK_NEWS : MOCK_NEWS.filter((n) => n.sport === sport);

  const counts = {
    ALL: allGames.length,
    NBA: allGames.filter((g) => g.sport === "NBA").length,
    NCAAMB: allGames.filter((g) => g.sport === "NCAAMB").length,
    MLB: allGames.filter((g) => g.sport === "MLB").length,
  };

  const isLive = dataSource === "live";

  return (
    <div className="animate-fade-in">
      {/* Page title */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-xl text-text-primary">
            Intelligence Dashboard
          </h1>
          <p className="text-xs text-text-muted mt-1">
            {dateLabel}
            {" · "}Model v2.1 · 10K simulations
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Live / mock badge */}
          <span
            className={`flex items-center gap-1.5 text-[10px] font-mono px-2.5 py-1 rounded-md border ${
              isLive
                ? "text-accent-green bg-accent-green/10 border-accent-green/20"
                : "text-text-muted bg-bg-border/30 border-bg-border"
            }`}
          >
            {isLive && (
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-green opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-accent-green" />
              </span>
            )}
            {isLive ? "LIVE" : "MOCK"} · {formatLastUpdated(lastUpdated)}
          </span>
          <button
            onClick={refresh}
            disabled={gamesLoading}
            className="flex items-center gap-1.5 text-[11px] font-mono text-text-muted hover:text-text-secondary transition-colors px-2.5 py-1.5 border border-bg-border rounded-md hover:border-bg-hover disabled:opacity-40"
          >
            <RefreshCw size={11} className={gamesLoading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Card padding="sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-mono text-text-muted uppercase tracking-wider">
              Active Games
            </span>
            <Activity size={13} style={{ color: "#00FF87" }} />
          </div>
          <div className="text-xl font-mono font-bold" style={{ color: "#00FF87" }}>
            {gamesLoading ? "—" : allGames.length}
          </div>
          <div className="text-[9px] text-text-muted mt-0.5">Today</div>
        </Card>
        <Card padding="sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-mono text-text-muted uppercase tracking-wider">
              Top Edge
            </span>
            <Zap size={13} style={{ color: "#00FF87" }} />
          </div>
          <div className="text-xl font-mono font-bold" style={{ color: "#00FF87" }}>
            +9.3%
          </div>
          <div className="text-[9px] text-text-muted mt-0.5">Best prop tonight</div>
        </Card>
        <Card padding="sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-mono text-text-muted uppercase tracking-wider">
              Season ROI
            </span>
            <TrendingUp size={13} style={{ color: "#F59E0B" }} />
          </div>
          <div className="text-xl font-mono font-bold" style={{ color: "#F59E0B" }}>
            +8.7%
          </div>
          <div className="text-[9px] text-text-muted mt-0.5">Model v2.1</div>
        </Card>
        <Card padding="sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] font-mono text-text-muted uppercase tracking-wider">
              Sim Iterations
            </span>
            <Database size={13} style={{ color: "#0EA5E9" }} />
          </div>
          <div className="text-xl font-mono font-bold" style={{ color: "#0EA5E9" }}>
            10K
          </div>
          <div className="text-[9px] text-text-muted mt-0.5">Per game</div>
        </Card>
      </div>

      {/* Filter */}
      <div className="mb-5">
        <LeagueFilter active={sport} onChange={setSport} counts={counts} />
      </div>

      {/* Loading state */}
      {gamesLoading && (
        <div className="flex items-center justify-center py-16 text-text-muted text-sm font-mono">
          <RefreshCw size={14} className="animate-spin mr-2" />
          Fetching live data…
        </div>
      )}

      {/* Main content grid */}
      {!gamesLoading && (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
          {/* Left column */}
          <div className="space-y-8">
            {/* Today's Games */}
            <section>
              <SectionHeader
                title="Today's Games"
                subtitle={`${filteredGames.length} games with model projections`}
                action={
                  <span className="text-[10px] font-mono text-text-muted">
                    Sorted by confidence
                  </span>
                }
              />
              <TodayGames games={filteredGames} />
            </section>

            {/* Top Edges */}
            <section>
              <SectionHeader
                title="Best Edges Tonight"
                subtitle="Model vs. sportsbook line analysis — sorted by edge %"
                action={
                  <span className="text-[10px] font-mono text-accent-green bg-accent-green/10 border border-accent-green/20 px-2 py-0.5 rounded">
                    {propsLoading ? "…" : `${filteredProps.length} props analyzed`}
                  </span>
                }
              />
              <TopEdges props={filteredProps} />
            </section>
          </div>

          {/* Right column */}
          <div className="space-y-4">
            {/* Model Health */}
            <Card padding="sm">
              <div className="text-[9px] font-mono text-text-muted uppercase tracking-wider mb-3">
                Model Performance
              </div>
              {[
                { label: "Season Win Rate", val: "54.2%", color: "#00FF87" },
                { label: "Closing Line Value", val: "+2.1%", color: "#00FF87" },
                { label: "Avg Confidence", val: "69.4", color: "#F59E0B" },
                { label: "Props Tracked", val: "1,842", color: "#0EA5E9" },
                { label: "Total Games", val: "612", color: "#7B8FA6" },
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between py-1.5 border-b border-bg-border/50 last:border-0"
                >
                  <span className="text-[10px] text-text-secondary">
                    {row.label}
                  </span>
                  <span
                    className="text-xs font-mono font-semibold"
                    style={{ color: row.color }}
                  >
                    {row.val}
                  </span>
                </div>
              ))}
            </Card>

            {/* Disclaimer */}
            <Card padding="sm">
              <p className="text-[9px] text-text-muted leading-relaxed">
                <span className="text-accent-amber font-mono font-semibold">
                  ⚠ DISCLAIMER
                </span>{" "}
                AlphaEdge is a decision-support research tool. All probabilities
                are model estimates with inherent uncertainty. Never bet more than
                you can afford to lose. Past model performance does not guarantee
                future results. Gamble responsibly.
              </p>
            </Card>

            {/* News feed */}
            <Card padding="md">
              <NewsPanel news={filteredNews} title="Latest Intelligence" />
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
