// src/components/dashboard/TodayGames.tsx
"use client";
import Link from "next/link";
import type { Game } from "@/lib/types";
import {
  formatGameTime,
  formatOdds,
  formatSpread,
  cn,
} from "@/lib/utils";
import { SportBadge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { CloudRain, Wind, Thermometer, Clock } from "lucide-react";

interface TodayGamesProps {
  games: Game[];
}

function WinProb({ prob, side }: { prob: number; side: "home" | "away" }) {
  const pct = Math.round(prob * 100);
  const isHome = side === "home";
  return (
    <div className={cn("text-center", isHome ? "items-end" : "items-start")}>
      <div
        className="text-lg font-mono font-bold"
        style={{ color: pct > 50 ? "#00FF87" : "#7B8FA6" }}
      >
        {pct}%
      </div>
      <div className="text-[9px] text-text-muted font-mono">WIN PROB</div>
    </div>
  );
}

function GameCard({ game }: { game: Game }) {
  const pred = game.prediction;
  const line = game.lines?.[0];

  return (
    <Link href={`/game/${game.id}`}>
      <Card hover className="group">
        {/* Header: sport + time */}
        <div className="flex items-center justify-between mb-3">
          <SportBadge sport={game.sport} />
          <div className="flex items-center gap-1.5 text-[10px] text-text-muted font-mono">
            <Clock size={10} />
            {formatGameTime(game.gameTime)}
          </div>
        </div>

        {/* Teams row */}
        <div className="flex items-center gap-2 mb-3">
          {/* Away team */}
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-text-muted font-mono">AWAY</div>
                <div className="font-display font-bold text-sm text-text-primary group-hover:text-accent-green/90 transition-colors">
                  {game.awayTeam.abbreviation}
                </div>
                <div className="text-[10px] text-text-muted">
                  {game.awayTeam.shortName}
                </div>
              </div>
              {pred && (
                <WinProb prob={pred.winProbAway} side="away" />
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="text-text-muted font-mono text-xs px-2">@</div>

          {/* Home team */}
          <div className="flex-1">
            <div className="flex items-center justify-between">
              {pred && (
                <WinProb prob={pred.winProbHome} side="home" />
              )}
              <div className="text-right">
                <div className="text-xs text-text-muted font-mono">HOME</div>
                <div className="font-display font-bold text-sm text-text-primary group-hover:text-accent-green/90 transition-colors">
                  {game.homeTeam.abbreviation}
                </div>
                <div className="text-[10px] text-text-muted">
                  {game.homeTeam.shortName}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Line info */}
        {line && (
          <div className="grid grid-cols-3 gap-2 p-2 bg-bg-secondary rounded-md border border-bg-border mb-3">
            <div className="text-center">
              <div className="text-[9px] text-text-muted font-mono">SPREAD</div>
              <div className="text-xs font-mono text-text-primary font-semibold">
                {formatSpread(line.homeSpread)}
              </div>
            </div>
            <div className="text-center border-x border-bg-border">
              <div className="text-[9px] text-text-muted font-mono">TOTAL</div>
              <div className="text-xs font-mono text-text-primary font-semibold">
                {line.total}
              </div>
            </div>
            <div className="text-center">
              <div className="text-[9px] text-text-muted font-mono">ML</div>
              <div className="text-xs font-mono text-text-primary font-semibold">
                {formatOdds(line.homeML)}
              </div>
            </div>
          </div>
        )}

        {/* Model projection vs line */}
        {pred && (
          <div className="flex items-center gap-2 mb-2">
            <div className="flex-1 text-center p-1.5 bg-bg-secondary rounded border border-bg-border">
              <div className="text-[9px] text-text-muted font-mono">MODEL SPREAD</div>
              <div className="text-xs font-mono font-bold text-accent-blue">
                {formatSpread(pred.projectedSpread)}
              </div>
            </div>
            <div className="flex-1 text-center p-1.5 bg-bg-secondary rounded border border-bg-border">
              <div className="text-[9px] text-text-muted font-mono">MODEL TOTAL</div>
              <div className="text-xs font-mono font-bold text-accent-blue">
                {pred.projectedTotal.toFixed(1)}
              </div>
            </div>
            <div className="flex-1 text-center p-1.5 bg-bg-secondary rounded border border-bg-border">
              <div className="text-[9px] text-text-muted font-mono">CONFIDENCE</div>
              <div
                className="text-xs font-mono font-bold"
                style={{
                  color:
                    pred.confidenceScore >= 75
                      ? "#00FF87"
                      : pred.confidenceScore >= 60
                      ? "#F59E0B"
                      : "#FF3B5C",
                }}
              >
                {pred.confidenceScore}
              </div>
            </div>
          </div>
        )}

        {/* Weather for MLB */}
        {game.weather && (
          <div className="flex items-center gap-3 text-[10px] text-text-muted font-mono mt-1">
            <span className="flex items-center gap-1">
              <Thermometer size={10} />
              {game.weather.temp}°F
            </span>
            <span className="flex items-center gap-1">
              <Wind size={10} />
              {game.weather.wind} mph
            </span>
            <span>{game.weather.condition}</span>
          </div>
        )}

        {/* Best edge callout */}
        {pred && Math.abs(pred.edgeAway) > 2 && (
          <div className="mt-2 pt-2 border-t border-bg-border flex items-center gap-1.5">
            <span className="text-[9px] font-mono text-accent-green">▶</span>
            <span className="text-[10px] text-text-secondary">
              Model edge on{" "}
              <span className="text-accent-green font-semibold">
                {pred.edgeAway > pred.edgeHome
                  ? game.awayTeam.abbreviation
                  : game.homeTeam.abbreviation}
              </span>{" "}
              ({pred.edgeAway > 0 ? "+" : ""}{pred.edgeAway.toFixed(1)}% edge)
            </span>
          </div>
        )}
      </Card>
    </Link>
  );
}

export function TodayGames({ games }: TodayGamesProps) {
  const nba = games.filter((g) => g.sport === "NBA");
  const ncaa = games.filter((g) => g.sport === "NCAAMB");
  const mlb = games.filter((g) => g.sport === "MLB");

  const sections = [
    { label: "NBA", games: nba, color: "#C8A96E" },
    { label: "NCAAMB", games: ncaa, color: "#4B9CD3" },
    { label: "MLB", games: mlb, color: "#E8002D" },
  ].filter((s) => s.games.length > 0);

  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <div key={section.label}>
          <div className="flex items-center gap-2 mb-3">
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: section.color }}
            />
            <h3 className="text-xs font-mono font-semibold text-text-secondary uppercase tracking-wider">
              {section.label}
            </h3>
            <span className="text-[10px] font-mono text-text-muted">
              {section.games.length} game{section.games.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {section.games.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
