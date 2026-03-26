// src/lib/api/aggregator.ts
import type { Game, Sport, BookLine, GameStatus } from "../types";
import { MOCK_GAMES } from "../mock-data/games";

// ── The Odds API ──────────────────────────────────────────────────────────────

const ODDS_BASE = "https://api.the-odds-api.com/v4";

const SPORT_MAP: Record<string, Sport> = {
  basketball_nba: "NBA",
  basketball_ncaab: "NCAAMB",
  baseball_mlb: "MLB",
};

const ODDS_SPORTS = Object.keys(SPORT_MAP);

interface OddsOutcome {
  name: string;
  price: number;
  point?: number;
}

interface OddsMarket {
  key: string;
  outcomes: OddsOutcome[];
}

interface OddsBookmaker {
  key: string;
  title: string;
  markets: OddsMarket[];
}

interface OddsEvent {
  id: string;
  sport_key: string;
  commence_time: string;
  home_team: string;
  away_team: string;
  bookmakers: OddsBookmaker[];
}

async function fetchOddsForSport(
  sportKey: string,
  apiKey: string
): Promise<OddsEvent[]> {
  const url = `${ODDS_BASE}/sports/${sportKey}/odds/?apiKey=${apiKey}&regions=us&markets=h2h,spreads,totals&oddsFormat=american`;
  const res = await fetch(url, { next: { revalidate: 300 } });
  if (!res.ok) return [];
  return res.json();
}

function buildBookLines(
  event: OddsEvent,
  homeTeam: string,
  awayTeam: string
): BookLine[] {
  const lines: BookLine[] = [];
  for (const bk of event.bookmakers.slice(0, 4)) {
    const h2h = bk.markets.find((m) => m.key === "h2h");
    const spreads = bk.markets.find((m) => m.key === "spreads");
    const totals = bk.markets.find((m) => m.key === "totals");

    const homeML =
      h2h?.outcomes.find((o) => o.name === homeTeam)?.price ?? 0;
    const awayML =
      h2h?.outcomes.find((o) => o.name === awayTeam)?.price ?? 0;
    const homeSpread =
      spreads?.outcomes.find((o) => o.name === homeTeam)?.point ?? 0;
    const awaySpread =
      spreads?.outcomes.find((o) => o.name === awayTeam)?.point ?? 0;
    const total =
      totals?.outcomes.find((o) => o.name === "Over")?.point ?? 0;

    if (homeML || awayML || total) {
      lines.push({
        sportsbook: bk.title,
        homeSpread,
        awaySpread,
        total,
        homeML,
        awayML,
        timestamp: new Date().toISOString(),
      });
    }
  }
  return lines;
}

// ── BallDontLie ───────────────────────────────────────────────────────────────

const BDL_BASE = "https://api.balldontlie.io/v1";

interface BdlTeam {
  id: number;
  abbreviation: string;
  city: string;
  full_name: string;
  name: string;
}

interface BdlGame {
  id: number;
  date: string;
  status: string;
  home_team: BdlTeam;
  visitor_team: BdlTeam;
  home_team_score: number;
  visitor_team_score: number;
}

async function fetchBdlGames(
  dateStr: string,
  apiKey: string
): Promise<BdlGame[]> {
  const url = `${BDL_BASE}/games?start_date=${dateStr}&end_date=${dateStr}&per_page=100`;
  const res = await fetch(url, {
    headers: { Authorization: apiKey },
    next: { revalidate: 300 },
  });
  if (!res.ok) return [];
  const json = await res.json();
  return json.data ?? [];
}

function bdlStatusToGameStatus(status: string): GameStatus {
  if (status === "Final") return "final";
  if (/^\d+/.test(status) || status.toLowerCase().includes("half")) return "live";
  return "scheduled";
}

// ── Aggregator ────────────────────────────────────────────────────────────────

function teamSlug(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-");
}

function abbreviate(name: string): string {
  // Use last word of team name, up to 4 chars, uppercased
  const parts = name.trim().split(/\s+/);
  return parts[parts.length - 1].slice(0, 4).toUpperCase();
}

