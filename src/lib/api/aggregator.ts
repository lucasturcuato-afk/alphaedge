// src/lib/api/aggregator.ts
import type { Game, Prop, NewsItem } from "@/lib/types";
import { fetchOdds, parseBookLines } from "./odds";
import { getTodayGames, getPlayerSeasonAvg, getPlayerRecentStats, parseBDLSeasonAvg, parseBDLTrendData } from "./balldontlie";
import { getTodayMLBSchedule, parseMLBWeather, parseMLBGameStatus, getMLBRecord } from "./mlb";
import { MOCK_GAMES } from "@/lib/mock-data/games";
import { MOCK_NEWS } from "@/lib/mock-data/news";

const HAS_ODDS_KEY = !!process.env.THE_ODDS_API_KEY;
const HAS_BDL_KEY = !!process.env.BALLDONTLIE_API_KEY;

export async function getTodayAllGames(): Promise<Game[]> {
  if (!HAS_ODDS_KEY && !HAS_BDL_KEY) {
    console.log("[Aggregator] No API keys — using mock data");
    return MOCK_GAMES;
  }

  const results: Game[] = [];
  const today = new Date().toISOString().slice(0, 10);

  // ── NBA via BallDontLie ────────────────────────────────────────────────────
  try {
    const bdlGames = HAS_BDL_KEY ? await getTodayGames() : [];
    const nbaOdds = HAS_ODDS_KEY ? await fetchOdds("NBA").catch(() => []) : [];

    for (const game of bdlGames) {
      const oddsEntry = nbaOdds.find(
        (o) =>
          o.home_team.includes(game.home_team.full_name.split(" ").pop()!) ||
          o.away_team.includes(game.visitor_team.full_name.split(" ").pop()!)
      );
      const lines = oddsEntry ? parseBookLines(oddsEntry) : [];

      // Find mock match for prediction/simulation data
      const mockMatch = MOCK_GAMES.find(
        (m) =>
          m.homeTeam.abbreviation === game.home_team.abbreviation ||
          m.homeTeam.name.includes(game.home_team.name.split(" ").pop()!)
      );

      results.push({
        id: `nba-${game.id}`,
        sport: "NBA",
        homeTeam: {
          id: String(game.home_team.id),
          name: game.home_team.full_name,
          shortName: game.home_team.name,
          abbreviation: game.home_team.abbreviation,
          city: game.home_team.city,
          sport: "NBA",
        },
        awayTeam: {
          id: String(game.visitor_team.id),
          name: game.visitor_team.full_name,
          shortName: game.visitor_team.name,
          abbreviation: game.visitor_team.abbreviation,
          city: game.visitor_team.city,
          sport: "NBA",
        },
        gameTime: today + "T19:00:00.000Z",
        status: game.status === "Final" ? "final" : "scheduled",
        lines,
        prediction: mockMatch?.prediction,
        simulation: mockMatch?.simulation,
      });
    }
    console.log(`[Aggregator] NBA: ${bdlGames.length} games from BDL`);
  } catch (e) {
    console.error("[Aggregator] NBA fetch error:", e);
  }

  // ── MLB via MLB StatsAPI ──────────────────────────────────────────────────
  try {
    const mlbGames = await getTodayMLBSchedule();
    const mlbOdds = HAS_ODDS_KEY ? await fetchOdds("MLB").catch(() => []) : [];

    for (const game of mlbGames) {
      const oddsEntry = mlbOdds.find(
        (o) =>
          o.home_team.includes(game.teams.home.team.name.split(" ").pop()!) ||
          o.away_team.includes(game.teams.away.team.name.split(" ").pop()!)
      );
      const lines = oddsEntry ? parseBookLines(oddsEntry) : [];

      const mockMatch = MOCK_GAMES.find(
        (m) =>
          m.homeTeam.name.includes(game.teams.home.team.name.split(" ").pop()!) ||
          m.awayTeam.name.includes(game.teams.away.team.name.split(" ").pop()!)
      );

      results.push({
        id: `mlb-${game.gamePk}`,
        sport: "MLB",
        homeTeam: {
          id: String(game.teams.home.team.id),
          name: game.teams.home.team.name,
          shortName: game.teams.home.team.name.split(" ").pop()!,
          abbreviation: game.teams.home.team.name.substring(0, 3).toUpperCase(),
          city: game.teams.home.team.name.split(" ").slice(0, -1).join(" "),
          sport: "MLB",
          record: getMLBRecord(game.teams.home),
        },
        awayTeam: {
          id: String(game.teams.away.team.id),
          name: game.teams.away.team.name,
          shortName: game.teams.away.team.name.split(" ").pop()!,
          abbreviation: game.teams.away.team.name.substring(0, 3).toUpperCase(),
          city: game.teams.away.team.name.split(" ").slice(0, -1).join(" "),
          sport: "MLB",
          record: getMLBRecord(game.teams.away),
        },
        gameTime: game.gameDate,
        status: parseMLBGameStatus(game.status.abstractGameState),
        venue: game.venue.name,
        weather: parseMLBWeather(game),
        lines,
        prediction: mockMatch?.prediction,
        simulation: mockMatch?.simulation,
      });
    }
    console.log(`[Aggregator] MLB: ${mlbGames.length} games from StatsAPI`);
  } catch (e) {
    console.error("[Aggregator] MLB fetch error:", e);
  }

  // ── Merge mock NCAA + remaining mock games not covered by live ────────────
  const mockNCAA = MOCK_GAMES.filter((g) => g.sport === "NCAAMB").map((g) => ({
    ...g,
    gameTime: today + g.gameTime.slice(10),
    prediction: g.prediction ? { ...g.prediction, createdAt: new Date().toISOString() } : undefined,
  }));
  results.push(...mockNCAA);

  if (results.length === 0) {
    console.log("[Aggregator] No live results — full mock fallback");
    return MOCK_GAMES.map((g) => ({ ...g, gameTime: today + g.gameTime.slice(10) }));
  }

  console.log(`[Aggregator] Total: ${results.length} games`);
  return results;
}

export async function enrichPlayerData(bdlPlayerId: number) {
  if (!HAS_BDL_KEY) return null;
  const [seasonAvg, recentStats] = await Promise.all([
    getPlayerSeasonAvg(bdlPlayerId),
    getPlayerRecentStats(bdlPlayerId, 10),
  ]);
  return {
    seasonAverages: seasonAvg ? parseBDLSeasonAvg(seasonAvg) : null,
    trends: recentStats.length ? parseBDLTrendData(recentStats) : null,
  };
}

export async function getSocialNews(
  _entityName: string,
  sport: "NBA" | "NCAAMB" | "MLB",
  limit: number = 8
): Promise<NewsItem[]> {
  const today = new Date().toISOString().slice(0, 10);
  return MOCK_NEWS
    .filter((n) => n.sport === sport)
    .slice(0, limit)
    .map((n) => ({ ...n, publishedAt: today + n.publishedAt.slice(10) }));
}

export async function getPlayerSentiment(_playerName: string, _sport: string) {
  return null;
}

export async function refreshLinesOnly(
  _sport: "NBA" | "NCAAMB" | "MLB"
): Promise<Record<string, unknown>> {
  return {};
}
