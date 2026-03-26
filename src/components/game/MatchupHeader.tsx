// src/components/game/MatchupHeader.tsx
import type { Game } from "@/lib/types";
import { formatGameTime, formatDate, formatOdds, formatSpread, cn } from "@/lib/utils";
import { SportBadge } from "@/components/ui/Badge";
import { MapPin, Clock, Wind, Thermometer } from "lucide-react";

interface MatchupHeaderProps {
  game: Game;
}

function TeamSide({
  team,
  record,
  winProb,
  isHome,
}: {
  team: { abbreviation: string; name: string; shortName: string };
  record?: string;
  winProb: number;
  isHome: boolean;
}) {
  const pct = Math.round(winProb * 100);
  return (
    <div
      className={cn(
        "flex flex-col gap-2",
        isHome ? "items-end text-right" : "items-start text-left"
      )}
    >
      <div className="text-[10px] font-mono text-text-muted">
        {isHome ? "HOME" : "AWAY"}
      </div>
      <div className="font-display font-extrabold text-4xl text-text-primary">
        {team.abbreviation}
      </div>
      <div className="text-sm text-text-secondary font-medium">{team.name}</div>
      {record && (
        <div className="text-[10px] font-mono text-text-muted">{record}</div>
      )}
      <div
        className="text-2xl font-mono font-bold"
        style={{ color: pct > 50 ? "#00FF87" : "#7B8FA6" }}
      >
        {pct}%
        <span className="text-[10px] text-text-muted ml-1 font-normal">
          win prob
        </span>
      </div>
    </div>
  );
}

export function MatchupHeader({ game }: MatchupHeaderProps) {
  const pred = game.prediction;
  const line = game.lines?.[0];

  return (
    <div className="bg-bg-card border border-bg-border rounded-xl p-5 mb-6">
      {/* Top meta */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <SportBadge sport={game.sport} />
        <div className="flex items-center gap-1.5 text-[10px] text-text-muted font-mono">
          <Clock size={10} />
          {formatDate(game.gameTime)} · {formatGameTime(game.gameTime)}
        </div>
        {game.venue && (
          <div className="flex items-center gap-1 text-[10px] text-text-muted font-mono">
            <MapPin size={10} />
            {game.venue}
          </div>
        )}
        {game.weather && (
          <div className="flex items-center gap-2 text-[10px] text-text-muted font-mono ml-auto">
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
      </div>

      {/* Teams */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          {pred && (
            <TeamSide
              team={game.awayTeam}
              record={game.awayTeam.record}
              winProb={pred.winProbAway}
              isHome={false}
            />
          )}
        </div>

        {/* Center divider with lines */}
        <div className="flex flex-col items-center gap-2 shrink-0">
          <div className="text-text-muted font-mono text-lg font-bold">@</div>
          {line && (
            <div className="flex flex-col gap-1.5 bg-bg-secondary border border-bg-border rounded-lg p-3 min-w-[120px]">
              <div className="text-center">
                <div className="text-[8px] text-text-muted font-mono">SPREAD</div>
                <div className="text-sm font-mono font-bold text-text-primary">
                  {formatSpread(line.homeSpread)}
                </div>
              </div>
              <div className="text-center border-t border-bg-border pt-1.5">
                <div className="text-[8px] text-text-muted font-mono">TOTAL</div>
                <div className="text-sm font-mono font-bold text-text-primary">
                  {line.total}
                </div>
              </div>
              <div className="text-center border-t border-bg-border pt-1.5">
                <div className="text-[8px] text-text-muted font-mono">ML</div>
                <div className="text-xs font-mono text-text-secondary">
                  {formatOdds(line.awayML)} / {formatOdds(line.homeML)}
                </div>
              </div>
            </div>
          )}
          {pred && (
            <div className="flex flex-col gap-1 min-w-[120px]">
              <div className="bg-accent-blue/10 border border-accent-blue/20 rounded p-2 text-center">
                <div className="text-[8px] text-accent-blue font-mono">MODEL PROJ</div>
                <div className="text-xs font-mono font-bold text-accent-blue">
                  {formatSpread(pred.projectedSpread)} / {pred.projectedTotal.toFixed(1)}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1">
          {pred && (
            <TeamSide
              team={game.homeTeam}
              record={game.homeTeam.record}
              winProb={pred.winProbHome}
              isHome={true}
            />
          )}
        </div>
      </div>

      {/* Confidence bar */}
      {pred && (
        <div className="mt-4 pt-4 border-t border-bg-border">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-mono text-text-muted">
              MODEL CONFIDENCE
            </span>
            <span
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
              {pred.confidenceScore}/100
            </span>
          </div>
          <div className="h-1.5 bg-bg-border rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${pred.confidenceScore}%`,
                background:
                  pred.confidenceScore >= 75
                    ? "linear-gradient(90deg, #00FF8780, #00FF87)"
                    : pred.confidenceScore >= 60
                    ? "linear-gradient(90deg, #F59E0B80, #F59E0B)"
                    : "linear-gradient(90deg, #FF3B5C80, #FF3B5C)",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
