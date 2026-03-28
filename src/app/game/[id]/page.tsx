// src/app/game/[id]/page.tsx
"use client";
import { useState, useEffect } from "react";
import { MatchupHeader } from "@/components/game/MatchupHeader";
import { LiveSimulationPanel } from "@/components/game/LiveSimulationPanel";
import { LineComparison } from "@/components/game/LineComparison";
import { Card, SectionHeader } from "@/components/ui/Card";
import { ChevronLeft, RefreshCw, AlertCircle, TrendingUp, Shield } from "lucide-react";
import Link from "next/link";
import type { Game } from "@/lib/types";

interface Props { params: { id: string }; }

function FactorCard({ f, type }: { f: any; type: "support"|"risk" }) {
  const border = type === "support" ? "border-accent-green/20 bg-accent-green/5" : "border-accent-red/20 bg-accent-red/5";
  const imp = f.impact === "high" ? "text-accent-red" : f.impact === "medium" ? "text-accent-amber" : "text-text-muted";
  return (
    <div className={`p-2.5 rounded-lg border ${border}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-semibold text-text-primary">{f.label}</span>
        <span className={`text-[8px] font-mono ${imp}`}>{f.impact?.toUpperCase()}</span>
      </div>
      {f.value && <div className="text-[9px] font-mono text-accent-blue mb-1">{f.value}</div>}
      <p className="text-[10px] text-text-secondary leading-relaxed">{f.description}</p>
    </div>
  );
}

export default function GamePage({ params }: Props) {
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    fetch("/api/games", { cache: "no-store" })
      .then(r => r.json())
      .then(d => {
        const found = (d.games ?? []).find((g: Game) => g.id === params.id);
        found ? setGame(found) : setMissing(true);
        setLoading(false);
      })
      .catch(() => { setMissing(true); setLoading(false); });
  }, [params.id]);

  const back = (
    <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-text-secondary transition-colors mb-4">
      <ChevronLeft size={13} />Dashboard
    </Link>
  );

  if (loading) return (
    <div className="animate-fade-in">{back}
      <div className="flex items-center gap-2 py-16 text-text-muted text-xs font-mono">
        <RefreshCw size={13} className="animate-spin" />Loading game data...
      </div>
    </div>
  );

  if (missing || !game) return (
    <div className="animate-fade-in">{back}
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <AlertCircle size={28} className="text-text-muted" />
        <p className="text-sm text-text-muted font-mono">Game not found in today&apos;s slate</p>
        <Link href="/" className="text-xs text-accent-green font-mono hover:underline">← Back to Dashboard</Link>
      </div>
    </div>
  );

  const pred = game.prediction;
  const line = game.lines?.[0];

  return (
    <div className="animate-fade-in">
      {back}
      <MatchupHeader game={game} />

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6 mt-6">

        {/* ── LEFT ── */}
        <div className="space-y-5">

          {pred && (
            <Card>
              <div className="text-[9px] font-mono text-accent-green uppercase tracking-wider mb-3">Model Analysis</div>

              {/* Win probability */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                {[
                  { abbr: game.awayTeam.abbreviation, name: game.awayTeam.shortName, rec: game.awayTeam.record, prob: pred.winProbAway, ml: line?.awayML },
                  { abbr: game.homeTeam.abbreviation, name: game.homeTeam.shortName, rec: game.homeTeam.record, prob: pred.winProbHome, ml: line?.homeML },
                ].map(t => (
                  <div key={t.abbr} className="p-3 bg-bg-secondary rounded-lg text-center">
                    <div className="text-[9px] font-mono text-text-muted mb-0.5">{t.abbr} WIN PROB</div>
                    <div className={`text-2xl font-display font-bold ${t.prob > 0.5 ? "text-accent-green" : "text-accent-blue"}`}>
                      {Math.round(t.prob * 100)}%
                    </div>
                    {t.rec && <div className="text-[9px] font-mono text-text-muted mt-1">{t.rec}</div>}
                    {t.ml && <div className="text-[9px] font-mono text-text-muted">ML: {t.ml > 0 ? "+" : ""}{t.ml}</div>}
                  </div>
                ))}
              </div>

              {/* Projected stats */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="p-2 bg-bg-secondary rounded text-center">
                  <div className="text-[8px] font-mono text-text-muted">PROJ SPREAD</div>
                  <div className="text-sm font-mono font-bold text-text-primary">
                    {pred.projectedSpread > 0 ? "+" : ""}{pred.projectedSpread}
                  </div>
                </div>
                <div className="p-2 bg-bg-secondary rounded text-center">
                  <div className="text-[8px] font-mono text-text-muted">PROJ TOTAL</div>
                  <div className="text-sm font-mono font-bold text-accent-blue">{pred.projectedTotal}</div>
                  {line?.total && <div className="text-[8px] font-mono text-text-muted">Line: {line.total}</div>}
                </div>
                <div className="p-2 bg-bg-secondary rounded text-center">
                  <div className="text-[8px] font-mono text-text-muted">CONFIDENCE</div>
                  <div className={`text-sm font-mono font-bold ${pred.confidenceScore >= 70 ? "text-accent-green" : pred.confidenceScore >= 60 ? "text-accent-amber" : "text-text-muted"}`}>
                    {pred.confidenceScore}/100
                  </div>
                </div>
              </div>

              {/* Reasoning */}
              <div className="p-3 bg-bg-secondary rounded-lg mb-4">
                <div className="text-[9px] font-mono text-text-muted mb-1 uppercase tracking-wider">Model Reasoning</div>
                <p className="text-[11px] text-text-secondary leading-relaxed">{pred.reasoning}</p>
              </div>

              {/* Factors */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="text-[9px] font-mono text-accent-green mb-2">▲ SUPPORTING FACTORS</div>
                  <div className="space-y-2">
                    {(pred.supportingFactors ?? []).map((f: any, i: number) => (
                      <FactorCard key={i} f={f} type="support" />
                    ))}
                    {(pred.supportingFactors ?? []).length === 0 && (
                      <p className="text-[10px] text-text-muted font-mono italic">None identified</p>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-[9px] font-mono text-accent-red mb-2">▼ RISK FACTORS</div>
                  <div className="space-y-2">
                    {(pred.riskFactors ?? []).length > 0
                      ? pred.riskFactors!.map((f: any, i: number) => <FactorCard key={i} f={f} type="risk" />)
                      : <p className="text-[10px] text-text-muted font-mono italic">No significant risks flagged</p>
                    }
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Fair odds vs book */}
          {pred && (pred.fairOddsHome || pred.fairOddsAway) && (
            <Card>
              <div className="text-[9px] font-mono text-text-muted uppercase tracking-wider mb-3">Fair Odds vs Book</div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: game.awayTeam.abbreviation, fair: pred.fairOddsAway, book: line?.awayML, edge: pred.edgeAway },
                  { label: game.homeTeam.abbreviation, fair: pred.fairOddsHome, book: line?.homeML, edge: pred.edgeHome },
                ].map(t => (
                  <div key={t.label} className="p-3 bg-bg-secondary rounded-lg text-center">
                    <div className="text-[9px] font-mono text-text-muted mb-1">{t.label}</div>
                    <div className={`text-lg font-mono font-bold ${(t.fair ?? 0) > 0 ? "text-accent-green" : "text-text-primary"}`}>
                      {(t.fair ?? 0) > 0 ? "+" : ""}{t.fair}
                    </div>
                    {t.book && <div className="text-[9px] font-mono text-text-muted">Book: {t.book > 0 ? "+" : ""}{t.book}</div>}
                    <div className={`text-[9px] font-mono mt-1 ${(t.edge ?? 0) > 0 ? "text-accent-green" : "text-accent-red"}`}>
                      Edge: {(t.edge ?? 0) > 0 ? "+" : ""}{t.edge}%
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Lines */}
          {line && (
            <Card>
              <LineComparison
                lines={game.lines!}
                prediction={pred}
                homeAbbr={game.homeTeam.abbreviation}
                awayAbbr={game.awayTeam.abbreviation}
              />
            </Card>
          )}
        </div>

        {/* ── RIGHT ── */}
        <div className="space-y-4">
          <LiveSimulationPanel
            gameId={game.id}
            homeAbbr={game.homeTeam.abbreviation}
            awayAbbr={game.awayTeam.abbreviation}
            sport={game.sport}
            precomputedSim={game.simulation}
          />
          {game.venue && (
            <Card>
              <div className="text-[9px] font-mono text-text-muted uppercase tracking-wider mb-1">Venue</div>
              <p className="text-sm text-text-secondary">{game.venue}</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
