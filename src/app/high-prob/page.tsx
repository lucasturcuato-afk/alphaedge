"use client";
import { useState, useEffect } from "react";
// props fetched dynamically from /api/props
import { SportBadge } from "@/components/ui/Badge";
import Link from "next/link";
import { TrendingUp, Shield, Star, ChevronRight, AlertTriangle, Flame, RefreshCw } from "lucide-react";
import type { Game } from "@/lib/types";

function ProbBar({ prob }: { prob: number }) {
  const pct = Math.round(prob * 100);
  const color = pct >= 70 ? "#00FF87" : pct >= 63 ? "#F59E0B" : "#0EA5E9";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-bg-border rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-mono font-bold w-10 text-right" style={{ color }}>{pct}%</span>
    </div>
  );
}

function ConfBadge({ prob }: { prob: number }) {
  const pct = Math.round(prob * 100);
  if (pct >= 70) return <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-accent-green/15 text-accent-green border border-accent-green/25 flex items-center gap-1"><Flame size={9}/>HIGH CONF</span>;
  if (pct >= 63) return <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-accent-amber/15 text-accent-amber border border-accent-amber/25 flex items-center gap-1"><Star size={9}/>SOLID</span>;
  return <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-accent-blue/15 text-accent-blue border border-accent-blue/25 flex items-center gap-1"><Shield size={9}/>LEAN</span>;
}

