// src/lib/api/aggregator.ts
/**
 * Data Aggregator
 * Combines odds, stats, MLB, and social data into unified Game/Player objects.
 * Falls back to mock data when API keys aren't set.
 *
 * This is the single import point for all API data in API routes.
 */

import type { Game, Prop, NewsItem } from "@/lib/types";
import { fetchOdds, parseBookLines, SPORT_KEYS } from "./odds";
import { getTodayGames, getPlayerSeasonAvg, getPlayerRecentStats, parseBDLSeasonAvg, parseBDLTrendData, parseBDLPlayer } from "./balldontlie";
import { getTodayMLBSchedule, parseMLBWeather, parseMLBGameStatus, getMLBRecord } from "./mlb";
import { searchReddit, getRedditSentiment } from "./reddit";
import { MOCK_GAMES } from "@/lib/mock-data/games";
import { MOCK_NEWS } from "@/lib/mock-data/news";

const HAS_ODDS_KEY = !!process.env.THE_ODDS_API_KEY;
const HAS_BDL_KEY = !!process.env.BALLDONTLIE_API_KEY;

// ── Games ─────────────────────────────────────────────────────────────────────

/**
 * Get today's games for all supported sports.
 * Uses real APIs when keys are present, falls back to mock data.
 */
export async function getTodayAllGames(): Promise<Game[]> {
  if (!HAS_ODDS_KEY && !HAS_BDL_KEY) {
    console.log("[Aggregator] No API keys — using mock data");
    return MOCK_GAMES;
  }

  const results: Game[] = [];

  // ── NBA games ──────────────────────────────────────────────────────────────
  try {
    const [bdlGames, nbaOdds] = await Promise.all([
      HAS_BDL_KEY ? getTodayGames() : Promise.resolve([]),
      HAS_ODDS_KEY ? fetchOdds("NBA") : Promise.resolve([]),
    ]);

    for (const game of bdlGames) {
      // Find matching odds entry by team name
      const oddsEntry = nbaOdds.find(
        (o) =>
          o.home_team.includes(game.home_team.full_name.split(" ").pop()!) ||
          o.away_team.includes(game.visitor_team.full_name.split(" ").pop()!)
      );

      const lines = oddsEntry ? parseBookLines(oddsEntry) : [];

      const g: Game = {
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
        gameTime: game.date,
        status: game.status === "Final" ? "final" : "scheduled",
        lines,
      };

      results.push(g);
    }
  } catch (e) {
    console.error("[Aggregator] NBA fetch error:", e);
    // Don't add mock games — let MLB results show through
  }

  // ── MLB games ──────────────────────────────────────────────────────────────
  try {
    const [mlbGames, mlbOdds] = await Promise.all([
      getTodayMLBSchedule(),
      HAS_ODDS_KEY ? fetchOdds("MLB") : Promise.resolve([]),
    ]);

    for (const game of mlbGames) {
      const oddsEntry = mlbOdds.find(
        (o) =>
          o.home_team.includes(game.teams.home.team.name.split(" ").pop()!) ||
          o.away_team.includes(game.teams.away.team.name.split(" ").pop()!)
      );

      const lines = oddsEntry ? parseBookLines(oddsEntry) : [];
      const weather = parseMLBWeather(game);
      const status = parseMLBGameStatus(game.status.abstractGameState);

      const g: Game = {
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
        status,
        venue: game.venue.name,
        weather,
        lines,
      };

      results.push(g);
    }
  } catch (e) {
    console.error("[Aggregator] MLB fetch error:", e);
    // Don't add mock games — let NBA results show through
  }

  // If we got no results at all, fall back to mock
  if (results.length === 0) {
    console.log("[Aggregator] No live results — using mock data");
    return MOCK_GAMES;
  }

  return results;
}

// ── Player data ───────────────────────────────────────────────────────────────

/**
 * Enrich a player with live season averages and recent trends.
 */
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

// ── News & Social ─────────────────────────────────────────────────────────────

/**
 * Get social news for a player/team.
 * Pulls from Reddit with NLP signal extraction.
 */
export async function getSocialNews(
  entityName: string,
  sport: "NBA" | "NCAAMB" | "MLB",
  limit: number = 8
): Promise<NewsItem[]> {
  try {
    const items = await searchReddit(
      entityName,
      sport === "NBA"
        ? ["nba", "sportsbook"]
        : sport === "NCAAMB"
        ? ["collegebasketball", "sportsbook"]
        : ["baseball", "sportsbook"],
      limit
    );

    // Add sport tag to all items
    return items.map((item) => ({ ...item, sport }));
  } catch {
    // Fall back to mock news
    return MOCK_NEWS.filter((n) => n.sport === sport).slice(0, limit);
  }
}

/**
 * Get aggregated sentiment for a player.
 */
export async function getPlayerSentiment(
  playerName: string,
  sport: "NBA" | "NCAAMB" | "MLB"
) {
  return getRedditSentiment(playerName, sport);
}

// ── Odds-only refresh ─────────────────────────────────────────────────────────

/**
 * Refresh just the lines for existing games (cheaper API call).
 * Call this on a 5-minute interval instead of full game refresh.
 */
export async function refreshLinesOnly(
  sport: "NBA" | "NCAAMB" | "MLB"
): Promise<Record<string, ReturnType<typeof parseBookLines>>> {
  if (!HAS_ODDS_KEY) return {};

  try {
    const odds = await fetchOdds(sport, ["h2h", "spreads", "totals"]);
    const result: Record<string, ReturnType<typeof parseBookLines>> = {};
    for (const game of odds) {
      result[game.id] = parseBookLines(game);
    }
    return result;
  } catch {
    return {};
  }
}
