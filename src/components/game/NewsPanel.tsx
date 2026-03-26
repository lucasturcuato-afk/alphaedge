// src/components/game/NewsPanel.tsx
import type { NewsItem } from "@/lib/types";
import { sentimentColor, cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { AlertTriangle, TrendingUp, TrendingDown, Eye, Zap } from "lucide-react";

interface NewsPanelProps {
  news: NewsItem[];
  title?: string;
}

const SIGNAL_ICONS: Record<string, LucideIcon> = {
  injury_concern: AlertTriangle,
  positive: TrendingUp,
  negative: TrendingDown,
  contrarian: Eye,
  public_hype: Zap,
  neutral: Zap,
  mixed: Zap,
  usage_up: TrendingUp,
  usage_down: TrendingDown,
};

const SENTIMENT_LABELS: Record<string, string> = {
  positive: "BULLISH",
  negative: "BEARISH",
  neutral: "NEUTRAL",
  mixed: "MIXED",
  injury_concern: "INJURY",
  contrarian: "CONTRARIAN",
  public_hype: "HYPE",
  usage_up: "USAGE ▲",
  usage_down: "USAGE ▼",
};

function NewsCard({ item }: { item: NewsItem }) {
  const color = sentimentColor(item.sentiment);
  const Icon = SIGNAL_ICONS[item.sentiment] ?? Zap;
  const label = SENTIMENT_LABELS[item.sentiment] ?? item.sentiment.toUpperCase();

  return (
    <div className="p-3 bg-bg-secondary rounded-md border border-bg-border hover:border-bg-hover transition-colors group">
      {/* Tag row */}
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span
          className="inline-flex items-center gap-1 text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded border"
          style={{
            color,
            background: `${color}12`,
            borderColor: `${color}30`,
          }}
        >
          <Icon size={8} className="" />
          {label}
        </span>
        {item.tags.slice(0, 2).map((tag) => (
          <span
            key={tag}
            className="text-[9px] font-mono text-text-muted bg-bg-border px-1.5 py-0.5 rounded"
          >
            {tag}
          </span>
        ))}
        <span className="ml-auto text-[9px] text-text-muted font-mono">
          {formatDate(item.publishedAt)}
        </span>
      </div>

      {/* Headline */}
      <p className="text-xs font-semibold text-text-primary mb-1 group-hover:text-accent-green/90 transition-colors leading-snug">
        {item.headline}
      </p>

      {/* Summary */}
      <p className="text-[10px] text-text-secondary leading-relaxed line-clamp-2">
        {item.summary}
      </p>

      {/* Source + signals */}
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[9px] text-text-muted font-mono">
          {item.source}
        </span>
        <div className="flex items-center gap-2">
          {item.signals.injuryFlag && (
            <span className="text-[9px] font-mono text-accent-red">⚠ INJURY</span>
          )}
          {item.signals.momentumFlag && (
            <span className="text-[9px] font-mono text-accent-green">↑ MOMENTUM</span>
          )}
          {item.signals.publicHype && (
            <span className="text-[9px] font-mono text-accent-amber">★ HYPE</span>
          )}
        </div>
      </div>
    </div>
  );
}

export function NewsPanel({ news, title = "News & Intelligence" }: NewsPanelProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-mono font-semibold text-text-secondary uppercase tracking-wider">
          {title}
        </h3>
        <span className="text-[9px] font-mono text-text-muted bg-bg-border px-1.5 py-0.5 rounded">
          {news.length} items
        </span>
      </div>
      <div className="space-y-2">
        {news.map((item) => (
          <NewsCard key={item.id} item={item} />
        ))}
        {news.length === 0 && (
          <div className="text-center py-6 text-text-muted text-xs font-mono">
            No news items found
          </div>
        )}
      </div>
    </div>
  );
}
