// src/app/player/[id]/page.tsx
"use client";
import { notFound } from "next/navigation";
import Link from "next/link";
import { MOCK_PLAYERS } from "@/lib/mock-data/players";
import { MOCK_PROPS } from "@/lib/mock-data/props";
import { MOCK_NEWS } from "@/lib/mock-data/news";
import { PropCard } from "@/components/player/PropCard";
import { TrendChart } from "@/components/player/TrendChart";
import { LivePropSimulator } from "@/components/player/LivePropSimulator";
import { NewsPanel } from "@/components/game/NewsPanel";
import { Card } from "@/components/ui/Card";
import { SportBadge, StatusBadge } from "@/components/ui/Badge";
import { ChevronLeft } from "lucide-react";

interface Props {
  params: { id: string };
}

// Mock recent performance data
const MOCK_PERF: Record<string, Record<string, number[]>> = {
  "nikola-jokic": {
    points: [28, 31, 24, 29, 22, 33, 27, 25, 30, 26],
    rebounds: [14, 11, 13, 12, 10, 15, 12, 11, 13, 12],
    assists: [11, 8, 13, 9, 12, 10, 14, 9, 11, 10],
  },
  "jayson-tatum": {
    points: [22, 19, 24, 21, 26, 31, 28, 24, 27, 25],
    rebounds: [7, 9, 8, 6, 10, 8, 7, 9, 8, 7],
    assists: [4, 5, 6, 4, 5, 7, 4, 5, 6, 4],
  },
  "jalen-brunson": {
    points: [30, 27, 32, 29, 25, 34, 28, 31, 26, 29],
    rebounds: [4, 3, 4, 3, 4, 3, 4, 3, 4, 3],
    assists: [7, 6, 8, 6, 7, 9, 6, 7, 8, 7],
  },
  "aaron-judge": {
    hits: [2, 1, 0, 2, 1, 3, 1, 2, 0, 2],
    homeRuns: [1, 0, 0, 1, 0, 1, 0, 0, 1, 0],
    rbi: [2, 0, 1, 3, 1, 2, 0, 1, 2, 1],
  },
  "cooper-flagg": {
    points: [24, 18, 22, 21, 27, 16, 23, 19, 25, 20],
    rebounds: [9, 7, 8, 10, 7, 8, 9, 7, 8, 9],
    assists: [5, 3, 4, 5, 4, 3, 5, 4, 4, 5],
  },
  "stephen-curry": {
    points: [28, 31, 22, 29, 26, 33, 24, 28, 30, 25],
    rebounds: [4, 3, 5, 4, 5, 3, 4, 4, 5, 4],
    assists: [5, 6, 4, 6, 5, 7, 5, 5, 6, 5],
  },
};

