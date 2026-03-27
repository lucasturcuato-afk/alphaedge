// src/lib/api/balldontlie.ts
/**
 * BallDontLie API adapter — NBA & NCAAMB stats
 * Docs: https://docs.balldontlie.io
 * Free tier: $0/mo, 5 req/min, 1 sport, basic data
 * All-Star: $9.99/mo per sport — extended data + 60 req/min (recommended)
 *
 * Sign up at https://balldontlie.io → Start Building Free
 * Add to .env.local: BALLDONTLIE_API_KEY=your_key_here
 */

import type { Player, PlayerSeasonAverages } from "@/lib/types";

const BASE = "https://api.balldontlie.io/v1";
const KEY = process.env.BALLDONTLIE_API_KEY;

const headers = () =>
  KEY ? { Authorization: KEY } : {};

// ── Types ─────────────────────────────────────────────────────────────────────

interface BDLPlayer {
  id: number;
  first_name: string;
  last_name: string;
  position: string;
  height: string;
  weight: string;
  jersey_number: string;
  college: string;
  country: string;
  draft_year: number | null;
  draft_round: number | null;
  draft_number: number | null;
  team: BDLTeam;
}

interface BDLTeam {
  id: number;
  conference: string;
  division: string;
  city: string;
  name: string;
  full_name: string;
  abbreviation: string;
}

interface BDLGame {
  id: number;
  date: string;
  home_team: BDLTeam;
  home_team_score: number;
  visitor_team: BDLTeam;
  visitor_team_score: number;
  season: number;
  status: string; // "Final" | "2nd Qtr" | "1/26/2025"
  period: number;
  time: string;
  postseason: boolean;
}

interface BDLStat {
  id: number;
  player: BDLPlayer;
  team: BDLTeam;
  game: BDLGame;
  min: string;
  pts: number;
  reb: number;
  ast: number;
  stl: number;
  blk: number;
  turnover: number;
  pf: number;
  fga: number;
  fgm: number;
  fg3a: number;
  fg3m: number;
  fta: number;
  ftm: number;
  oreb: number;
  dreb: number;
}

interface BDLSeasonAvg {
  player_id: number;
  season: number;
  games_played: number;
  min: string;
  pts: number;
  reb: number;
  ast: number;
  stl: number;
  blk: number;
  turnover: number;
  pf: number;
  fga: number;
  fgm: number;
  fg_pct: number;
  fg3a: number;
  fg3m: number;
  fg3_pct: number;
  fta: number;
  ftm: number;
  ft_pct: number;
  oreb: number;
  dreb: number;
}

interface BDLInjury {
  player: BDLPlayer;
  status: string; // "Day-To-Day" | "Out" | "Questionable"
  description: string;
  team: BDLTeam;
}

// ── API calls ─────────────────────────────────────────────────────────────────

async function bdlFetch<T>(path: string, params: Record<string, string> = {}): Promise<T | null> {
  if (!KEY) {
    console.warn("[BDL] No API key — set BALLDONTLIE_API_KEY in .env.local");
    return null;
  }

  const url = new URL(`${BASE}${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  try {
    const res = await fetch(url.toString(), {
      headers: headers() as HeadersInit,
      next: { revalidate: 300 },
    });
    if (!res.ok) {
      console.error(`[BDL] ${res.status} on ${path}`);
      return null;
    }
    return res.json();
  } catch (e) {
    console.error("[BDL] Fetch error:", e);
    return null;
  }
}

/**
 * Search for a player by name.
 */
export async function searchPlayer(name: string): Promise<BDLPlayer[]> {
  const data = await bdlFetch<{ data: BDLPlayer[] }>("/players", {
    search: name,
    per_page: "5",
  });
  return data?.data ?? [];
}

/**
 * Get today's NBA games.
 */
export async function getTodayGames(): Promise<BDLGame[]> {
  if (!KEY) return [];
  const today = new Date().toISOString().split("T")[0];
  try {
    const url = `${BASE}/games?dates[]=${today}&per_page=30`;
    const res = await fetch(url, {
      headers: { Authorization: KEY } as HeadersInit,
      next: { revalidate: 300 },
    });
    if (!res.ok) { console.error("[BDL] getTodayGames failed:", res.status); return []; }
    const data = await res.json();
    console.log(`[BDL] getTodayGames: ${data?.data?.length ?? 0} games for ${today}`);
    return data?.data ?? [];
  } catch (e) {
    console.error("[BDL] getTodayGames error:", e);
    return [];
  }
}

/**
 * Get games for a date range.
 */
export async function getGamesForDates(dates: string[]): Promise<BDLGame[]> {
  // BDL supports multiple date params
  const params = new URLSearchParams();
  if (KEY) params.set("Authorization", KEY);
  dates.forEach((d) => params.append("dates[]", d));
  params.set("per_page", "30");

  try {
    const res = await fetch(`${BASE}/games?${params}`, {
      headers: headers() as HeadersInit,
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.data ?? [];
  } catch {
    return [];
  }
}

/**
 * Get season averages for a player.
 * Season = year the season started (e.g. 2024 for 2024-25)
 */
export async function getPlayerSeasonAvg(
  playerId: number,
  season: number = 2024
): Promise<BDLSeasonAvg | null> {
  const data = await bdlFetch<{ data: BDLSeasonAvg[] }>("/season_averages", {
    season: String(season),
    player_ids: String(playerId),
  });
  return data?.data?.[0] ?? null;
}

/**
 * Get last N game stats for a player (for trend charts).
 */
export async function getPlayerRecentStats(
  playerId: number,
  n: number = 10,
  season: number = 2024
): Promise<BDLStat[]> {
  const data = await bdlFetch<{ data: BDLStat[] }>("/stats", {
    player_ids: String(playerId),
    seasons: String(season),
    per_page: String(n),
    sort: "game.date",
    direction: "desc",
  });
  return data?.data ?? [];
}

/**
 * Get injury report (requires All-Star plan or above).
 */
export async function getInjuryReport(): Promise<BDLInjury[]> {
  const data = await bdlFetch<{ data: BDLInjury[] }>("/player_injuries", {
    per_page: "50",
  });
  return data?.data ?? [];
}

/**
 * Convert BDL season averages to our internal format.
 */
export function parseBDLSeasonAvg(avg: BDLSeasonAvg): PlayerSeasonAverages {
  return {
    points: avg.pts,
    rebounds: avg.reb,
    assists: avg.ast,
    steals: avg.stl,
    blocks: avg.blk,
    minutesPerGame: parseFloat(avg.min) || 0,
  };
}

/**
 * Convert BDL recent stats to simple number arrays for trend charts.
 */
export function parseBDLTrendData(stats: BDLStat[]): {
  points: number[];
  rebounds: number[];
  assists: number[];
} {
  const sorted = [...stats].reverse(); // oldest first
  return {
    points: sorted.map((s) => s.pts),
    rebounds: sorted.map((s) => s.reb),
    assists: sorted.map((s) => s.ast),
  };
}

/**
 * Convert BDL player to our internal Player type (partial — no team logo).
 */
export function parseBDLPlayer(p: BDLPlayer): Partial<Player> {
  return {
    id: String(p.id),
    name: `${p.first_name} ${p.last_name}`,
    position: p.position,
    number: p.jersey_number,
    sport: "NBA",
    status: "active",
    team: {
      id: String(p.team.id),
      name: p.team.full_name,
      shortName: p.team.name,
      abbreviation: p.team.abbreviation,
      city: p.team.city,
      sport: "NBA",
    },
  };
}