export default function HighProbPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/games", { cache: "no-store" })
      .then(r => r.json())
      .then(d => { setGames(d.games ?? []); setLoading(false); })
      .catch(() => { import("@/lib/mock-data/games").then(m => { setGames(m.MOCK_GAMES); setLoading(false); }); });
  }, []);

  const [props, setProps] = useState<any[]>([]);
  useEffect(() => {
    fetch("/api/props", { cache: "no-store" })
      .then(r => r.json())
      .then(d => setProps(d.props ?? []))
      .catch(() => {});
  }, []);
  const PROP_PICKS = props
    .map((p:any) => ({ prop: p, hitProb: Math.max(p.overProbability, p.underProbability), side: p.overProbability >= p.underProbability ? "OVER" : "UNDER" }))
    .filter((p:any) => p.hitProb >= 0.55).sort((a:any,b:any) => b.hitProb - a.hitProb).slice(0, 10);

  const GAME_PICKS = games.filter(g => g.prediction && g.status !== 'final').map(g => {
    const pred = g.prediction!;
    const homeWins = pred.winProbHome > pred.winProbAway;
    return { game: g, pred, winProb: homeWins ? pred.winProbHome : pred.winProbAway, favTeam: homeWins ? g.homeTeam : g.awayTeam, undTeam: homeWins ? g.awayTeam : g.homeTeam, favSpread: homeWins ? g.lines?.[0]?.homeSpread : g.lines?.[0]?.awaySpread, favML: homeWins ? g.lines?.[0]?.homeML : g.lines?.[0]?.awayML };
  }).sort((a, b) => b.winProb - a.winProb);

  const TOTAL_PLAYS = games.filter(g => g.prediction && g.lines?.[0] && g.status !== 'final').map(g => {
    const diff = g.prediction!.projectedTotal - g.lines![0].total;
    return { game: g, diff, side: diff < 0 ? "UNDER" : "OVER", absDiff: Math.abs(diff) };
  }).filter(t => t.absDiff >= 2.5).sort((a, b) => b.absDiff - a.absDiff).slice(0, 6);

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-accent-green/10 border border-accent-green/20 flex items-center justify-center">
              <TrendingUp size={16} className="text-accent-green" />
            </div>
            <h1 className="font-display font-bold text-xl text-text-primary">Highest Probability Bets</h1>
          </div>
          <p className="text-xs text-text-muted ml-10">Bets the model believes will <span className="text-accent-green font-semibold">hit</span> — ranked by win probability, not just value</p>
        </div>
        <div className="text-right">
          <div className="text-[9px] font-mono text-text-muted">MODEL v2.1 · 10K SIMS</div>
          <div className="text-[9px] font-mono text-text-muted">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</div>
        </div>
      </div>

      <div className="flex items-start gap-2 p-3 bg-accent-amber/5 border border-accent-amber/20 rounded-lg">
        <AlertTriangle size={13} className="text-accent-amber mt-0.5 shrink-0" />
        <p className="text-[10px] text-accent-amber font-mono leading-relaxed">
          <strong>MODEL NOTE:</strong> Win probability = model's estimated chance this bet hits. A 75% play still loses 1-in-4 times. Never risk more than you can afford to lose.
        </p>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12 text-text-muted text-xs font-mono">
          <RefreshCw size={14} className="animate-spin mr-2" />Fetching today&apos;s games...
        </div>
      )}

      {!loading && (
        <>
          {PROP_PICKS.length > 0 && GAME_PICKS.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="relative p-4 rounded-xl border-2 border-accent-green/50 bg-accent-green/5">
                <div className="absolute -top-3 left-4 flex items-center gap-1 bg-accent-green text-bg-primary text-[9px] font-mono font-bold px-2.5 py-1 rounded-full">
                  <Flame size={9}/> #1 PROP PICK
                </div>
                <div className="mt-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-text-primary">{PROP_PICKS[0].prop.player.name}</div>
                      <div className="text-[10px] text-text-muted font-mono">{PROP_PICKS[0].prop.propType.replace(/_/g,' ').toUpperCase()} {PROP_PICKS[0].side} {PROP_PICKS[0].prop.line}</div>
                    </div>
                    <ConfBadge prob={PROP_PICKS[0].hitProb} />
                  </div>
                  <ProbBar prob={PROP_PICKS[0].hitProb} />
                  <div className="text-[10px] font-mono text-text-muted">Proj <span className="text-accent-green font-semibold">{PROP_PICKS[0].prop.projectedValue}</span>{" vs line "}<span className="text-text-secondary">{PROP_PICKS[0].prop.line}</span>{" · Edge "}<span className="text-accent-green font-semibold">+{PROP_PICKS[0].prop.edge}%</span></div>
                  {PROP_PICKS[0].prop.factors[0] && (<div className="p-2 bg-bg-secondary rounded text-[9px] text-text-muted leading-relaxed"><span className="text-accent-green font-semibold">{PROP_PICKS[0].prop.factors[0].label}:</span>{" "}{PROP_PICKS[0].prop.factors[0].description}</div>)}
                </div>
              </div>
              <div className="relative p-4 rounded-xl border-2 border-accent-blue/50 bg-accent-blue/5">
                <div className="absolute -top-3 left-4 flex items-center gap-1 bg-accent-blue text-bg-primary text-[9px] font-mono font-bold px-2.5 py-1 rounded-full">
                  <Star size={9}/> #1 GAME PICK
                </div>
                <div className="mt-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <SportBadge sport={GAME_PICKS[0].game.sport} />
                      <div className="text-sm font-bold text-text-primary mt-1">{GAME_PICKS[0].favTeam.shortName} ML</div>
                      <div className="text-[10px] text-text-muted font-mono">vs {GAME_PICKS[0].undTeam.abbreviation}</div>
                    </div>
                    <ConfBadge prob={GAME_PICKS[0].winProb} />
                  </div>
                  <ProbBar prob={GAME_PICKS[0].winProb} />
                  <div className="text-[10px] font-mono text-text-muted">Win prob <span className="text-accent-blue font-semibold">{Math.round(GAME_PICKS[0].winProb * 100)}%</span>{GAME_PICKS[0].favML && <>{" · ML "}<span className="text-text-secondary">{GAME_PICKS[0].favML > 0 ? "+" : ""}{GAME_PICKS[0].favML}</span></>}</div>
                  {GAME_PICKS[0].pred.supportingFactors[0] && (<div className="p-2 bg-bg-secondary rounded text-[9px] text-text-muted leading-relaxed"><span className="text-accent-blue font-semibold">{GAME_PICKS[0].pred.supportingFactors[0].label}:</span>{" "}{GAME_PICKS[0].pred.supportingFactors[0].description}</div>)}
                </div>
              </div>
            </div>
          )}

          <div>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={14} className="text-accent-green" />
              <h2 className="font-display font-bold text-base text-text-primary">Prop Hit Probability Rankings</h2>
              <span className="text-[9px] font-mono text-text-muted bg-bg-secondary px-2 py-0.5 rounded">{PROP_PICKS.length} plays ≥55%</span>
            </div>
            <div className="space-y-2">
              {PROP_PICKS.map((pick, i) => (
                <Link key={pick.prop.id} href={`/player/${pick.prop.player.id}`}>
                  <div className="flex items-center gap-3 p-3 bg-bg-card border border-bg-border rounded-lg hover:border-accent-green/30 transition-colors group">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono font-bold shrink-0 ${i===0?"bg-accent-green text-bg-primary":i===1?"bg-accent-amber/20 text-accent-amber border border-accent-amber/30":i===2?"bg-accent-blue/20 text-accent-blue border border-accent-blue/30":"bg-bg-secondary text-text-muted"}`}>{i+1}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                        <span className="text-sm font-semibold text-text-primary">{pick.prop.player.name}</span>
                        <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${pick.side==="OVER"?"bg-accent-green/15 text-accent-green":"bg-accent-red/15 text-accent-red"}`}>{pick.side}</span>
                        <span className="text-[10px] font-mono text-text-muted">{pick.prop.propType.replace(/_/g,' ').toUpperCase()} {pick.prop.line}</span>
                        <SportBadge sport={pick.prop.player.sport} />
                      </div>
                      <ProbBar prob={pick.hitProb} />
                      {pick.prop.factors[0] && (<div className="text-[9px] text-text-muted mt-1.5 leading-relaxed"><span className="text-text-secondary font-medium">{pick.prop.factors[0].label}:</span>{" "}{pick.prop.factors[0].description}</div>)}
                    </div>
                    <div className="text-right shrink-0 hidden sm:block">
                      <div className="text-[9px] font-mono text-text-muted">PROJ / LINE</div>
                      <div className="text-xs font-mono font-semibold text-text-primary">{pick.prop.projectedValue} / {pick.prop.line}</div>
                      <div className="text-[9px] font-mono text-accent-green">+{pick.prop.edge}% edge</div>
                    </div>
                    <ChevronRight size={14} className="text-text-muted shrink-0 group-hover:text-accent-green transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <Shield size={14} className="text-accent-blue" />
              <h2 className="font-display font-bold text-base text-text-primary">Game Win Probabilities</h2>
              <span className="text-[9px] font-mono text-text-muted bg-bg-secondary px-2 py-0.5 rounded">All {GAME_PICKS.length} games · highest first</span>
            </div>
            <div className="space-y-2">
              {GAME_PICKS.map((pick, i) => (
                <Link key={pick.game.id} href={`/game/${pick.game.id}`}>
                  <div className="p-3 bg-bg-card border border-bg-border rounded-lg hover:border-accent-blue/30 transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-mono font-bold shrink-0 ${i===0?"bg-accent-blue text-bg-primary":i===1?"bg-accent-blue/20 text-accent-blue border border-accent-blue/30":"bg-bg-secondary text-text-muted"}`}>{i+1}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <SportBadge sport={pick.game.sport} />
                          <span className="text-sm font-semibold text-text-primary">{pick.favTeam.shortName} <span className="text-text-muted font-normal text-xs">vs {pick.undTeam.abbreviation}</span></span>
                          <ConfBadge prob={pick.winProb} />
                        </div>
                        <ProbBar prob={pick.winProb} />
                        {pick.pred.supportingFactors[0] && (<div className="text-[9px] text-text-muted mt-1.5 leading-relaxed"><span className="text-text-secondary">{pick.pred.supportingFactors[0].label}:</span>{" "}{pick.pred.supportingFactors[0].description}</div>)}
                      </div>
                      <div className="text-right shrink-0 hidden sm:block">
                        <div className="text-[9px] font-mono text-text-muted">ML / SPREAD</div>
                        <div className="text-xs font-mono font-semibold text-text-primary">{pick.favML?`${pick.favML>0?"+":""}${pick.favML}`:"—"}{" / "}{pick.favSpread?`${pick.favSpread>0?"+":""}${pick.favSpread}`:"—"}</div>
                      </div>
                      <ChevronRight size={14} className="text-text-muted shrink-0 group-hover:text-accent-blue transition-colors" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {TOTAL_PLAYS.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <svg xmlns="http://www.w3.org/2000/svg" width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                <h2 className="font-display font-bold text-base text-text-primary">Total Disagreements</h2>
                <span className="text-[9px] font-mono text-text-muted bg-bg-secondary px-2 py-0.5 rounded">Model ≥2.5 pts off the posted line</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {TOTAL_PLAYS.map(t => (
                  <Link key={t.game.id} href={`/game/${t.game.id}`}>
                    <div className="p-3 bg-bg-card border border-bg-border rounded-lg hover:border-accent-amber/30 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2"><SportBadge sport={t.game.sport} /><span className="text-xs font-semibold text-text-primary">{t.game.awayTeam.abbreviation} @ {t.game.homeTeam.abbreviation}</span></div>
                        <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded ${t.side==="UNDER"?"bg-accent-red/15 text-accent-red border border-accent-red/25":"bg-accent-green/15 text-accent-green border border-accent-green/25"}`}>{t.side} {t.game.lines?.[0]?.total}</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] font-mono">
                        <span className="text-text-muted">Book <span className="text-text-secondary">{t.game.lines?.[0]?.total}</span>{" → "}Model <span className={t.side==="UNDER"?"text-accent-red font-semibold":"text-accent-green font-semibold"}>{t.game.prediction?.projectedTotal?.toFixed(1)}</span></span>
                        <span className={`font-bold text-xs ${t.side==="UNDER"?"text-accent-red":"text-accent-green"}`}>{t.diff > 0 ? "+" : ""}{t.diff.toFixed(1)} pts</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