export default function PlayerPage({ params }: Props) {
  const player = MOCK_PLAYERS.find((p) => p.id === params.id);
  if (!player) notFound();

  const playerProps = MOCK_PROPS.filter((p) => p.player.id === params.id);
  const playerNews = MOCK_NEWS.filter((n) =>
    n.tags.some((t) => t.includes(player.name.split(" ")[1] ?? player.name))
  );
  const perfData = MOCK_PERF[params.id] ?? {};
  const statKeys = Object.keys(perfData);
  const isMLB = player.sport === "MLB";

  return (
    <div className="animate-fade-in">
      {/* Back */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-secondary transition-colors mb-4"
      >
        <ChevronLeft size={13} />
        Dashboard
      </Link>

      {/* Player header */}
      <div className="bg-bg-card border border-bg-border rounded-xl p-5 mb-6">
        <div className="flex items-start gap-4">
          {/* Avatar placeholder */}
          <div className="w-16 h-16 rounded-xl bg-bg-secondary border border-bg-border flex items-center justify-center shrink-0">
            <span className="font-display font-bold text-xl text-text-muted">
              {player.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </span>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <SportBadge sport={player.sport} />
              <StatusBadge status={player.status} />
            </div>
            <h1 className="font-display font-bold text-2xl text-text-primary mb-0.5">
              {player.name}
            </h1>
            <div className="text-sm text-text-secondary">
              {player.team.name} · {player.position}
              {player.number && ` · #${player.number}`}
            </div>
          </div>

          {/* Season averages */}
          <div className="hidden sm:grid grid-cols-3 gap-3">
            {player.seasonAverages &&
              Object.entries(player.seasonAverages)
                .slice(0, 6)
                .map(([key, val]) => (
                  <div key={key} className="text-center">
                    <div className="text-[8px] font-mono text-text-muted uppercase">
                      {key
                        .replace(/([A-Z])/g, " $1")
                        .trim()
                        .slice(0, 8)}
                    </div>
                    <div className="text-lg font-mono font-bold text-text-primary">
                      {typeof val === "number" && val < 1
                        ? val.toFixed(3)
                        : val}
                    </div>
                  </div>
                ))}
          </div>
        </div>

        {/* Injury note */}
        {player.status !== "active" && (
          <div className="mt-3 p-2.5 bg-accent-amber/5 border border-accent-amber/20 rounded-md">
            <p className="text-[10px] text-accent-amber font-mono">
              ⚠ Player is listed as{" "}
              <strong>{player.status.toUpperCase()}</strong> — factor this into
              any prop analysis
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
        {/* Left */}
        <div className="space-y-6">
          {/* Trend charts */}
          {statKeys.length > 0 && (
            <Card>
              <div className="text-[9px] font-mono text-text-muted uppercase tracking-wider mb-4">
                Recent Performance Trends
              </div>
              <div className="space-y-6">
                {statKeys.slice(0, 3).map((key) => {
                  const propForKey = playerProps.find(
                    (p) =>
                      p.propType === key ||
                      p.propType === `prop_${key}` ||
                      key.includes(p.propType.replace("prop_", ""))
                  );
                  return (
                    <div
                      key={key}
                      className="pb-6 border-b border-bg-border last:border-0 last:pb-0"
                    >
                      <TrendChart
                        data={perfData[key]}
                        line={propForKey?.line}
                        label={key
                          .replace(/([A-Z])/g, " $1")
                          .trim()
                          .replace(/\b\w/g, (c) => c.toUpperCase())}
                      />
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Props */}
          {playerProps.length > 0 && (
            <div>
              <div className="text-[9px] font-mono text-text-muted uppercase tracking-wider mb-3">
                Available Props
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {playerProps.map((prop) => (
                  <PropCard key={prop.id} prop={prop} expanded />
                ))}
              </div>
            </div>
          )}

          {/* Live Prop Simulator — for first available prop */}
          {playerProps.length > 0 && player.seasonAverages && (
            <LivePropSimulator
              playerName={player.name}
              propType={playerProps[0].propType}
              bookLine={playerProps[0].line}
              seasonAvg={
                playerProps[0].propType === "points" ? (player.seasonAverages.points ?? playerProps[0].line) :
                playerProps[0].propType === "rebounds" ? (player.seasonAverages.rebounds ?? playerProps[0].line) :
                playerProps[0].propType === "assists" ? (player.seasonAverages.assists ?? playerProps[0].line) :
                playerProps[0].line
              }
              last5Avg={playerProps[0].recentPerformance ? playerProps[0].recentPerformance.slice(0, 5).reduce((a, b) => a + b, 0) / 5 : playerProps[0].line}
              last10Avg={playerProps[0].recentPerformance ? playerProps[0].recentPerformance.reduce((a, b) => a + b, 0) / playerProps[0].recentPerformance.length : playerProps[0].line}
              opponentDefRank={15}
              homeAway="home"
              restDays={1}
              playerStatus={player.status === "active" ? "active" : player.status === "questionable" ? "questionable" : "day-to-day"}
            />
          )}

          {playerProps.length === 0 && (
            <Card>
              <div className="text-center py-6 text-text-muted text-xs font-mono">
                No props available for tonight
              </div>
            </Card>
          )}
        </div>

        {/* Right */}
        <div className="space-y-4">
          {/* Season stats card */}
          <Card padding="sm">
            <div className="text-[9px] font-mono text-text-muted uppercase tracking-wider mb-3">
              Season Averages
            </div>
            {player.seasonAverages &&
              Object.entries(player.seasonAverages).map(([key, val]) => (
                <div
                  key={key}
                  className="flex items-center justify-between py-1.5 border-b border-bg-border/50 last:border-0"
                >
                  <span className="text-[10px] text-text-secondary">
                    {key
                      .replace(/([A-Z])/g, " $1")
                      .trim()
                      .replace(/\b\w/g, (c) => c.toUpperCase())}
                  </span>
                  <span className="text-xs font-mono font-semibold text-text-primary">
                    {typeof val === "number" && val < 1
                      ? val.toFixed(3)
                      : val}
                  </span>
                </div>
              ))}
          </Card>

          {/* News */}
          <Card>
            <NewsPanel
              news={playerNews}
              title={`${player.name.split(" ")[1]} Intel`}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
