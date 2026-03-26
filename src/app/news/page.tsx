"use client";
import { MOCK_NEWS } from "@/lib/mock-data/news";
import { MOCK_GAMES } from "@/lib/mock-data/games";
import { SportBadge } from "@/components/ui/Badge";
import Link from "next/link";
import { Newspaper, AlertTriangle, TrendingUp, Zap, Clock, ExternalLink } from "lucide-react";

const SENTIMENT_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  positive: { label: "BULLISH", color: "#00FF87", bg: "bg-accent-green/10 border-accent-green/20" },
  negative: { label: "BEARISH", color: "#FF4444", bg: "bg-accent-red/10 border-accent-red/20" },
  injury_concern: { label: "INJURY", color: "#F59E0B", bg: "bg-accent-amber/10 border-accent-amber/20" },
  neutral: { label: "NEUTRAL", color: "#94A3B8", bg: "bg-bg-secondary border-bg-border" },
  public_hype: { label: "HYPE", color: "#A78BFA", bg: "bg-purple-400/10 border-purple-400/20" },
};

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 60) return `${diff}m ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
  return `${Math.floor(diff / 1440)}d ago`;
}

// Which games are affected by each news item
function getAffectedGame(tags: string[]) {
  return MOCK_GAMES.find(g =>
    tags.some(t =>
      g.homeTeam.name.includes(t) || g.awayTeam.name.includes(t) ||
      g.homeTeam.city.includes(t) || g.awayTeam.city.includes(t)
    )
  );
}

export default function NewsFeedPage() {
  const injuries = MOCK_NEWS.filter(n => n.signals.injuryFlag);
  const trending = MOCK_NEWS.filter(n => n.signals.momentumFlag && !n.signals.injuryFlag);
  const all = MOCK_NEWS;

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-accent-blue/10 border border-accent-blue/20 flex items-center justify-center">
              <Newspaper size={16} className="text-accent-blue" />
            </div>
            <h1 className="font-display font-bold text-xl text-text-primary">News Feed</h1>
          </div>
          <p className="text-xs text-text-muted ml-10">
            Injury reports, line moves, and intel that affects today's model
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-accent-green/10 border border-accent-green/20 rounded-lg">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-green live-indicator" />
          <span className="text-[10px] font-mono text-accent-green">LIVE · just now</span>
        </div>
      </div>

      {/* Injury alerts */}
      {injuries.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle size={13} className="text-accent-amber" />
            <span className="text-xs font-mono font-semibold text-accent-amber uppercase tracking-wide">Injury Alerts — Affects Model</span>
          </div>
          {injuries.map(item => {
            const cfg = SENTIMENT_CONFIG[item.sentiment] ?? SENTIMENT_CONFIG.neutral;
            const game = getAffectedGame(item.tags);
            return (
              <div key={item.id} className={`p-4 bg-bg-card border rounded-xl ${cfg.bg}`}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <SportBadge sport={item.sport} />
                    <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border ${cfg.bg}`} style={{ color: cfg.color }}>
                      {cfg.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-mono text-text-muted shrink-0">
                    <Clock size={9} />
                    {timeAgo(item.publishedAt)}
                  </div>
                </div>
                <p className="text-sm font-semibold text-text-primary mb-1.5 leading-snug">{item.headline}</p>
                <p className="text-[11px] text-text-muted leading-relaxed mb-2">{item.summary}</p>
                <div className="flex items-center justify-between">
                  <div className="flex gap-1.5 flex-wrap">
                    {item.tags.map(t => (
                      <span key={t} className="text-[9px] font-mono px-1.5 py-0.5 bg-bg-secondary rounded text-text-muted">{t}</span>
                    ))}
                  </div>
                  {game && (
                    <Link href={`/game/${game.id}`} className="text-[10px] font-mono text-accent-blue hover:underline flex items-center gap-1">
                      View Game <ExternalLink size={9} />
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Trending */}
      {trending.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <TrendingUp size={13} className="text-accent-green" />
            <span className="text-xs font-mono font-semibold text-accent-green uppercase tracking-wide">Momentum Signals</span>
          </div>
          {trending.map(item => {
            const cfg = SENTIMENT_CONFIG[item.sentiment] ?? SENTIMENT_CONFIG.neutral;
            const game = getAffectedGame(item.tags);
            return (
              <div key={item.id} className="p-4 bg-bg-card border border-bg-border rounded-xl hover:border-accent-green/20 transition-colors">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <SportBadge sport={item.sport} />
                    <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border ${cfg.bg}`} style={{ color: cfg.color }}>
                      {cfg.label}
                    </span>
                    <span className="text-[10px] font-mono text-text-muted">{item.source}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-mono text-text-muted shrink-0">
                    <Clock size={9} />
                    {timeAgo(item.publishedAt)}
                  </div>
                </div>
                <p className="text-sm font-semibold text-text-primary mb-1.5 leading-snug">{item.headline}</p>
                <p className="text-[11px] text-text-muted leading-relaxed mb-2">{item.summary}</p>
                <div className="flex items-center justify-between">
                  <div className="flex gap-1.5 flex-wrap">
                    {item.tags.map(t => (
                      <span key={t} className="text-[9px] font-mono px-1.5 py-0.5 bg-bg-secondary rounded text-text-muted">{t}</span>
                    ))}
                  </div>
                  {game && (
                    <Link href={`/game/${game.id}`} className="text-[10px] font-mono text-accent-blue hover:underline flex items-center gap-1">
                      View Game <ExternalLink size={9} />
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* All news */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Zap size={13} className="text-text-muted" />
          <span className="text-xs font-mono font-semibold text-text-muted uppercase tracking-wide">All Intel Today</span>
          <span className="text-[9px] font-mono text-text-muted bg-bg-secondary px-2 py-0.5 rounded">{all.length} items</span>
        </div>
        <div className="space-y-1.5">
          {all.map(item => {
            const cfg = SENTIMENT_CONFIG[item.sentiment] ?? SENTIMENT_CONFIG.neutral;
            return (
              <div key={item.id} className="flex items-start gap-3 p-3 bg-bg-card border border-bg-border rounded-lg hover:border-bg-border/80 transition-colors">
                <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border whitespace-nowrap mt-0.5 ${cfg.bg}`} style={{ color: cfg.color }}>
                  {cfg.label}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-text-primary leading-snug">{item.headline}</p>
                  <p className="text-[10px] text-text-muted mt-0.5">{item.source} · {timeAgo(item.publishedAt)}</p>
                </div>
                <SportBadge sport={item.sport} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
