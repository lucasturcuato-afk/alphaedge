// src/lib/api/aggregator.ts
// Live NBA via BallDontLie + enriched mock predictions matched by team name.
// MLB/NCAA from mock with today's date. No ./odds or ./mlb dependencies.

import type { Game, Prop, NewsItem } from "@/lib/types";
import { getTodayGames } from "./balldontlie";
import { MOCK_GAMES } from "@/lib/mock-data/games";
import { MOCK_NEWS } from "@/lib/mock-data/news";

const HAS_BDL_KEY = !!process.env.BALLDONTLIE_API_KEY;

// Normalize team name for fuzzy matching
function normalize(s: string) {
  return s.toLowerCase().replace(/[^a-z]/g, "");
}

// Find mock game that best matches a live BDL game by team names
function findMockMatch(
  homeAbbr: string,
  homeName: string,
  awayAbbr: string,
  awayName: string
) {
  const homeNorm = normalize(homeName.split(" ").pop() ?? homeName);
  const awayNorm = normalize(awayName.split(" ").pop() ?? awayName);

  return MOCK_GAMES.find((m) => {
    if (m.sport !== "NBA") return false;
    const mHomeNorm = normalize(m.homeTeam.name.split(" ").pop() ?? m.homeTeam.name);
    const mAwayNorm = normalize(m.awayTeam.name.split(" ").pop() ?? m.awayTeam.name);
    // Match either by abbreviation or by last word of team name
    return (
      (m.homeTeam.abbreviation === homeAbbr || mHomeNorm === homeNorm) &&
      (m.awayTeam.abbreviation === awayAbbr || mAwayNorm === awayNorm)
    );
  });
}

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

  // Fetch live NBA games
  let bdlGames: Awaited<ReturnType<typeof getTodayGames>> = [];
  try {
    bdlGames = await getTodayGames();
    console.log(`[Aggregator] BDL: ${bdlGames.length} NBA games for ${today}`);
  } catch (e) {
    console.error("[Aggregator] BDL error:", e);
  }

  if (bdlGames.length === 0) {
    console.log("[Aggregator] 0 BDL games — full mock fallback");
    return mockWithToday;
  }

  // Build live NBA games, merging mock predictions by team name match
  const liveNBA: Game[] = bdlGames.map((g) => {
    const mockMatch = findMockMatch(
      g.home_team.abbreviation,
      g.home_team.full_name,
      g.visitor_team.abbreviation,
      g.visitor_team.full_name
    );

    // Build a dynamic prediction if no mock match found
    const prediction = mockMatch?.prediction
      ? { ...mockMatch.prediction, createdAt: new Date().toISOString() }
      : {
          id: `pred-nba-${g.id}`,
          gameId: `nba-${g.id}`,
          modelVersion: "v2.1",
          predictedWinner: g.home_team.abbreviation.toLowerCase(),
          winProbHome: 0.55,
          winProbAway: 0.45,
          projectedTotal: 226.5,
          projectedSpread: -3.5,
          confidenceScore: 55,
          fairOddsHome: -122,
          fairOddsAway: 102,
          edgeHome: 2.1,
          edgeAway: -1.8,
          supportingFactors: [
            {
              label: "Home Court Advantage",
              impact: "medium" as const,
              direction: "positive" as const,
              value: g.home_team.city,
              description: `${g.home_team.full_name} playing at home`,
            },
          ],
          riskFactors: [],
          reasoning: `${g.home_team.full_name} host ${g.visitor_team.full_name}. Model gives home team a 55% edge.`,
          createdAt: new Date().toISOString(),
        };

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
      status: (g.status === "Final" ? "final" : "scheduled") as
        | "final"
        | "scheduled"
        | "live",
      lines: mockMatch?.lines ?? [],
      prediction,
      simulation: mockMatch?.simulation,
    };
  });

  // Keep mock MLB + NCAA with today's date
  const mockNonNBA = mockWithToday.filter((g) => g.sport !== "NBA");

  const all = [...liveNBA, ...mockNonNBA];
  console.log(`[Aggregator] Total: ${all.length} games (${liveNBA.length} live NBA + ${mockNonNBA.length} mock)`);
  return all;
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
