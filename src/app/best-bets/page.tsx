// src/app/best-bets/page.tsx
"use client";
import { MOCK_PROPS } from "@/lib/mock-data/props";
import { MOCK_GAMES } from "@/lib/mock-data/games";
import { PropCard } from "@/components/player/PropCard";
import { Card } from "@/components/ui/Card";
import { gradeEdge, formatOdds, formatSpread } from "@/lib/utils";
import { SportBadge } from "@/components/ui/Badge";
import Link from "next/link";
import { Trophy, Zap, Target } from "lucide-react";

const TOP_PROPS = [...MOCK_PROPS].sort((a, b) => b.edge - a.edge).slice(0, 4);

const TOP_GAME_BETS = MOCK_GAMES
  .filter((g) => g.prediction)
  .map((g) => ({
    game: g,
    maxEdge: Math.max(
      Math.abs(g.prediction!.edgeHome),
      Math.abs(g.prediction!.edgeAway)
    ),
  }))
  .sort((a, b) => b.maxEdge - a.maxEdge);

export default function BestBetsPage() {
  const totalEdgeValue = TOP_PROPS.reduce((a, b) => a + b.edge, 0) / TOP_PROPS.length;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-8 h-8 rounded-lg bg-accent-green/10 border border-accent-green/20 flex items-center justify-center">
          <Trophy size={16} className="text-accent-green" />
        </div>
        <div>
          <h1 className="font-display font-bold text-xl text-text-primary">
            Best Edges Tonight
          </h1>
          <p className="text-xs text-text-muted">
            Highest model edge vs. current sportsbook lines · Updated live
          </p>
        </div>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Card padding="sm">
          <div className="flex items-center gap-2">
            <Zap size={14} className="text-accent-green" />
            <div>
              <div className="text-[9px] font-mono text-text-muted">TOP EDGE</div>
              <div className="text-lg font-mono font-bold text-accent-green">
                +{TOP_PROPS[0]?.edge.toFixed(1)}%
              </div>
            </div>
          </div>
        </Card>
        <Card padding="sm">
          <div className="flex items-center gap-2">
            <Target size={14} className="text-accent-blue" />
            <div>
              <div className="text-[9px] font-mono text-text-muted">AVG EDGE (TOP 4)</div>
              <div className="text-lg font-mono font-bold text-accent-blue">
                +{totalEdgeValue.toFixed(1)}%
              </div>
            </div>
          </div>
        </Card>
        <Card padding="sm">
          <div>
            <div className="text-[9px] font-mono text-text-muted">TOTAL PROPS</div>
            <div className="text-lg font-mono font-bold text-text-primary">
              {MOCK_PROPS.length}
            </div>
          </div>
        </Card>
      </div>

      {/* Disclaimer */}
      <div className="mb-5 p-3 bg-accent-amber/5 border border-accent-amber/20 rounded-lg">
        <p className="text-[10px] text-accent-amber font-mono leading-relaxed">
          <strong>MODEL NOTE:</strong> These represent the model's highest-edge
          opportunities based on fair probability vs. sportsbook implied
          probability. Edge is calculated as (model probability − book implied
          probability) × 100. All predictions carry uncertainty — never risk
          money you cannot afford to lose.
        </p>
      </div>

      {/* Top prop bets */}
      <div className="mb-8">
        <h2 className="font-display font-bold text-base text-text-primary mb-3">
          Top Player Prop Edges
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {TOP_PROPS.map((prop, i) => (
            <div key={prop.id} className="relative">
              {i === 0 && (
                <div className="absolute -top-2 left-3 z-10 flex items-center gap-1 bg-accent-green text-bg-primary text-[8px] font-mono font-bold px-2 py-0.5 rounded-full">
                  <Trophy size={8} />
                  BEST EDGE
                </div>
              )}
              <Link href={`/player/${prop.player.id}`}>
                <PropCard prop={prop} />
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* Game bets */}
      <div>
        <h2 className="font-display font-bold text-base text-text-primary mb-3">
          Game Bet Edges
        </h2>
        <div className="space-y-3">
          {TOP_GAME_BETS.map(({ game, maxEdge }) => {
            const pred = game.prediction!;
            const line = game.lines?.[0];
            const bestSide =
              pred.edgeAway > pred.edgeHome
                ? { team: game.awayTeam, edge: pred.edgeAway, odds: line?.awayML, fairOdds: pred.fairOddsAway }
                : { team: game.homeTeam, edge: pred.edgeHome, odds: line?.homeML, fairOdds: pred.fairOddsHome };

            const rating = gradeEdge(bestSide.edge);

            return (
              <Link key={game.id} href={`/game/${game.id}`}>
                <Card hover>
                  <div className="flex items-center gap-4 flex-wrap">
                    <SportBadge sport={game.sport} />

                    {/* Matchup */}
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="font-display font-bold text-sm text-text-primary">
                        {game.awayTeam.abbreviation}
                      </span>
                      <span className="text-text-muted text-xs font-mono">@</span>
                      <span className="font-display font-bold text-sm text-text-primary">
                        {game.homeTeam.abbreviation}
                      </span>
                    </div>

                    {/* Best bet */}
                    <div className="flex items-center gap-2">
                      <div className="text-center">
                        <div className="text-[9px] font-mono text-text-muted">BEST BET</div>
                        <div className="text-sm font-display font-bold text-text-primary">
                          {bestSide.team.abbreviation} ML
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-[9px] font-mono text-text-muted">BOOK ODDS</div>
                        <div className="text-sm font-mono font-bold text-text-primary">
                          {bestSide.odds ? formatOdds(bestSide.odds) : "N/A"}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-[9px] font-mono text-accent-green">FAIR ODDS</div>
                        <div className="text-sm font-mono font-bold text-accent-green">
                          {formatOdds(bestSide.fairOdds)}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-[9px] font-mono text-text-muted">EDGE</div>
                        <div
                          className="text-lg font-mono font-bold"
                          style={{ color: rating.color }}
                        >
                          +{bestSide.edge.toFixed(1)}%
                        </div>
                      </div>
                      <div
                        className="px-2 py-1 rounded border text-[9px] font-mono font-bold"
                        style={{
                          color: rating.color,
                          borderColor: `${rating.color}30`,
                          background: `${rating.color}10`,
                        }}
                      >
                        {rating.grade}
                      </div>
                    </div>
                  </div>

                  {/* Confidence + model reasoning snippet */}
                  <div className="mt-3 flex items-center gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="h-1 bg-bg-border rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${pred.confidenceScore}%`,
                            background: rating.color,
                          }}
                        />
                      </div>
                      <div className="mt-0.5 text-[9px] font-mono text-text-muted">
                        Confidence: {pred.confidenceScore}/100
                      </div>
                    </div>
                    <p className="text-[10px] text-text-secondary max-w-md leading-relaxed truncate">
                      {pred.supportingFactors[0]?.description}
                    </p>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