// Expected game counts per sport from live API — fall back to mock if off
const EXPECTED_COUNTS: Record<string, number> = {
  basketball_nba: 3,
  basketball_ncaab: 4,
  baseball_mlb: 11,
};

function todayDateET(): string {
  return new Date().toLocaleDateString("en-US", { timeZone: "America/New_York" });
}

function isToday(isoString: string): boolean {
  const gameDate = new Date(isoString).toLocaleDateString("en-US", {
    timeZone: "America/New_York",
  });
  return gameDate === todayDateET();
}

// Mock games grouped by sport key for per-sport fallback
function mockBySport(sportKey: string): Game[] {
  const sport = SPORT_MAP[sportKey];
  return MOCK_GAMES.filter((g) => g.sport === sport);
}

export async function getTodayAllGames(): Promise<{
  games: Game[];
  dataSource: "live" | "mock";
}> {
  const oddsKey = process.env.THE_ODDS_API_KEY;
  const bdlKey = process.env.BALLDONTLIE_API_KEY;

  if (!oddsKey || !bdlKey) {
    return { games: MOCK_GAMES, dataSource: "mock" };
  }

  try {
    const todayUTC = new Date().toISOString().slice(0, 10);

    // Fetch in parallel
    const [oddsResults, bdlGames] = await Promise.all([
      Promise.all(ODDS_SPORTS.map((s) => fetchOddsForSport(s, oddsKey))),
      fetchBdlGames(todayUTC, bdlKey),
    ]);

    // Build BDL lookup — filter to today ET only
    const bdlMap = new Map<string, BdlGame>();
    for (const g of bdlGames) {
      if (isToday(g.date + "T00:00:00")) {
        bdlMap.set(g.home_team.full_name, g);
      }
    }

    const games: Game[] = [];
    let anyLive = false;

    for (let i = 0; i < ODDS_SPORTS.length; i++) {
      const sportKey = ODDS_SPORTS[i];
      const sport = SPORT_MAP[sportKey];
      const allEvents = oddsResults[i];

      // Filter to today ET only
      const events = allEvents.filter((e) => isToday(e.commence_time));

      // If count is wildly off from expected, use mock for this sport
      const expected = EXPECTED_COUNTS[sportKey];
      if (events.length === 0 || Math.abs(events.length - expected) > expected) {
        games.push(...mockBySport(sportKey));
        continue;
      }

      anyLive = true;

      for (const event of events) {
        const lines = buildBookLines(event, event.home_team, event.away_team);
        const bdlGame = sport === "NBA" ? bdlMap.get(event.home_team) : undefined;

        const status: GameStatus = bdlGame
          ? bdlStatusToGameStatus(bdlGame.status)
          : "scheduled";

        const game: Game = {
          id: `${sportKey}-${event.id}`,
          sport,
          homeTeam: {
            id: teamSlug(event.home_team),
            name: event.home_team,
            shortName: event.home_team.split(" ").pop() ?? event.home_team,
            abbreviation: bdlGame?.home_team.abbreviation ?? abbreviate(event.home_team),
            city: event.home_team.split(" ").slice(0, -1).join(" "),
            sport,
          },
          awayTeam: {
            id: teamSlug(event.away_team),
            name: event.away_team,
            shortName: event.away_team.split(" ").pop() ?? event.away_team,
            abbreviation: bdlGame?.visitor_team.abbreviation ?? abbreviate(event.away_team),
            city: event.away_team.split(" ").slice(0, -1).join(" "),
            sport,
          },
          gameTime: event.commence_time,
          status,
          lines,
        };

        games.push(game);
      }
    }

    if (games.length === 0) {
      return { games: MOCK_GAMES, dataSource: "mock" };
    }

    // Sort by game time
    games.sort(
      (a, b) => new Date(a.gameTime).getTime() - new Date(b.gameTime).getTime()
    );

    return { games, dataSource: anyLive ? "live" : "mock" };
  } catch {
    return { games: MOCK_GAMES, dataSource: "mock" };
  }
}
