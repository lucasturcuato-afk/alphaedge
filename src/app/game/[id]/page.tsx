// src/app/game/[id]/page.tsx
"use client";
import { notFound } from "next/navigation";
import { MOCK_GAMES } from "@/lib/mock-data/games";
import { MOCK_PROPS } from "@/lib/mock-data/props";
import { MOCK_NEWS } from "@/lib/mock-data/news";
import { MatchupHeader } from "@/components/game/MatchupHeader";
import { SimulationPanel } from "@/components/game/SimulationPanel";
import { LiveSimulationPanel } from "@/components/game/LiveSimulationPanel";
import { LineComparison } from "@/components/game/LineComparison";
import { NewsPanel } from "@/components/game/NewsPanel";
import { PropCard } from "@/components/player/PropCard";
import { Card, SectionHeader } from "@/components/ui/Card";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

interface Props {
  params: { id: string };
}

export default function GamePage({ params }: Props) {
  const game = MOCK_GAMES.find((g) => g.id === params.id);
  if (!game) notFound();

  const gameProps = MOCK_PROPS.filter((p) => p.gameId === game.id);
  const gameNews = MOCK_NEWS.filter(
    (n) =>
      n.tags.some(
        (t) =>
          t.includes(game.homeTeam.shortName) ||
          t.includes(game.awayTeam.shortName)
      )
  );
  const pred = game.prediction;

  return (
    <div className="animate-fade-in">
      {/* Back nav */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-secondary transition-colors mb-4"
      >
        <ChevronLeft size={13} />
        Dashboard
      </Link>

      {/* Matchup header */}
      <MatchupHeader game={game} />

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">
        {/* Left column */}
        <div className="space-y-6">
          {/* Reasoning */}
          {pred && (
            <Card>
              <div className="text-[9px] font-mono text-accent-green uppercase tracking-wider mb-3">
                Model Reasoning
              </div>
              <p className="text-sm text-text-secondary leading-relaxed mb-4">
                {pred.reasoning}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Supporting factors */}
                <div>
                  <div className="text-[9px] font-mono text-accent-green mb-2">
                    ▲ SUPPORTING FACTORS
                  </div>
                  <div className="space-y-2">
                    {pred.supportingFactors.map((f, i) => (
                      <div
                        key={i}
                        className="p-2 bg-accent-green/5 border border-accent-green/10 rounded"
                      >
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[10px] font-semibold text-text-primary">
                            {f.label}
                          </span>
                          <span
                            className={`text-[8px] font-mono ${
                              f.impact === "high"
                                ? "text-accent-red"
                                : f.impact === "medium"
                                ? "text-accent-amber"
                                : "text-text-muted"
                            }`}
                          >
                            {f.impact.toUpperCase()}
                          </span>
                        </div>
                        {f.value && (
                          <div className="text-[9px] font-mono text-accent-blue mb-0.5">
                            {f.value}
                          </div>
                        )}
                        <p className="text-[10px] text-text-secondary leading-relaxed">
                          {f.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Risk factors */}
                <div>
                  <div className="text-[9px] font-mono text-accent-red mb-2">
                    ▼ RISK FACTORS
                  </div>
                  <div className="space-y-2">
                    {pred.riskFactors.map((f, i) => (
                      <div
                        key={i}
                        className="p-2 bg-accent-red/5 border border-accent-red/10 rounded"
                      >
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[10px] font-semibold text-text-primary">
                            {f.label}
                          </span>
                          <span
                            className={`text-[8px] font-mono ${
                              f.impact === "high"
                                ? "text-accent-red"
                                : f.impact === "medium"
                                ? "text-accent-amber"
                                : "text-text-muted"
                            }`}
                          >
                            {f.impact.toUpperCase()}
                          </span>
                        </div>
                        {f.value && (
                          <div className="text-[9px] font-mono text-accent-amber mb-0.5">
                            {f.value}
                          </div>
                        )}
                        <p className="text-[10px] text-text-secondary leading-relaxed">
                          {f.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Line comparison */}
          {game.lines && game.lines.length > 0 && (
            <Card>
              <LineComparison
                lines={game.lines}
                prediction={game.prediction}
                homeAbbr={game.homeTeam.abbreviation}
                awayAbbr={game.awayTeam.abbreviation}
              />
            </Card>
          )}

          {/* Props for this game */}
          {gameProps.length > 0 && (
            <div>
              <SectionHeader
                title="Player Props"
                subtitle={`${gameProps.length} props analyzed for this game`}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {gameProps.map((prop) => (
                  <PropCard key={prop.id} prop={prop} expanded />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Live Simulation */}
          <LiveSimulationPanel
            gameId={game.id}
            homeAbbr={game.homeTeam.abbreviation}
            awayAbbr={game.awayTeam.abbreviation}
            sport={game.sport}
            precomputedSim={game.simulation}
          />

          {/* News */}
          <Card>
            <NewsPanel
              news={gameNews}
              title={`${game.homeTeam.abbreviation} vs ${game.awayTeam.abbreviation} Intel`}
            />
          </Card>
        </div>
      </div>
    </div>
  );
}
