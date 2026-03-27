// src/lib/api/aggregator.ts
// Uses BallDontLie for live NBA games + mock data for MLB/NCAA with dynamic dates.
// No dependency on ./odds or ./mlb modules.

import type { Game, Prop, NewsItem } from "@/lib/types";
import { getTodayGames } from "./balldontlie";
import { MOCK_GAMES } from "@/lib/mock-data/games";
import { MOCK_NEWS } from "@/lib/mock-data/news";

const HAS_BDL_KEY = !!process.env.BALLDONTLIE_API_KEY;

export async function getTodayAllGames(): Promise<Game[]> {
  const today = new Date().toISOString().slice(0, 10);

  // Stamp today's date on all mock games
  const mockWithToday = MOCK_GAMES.map((g) => ({
    ...g,
    gameTime: today + g.gameTime.slice(10),
    prediction: g.prediction
      ? { ...g.prediction, createdAt: new Date().toISOString() }
      : undefined,
  }));

  if (!HAS_BDL_KEY) {
    console.log("[Aggregator] No BDL key — using mock data with today's date");
    return mockWithToday;
  }

  // Fetch live NBA games from BallDontLie
  let bdlGames: Awaited<ReturnType<typeof getTodayGames>> = [];
  try {
    bdlGames = await getTodayGames();
    console.log(`[Aggregator] BDL returned ${bdlGames.length} NBA games for ${today}`);
  } catch (e) {
    console.error("[Aggregator] BDL error:", e);
  }

  if (bdlGames.length === 0) {
    console.log("[Aggregator] No live NBA games — using full mock data with today's date");
    return mockWithToday;
  }

  // Convert BDL games → Game type, merging mock predictions where possible
  const liveNBA: Game[] = bdlGames.map((g) => {
    // Try to find a mock game with matching teams for rich prediction data
    const mockMatch = MOCK_GAMES.find(
      (m) =>
        m.sport === "NBA" &&
        (m.homeTeam.abbreviation === g.home_team.abbreviation ||
          m.homeTeam.name.split(" ").pop() === g.home_team.name.split(" ").pop())
    );

    return {
      id: `nba-${g.id}`,
      sport: "NBA" as const,
      homeTeam: {
        id: String(g.home_team.id),
        name: g.home_team.full_name,
        shortName: g.home_team.name,
        abbreviation: g.home_team.abbreviation,
        city: g.home_team.city,
        sport: "NBA" as const,
      },
      awayTeam: {
        id: String(g.visitor_team.id),
        name: g.visitor_team.full_name,
        shortName: g.visitor_team.name,
        abbreviation: g.visitor_team.abbreviation,
        city: g.visitor_team.city,
        sport: "NBA" as const,
      },
      gameTime: today + "T19:00:00.000Z",
      status: (g.status === "Final" ? "final" : "scheduled") as "final" | "scheduled" | "live",
      lines: mockMatch?.lines ?? [],
      prediction: mockMatch?.prediction
        ? { ...mockMatch.prediction, createdAt: new Date().toISOString() }
        : undefined,
      simulation: mockMatch?.simulation,
    };
  });

  // Keep mock MLB + NCAA games (with today's date), replace NBA with live
  const mockNonNBA = mockWithToday.filter((g) => g.sport !== "NBA");

  return [...liveNBA, ...mockNonNBA];
}

export async function getSocialNews(
  _entityName: string,
  sport: "NBA" | "NCAAMB" | "MLB",
  limit: number = 8
): Promise<NewsItem[]> {
  const today = new Date().toISOString().slice(0, 10);
  return MOCK_NEWS.filter((n) => n.sport === sport)
    .slice(0, limit)
    .map((n) => ({ ...n, publishedAt: today + n.publishedAt.slice(10) }));
}

export async function enrichPlayerData(_bdlPlayerId: number) {
  return null;
}

export async function getPlayerSentiment(_playerName: string, _sport: string) {
  return null;
}

export async function refreshLinesOnly(
  _sport: "NBA" | "NCAAMB" | "MLB"
): Promise<Record<string, unknown>> {
  return {};
}
