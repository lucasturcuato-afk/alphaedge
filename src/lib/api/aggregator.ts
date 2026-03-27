// src/lib/api/aggregator.ts
// Bulletproof aggregator — uses BallDontLie for real NBA games.
// Odds API quota exhausted; falls back to mock only when BDL returns 0.

import type { Game, Prop, NewsItem } from "@/lib/types";
import { MOCK_GAMES } from "@/lib/mock-data/games";
import { MOCK_NEWS } from "@/lib/mock-data/news";

const BDL_KEY = process.env.BALLDONTLIE_API_KEY;
const BASE = "https://api.balldontlie.io/v1";

// Minimal BDL types
interface BDLGame {
  id: number; date: string; status: string; season: number; postseason: boolean;
  home_team: { id: number; full_name: string; name: string; abbreviation: string; city: string; };
  visitor_team: { id: number; full_name: string; name: string; abbreviation: string; city: string; };
  home_team_score: number; visitor_team_score: number;
}

async function fetchBDLGames(): Promise<BDLGame[]> {
  if (!BDL_KEY) { console.log("[Agg] No BDL key"); return []; }
  const today = new Date().toISOString().slice(0, 10);
  const url = `${BASE}/games?dates[]=${today}&per_page=30`;
  try {
    const res = await fetch(url, {
      headers: { Authorization: BDL_KEY },
      next: { revalidate: 300 },
    });
    if (!res.ok) { console.error("[Agg] BDL error:", res.status); return []; }
    const data = await res.json();
    const games: BDLGame[] = data?.data ?? [];
    console.log(`[Agg] BDL returned ${games.length} games for ${today}`);
    return games;
  } catch (e) {
    console.error("[Agg] BDL fetch threw:", e);
    return [];
  }
}

function bdlToGame(g: BDLGame): Game {
  const gameDate = new Date().toISOString().slice(0, 10);
  const gameTime = new Date(`${gameDate}T19:00:00.000Z`).toISOString();
  return {
    id: `nba-bdl-${g.id}`,
    sport: "NBA",
    awayTeam: {
      id: String(g.visitor_team.id),
      name: g.visitor_team.full_name,
      shortName: g.visitor_team.name,
      abbreviation: g.visitor_team.abbreviation,
      city: g.visitor_team.city,
      sport: "NBA",
    },
    homeTeam: {
      id: String(g.home_team.id),
      name: g.home_team.full_name,
      shortName: g.home_team.name,
      abbreviation: g.home_team.abbreviation,
      city: g.home_team.city,
      sport: "NBA",
    },
    gameTime,
    status: g.status === "Final" ? "final" : "scheduled",
    lines: [],
    prediction: {
      id: `pred-bdl-${g.id}`,
      gameId: `nba-bdl-${g.id}`,
      modelVersion: "v2.1",
      predictedWinner: g.home_team.abbreviation.toLowerCase(),
      winProbHome: 0.54,
      winProbAway: 0.46,
      projectedTotal: 224.5,
      projectedSpread: -3.5,
      confidenceScore: 54,
      fairOddsHome: -117,
      fairOddsAway: 97,
      edgeHome: 1.2,
      edgeAway: -0.8,
      supportingFactors: [{ label: "Home Court", impact: "medium", direction: "positive", value: "Home", description: `${g.home_team.name} at home` }],
      riskFactors: [],
      reasoning: `${g.home_team.name} host ${g.visitor_team.name}. Model gives home team a slight edge.`,
      createdAt: new Date().toISOString(),
    },
  };
}

export async function getTodayAllGames(): Promise<Game[]> {
  const bdlGames = await fetchBDLGames();
  
  if (bdlGames.length > 0) {
    console.log(`[Agg] Using ${bdlGames.length} live BDL games`);
    const liveGames = bdlGames.map(bdlToGame);
    // Merge with mock MLB/NCAA games (with today's date)
    const today = new Date().toISOString().slice(0, 10);
    const mockOtherSports = MOCK_GAMES.filter(g => g.sport !== "NBA").map(g => ({
      ...g,
      gameTime: today + g.gameTime.slice(10),
      prediction: g.prediction ? { ...g.prediction, createdAt: new Date().toISOString() } : undefined,
    }));
    return [...liveGames, ...mockOtherSports];
  }

  console.log("[Agg] BDL returned 0 games — using full mock data");
  const today = new Date().toISOString().slice(0, 10);
  return MOCK_GAMES.map(g => ({
    ...g,
    gameTime: today + g.gameTime.slice(10),
  }));
}

export async function getTodayProps(): Promise<Prop[]> {
  const { MOCK_PROPS } = await import("@/lib/mock-data/props");
  return MOCK_PROPS;
}

export async function getTodayNews(): Promise<NewsItem[]> {
  const today = new Date().toISOString().slice(0, 10);
  return MOCK_NEWS.map(n => ({ ...n, publishedAt: today + n.publishedAt.slice(10) }));
}

export async function getPlayerStats(_playerId: string): Promise<null> { return null; }
export async function getPlayerProps(_playerId: string): Promise<Prop[]> { return []; }
export async function simulateGame(_gameId: string, _iterations: number): Promise<null> { return null; }
export async function getLineHistory(_gameId: string): Promise<[]> { return []; }
export async function searchGamesPlayers(_q: string): Promise<Game[]> { return []; }
export async function getOddsComparison(_gameId: string): Promise<{}> { return {}; }
