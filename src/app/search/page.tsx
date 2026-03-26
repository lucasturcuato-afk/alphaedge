// src/app/search/page.tsx
"use client";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo } from "react";
import Link from "next/link";
import { MOCK_PLAYERS } from "@/lib/mock-data/players";
import { MOCK_GAMES } from "@/lib/mock-data/games";
import { MOCK_PROPS } from "@/lib/mock-data/props";
import { SportBadge, StatusBadge } from "@/components/ui/Badge";
import { EdgeBar } from "@/components/ui/EdgeBar";
import { formatGameTime } from "@/lib/utils";
import { Search, User, Activity, Target } from "lucide-react";

function SearchResults() {
  const params = useSearchParams();
  const q = params.get("q")?.toLowerCase() ?? "";

  const results = useMemo(() => {
    if (!q) return { players: [], games: [], props: [] };

    const players = MOCK_PLAYERS.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.team.name.toLowerCase().includes(q) ||
        p.team.abbreviation.toLowerCase().includes(q)
    );

    const games = MOCK_GAMES.filter(
      (g) =>
        g.homeTeam.name.toLowerCase().includes(q) ||
        g.awayTeam.name.toLowerCase().includes(q) ||
        g.homeTeam.abbreviation.toLowerCase().includes(q) ||
        g.awayTeam.abbreviation.toLowerCase().includes(q)
    );

    const props = MOCK_PROPS.filter(
      (p) =>
        p.player.name.toLowerCase().includes(q) ||
        p.propType.toLowerCase().includes(q) ||
        p.player.team.name.toLowerCase().includes(q)
    );

    return { players, games, props };
  }, [q]);

  const total = results.players.length + results.games.length + results.props.length;

  if (!q) {
    return (
      <div className="text-center py-16">
        <Search size={32} className="text-text-muted mx-auto mb-3" />
        <p className="text-text-muted text-sm">
          Search for players, teams, games, or props
        </p>
        <p className="text-text-muted text-xs mt-1 font-mono">
          Try: "LeBron points", "Knicks vs Celtics", "MLB best bets"
        </p>
      </div>
    );
  }

  if (total === 0) {
    return (
      <div className="text-center py-16">
        <Search size={32} className="text-text-muted mx-auto mb-3" />
        <p className="text-text-muted text-sm">No results found for "{q}"</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-xs text-text-muted font-mono">
        {total} results for "{q}"
      </p>

      {/* Players */}
      {results.players.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <User size={13} className="text-text-muted" />
            <h2 className="text-[10px] font-mono text-text-muted uppercase tracking-wider">
              Players ({results.players.length})
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {results.players.map((player) => (
              <Link key={player.id} href={`/player/${player.id}`}>
                <div className="card card-hover p-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-bg-secondary border border-bg-border flex items-center justify-center shrink-0">
                    <span className="font-mono text-xs text-text-muted font-bold">
                      {player.name.split(" ").map((n) => n[0]).join("")}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <SportBadge sport={player.sport} />
                      <StatusBadge status={player.status} />
                    </div>
                    <div className="font-semibold text-sm text-text-primary truncate">
                      {player.name}
                    </div>
                    <div className="text-[10px] text-text-muted">
                      {player.team.abbreviation} · {player.position}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Games */}
      {results.games.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Activity size={13} className="text-text-muted" />
            <h2 className="text-[10px] font-mono text-text-muted uppercase tracking-wider">
              Games ({results.games.length})
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {results.games.map((game) => (
              <Link key={game.id} href={`/game/${game.id}`}>
                <div className="card card-hover p-3">
                  <div className="flex items-center justify-between mb-2">
                    <SportBadge sport={game.sport} />
                    <span className="text-[10px] font-mono text-text-muted">
                      {formatGameTime(game.gameTime)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-display font-bold text-sm text-text-primary">
                      {game.awayTeam.abbreviation}
                    </span>
                    <span className="text-text-muted text-xs font-mono">@</span>
                    <span className="font-display font-bold text-sm text-text-primary">
                      {game.homeTeam.abbreviation}
                    </span>
                    {game.prediction && (
                      <span className="ml-auto text-[10px] font-mono text-accent-blue">
                        Conf: {game.prediction.confidenceScore}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Props */}
      {results.props.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Target size={13} className="text-text-muted" />
            <h2 className="text-[10px] font-mono text-text-muted uppercase tracking-wider">
              Props ({results.props.length})
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {results.props.map((prop) => (
              <Link key={prop.id} href={`/player/${prop.player.id}`}>
                <div className="card card-hover p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <SportBadge sport={prop.player.sport} />
                      <span className="text-[10px] font-mono text-text-muted">
                        {prop.propType.replace(/_/g, " ")}
                      </span>
                    </div>
                    <span
                      className={`text-xs font-mono font-bold ${
                        prop.overProbability > 0.5 ? "text-accent-green" : "text-accent-red"
                      }`}
                    >
                      {prop.overProbability > 0.5 ? "OVER" : "UNDER"}{" "}
                      {prop.line}
                    </span>
                  </div>
                  <div className="font-semibold text-sm text-text-primary mb-1">
                    {prop.player.name}
                  </div>
                  <EdgeBar edge={prop.edge} showGrade />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="font-display font-bold text-xl text-text-primary mb-1">
          Search
        </h1>
        <p className="text-xs text-text-muted">
          Players, teams, games, and props
        </p>
      </div>
      <Suspense fallback={<div className="text-text-muted text-xs font-mono">Searching...</div>}>
        <SearchResults />
      </Suspense>
    </div>
  );
}
