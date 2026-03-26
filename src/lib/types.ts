// src/lib/types.ts

export type Sport = "NBA" | "NCAAMB" | "MLB";

export type BetType =
  | "moneyline"
  | "spread"
  | "total"
  | "prop_points"
  | "prop_rebounds"
  | "prop_assists"
  | "prop_strikeouts"
  | "prop_hits"
  | "prop_home_runs";

export type PlayerStatus = "active" | "questionable" | "out" | "day-to-day";
export type GameStatus = "scheduled" | "live" | "final";
export type SentimentSignal =
  | "positive"
  | "negative"
  | "neutral"
  | "mixed"
  | "injury_concern"
  | "usage_up"
  | "usage_down"
  | "public_hype"
  | "contrarian";

// ── Entities ──────────────────────────────────────────────────────────────────

export interface Team {
  id: string;
  name: string;
  shortName: string;
  abbreviation: string;
  city: string;
  sport: Sport;
  record?: string;
  logoUrl?: string;
}

export interface Player {
  id: string;
  name: string;
  position: string;
  number?: string;
  team: Team;
  sport: Sport;
  status: PlayerStatus;
  imageUrl?: string;
  seasonAverages?: PlayerSeasonAverages;
}

export interface PlayerSeasonAverages {
  points?: number;
  rebounds?: number;
  assists?: number;
  steals?: number;
  blocks?: number;
  minutesPerGame?: number;
  usageRate?: number;
  // MLB
  battingAverage?: number;
  homeRuns?: number;
  rbi?: number;
  obp?: number;
  slg?: number;
  era?: number;
  strikeouts?: number;
  whip?: number;
}

// ── Games ──────────────────────────────────────────────────────────────────────

export interface Game {
  id: string;
  sport: Sport;
  homeTeam: Team;
  awayTeam: Team;
  gameTime: string; // ISO string
  status: GameStatus;
  venue?: string;
  weather?: WeatherData;
  lines?: BookLine[];
  prediction?: GamePrediction;
  simulation?: SimulationResult;
}

export interface WeatherData {
  temp: number;
  condition: string;
  wind: number;
  humidity: number;
}

export interface BookLine {
  sportsbook: string;
  homeSpread: number;
  awaySpread: number;
  total: number;
  homeML: number;
  awayML: number;
  timestamp: string;
}

// ── Predictions ────────────────────────────────────────────────────────────────

export interface GamePrediction {
  id: string;
  gameId: string;
  modelVersion: string;
  predictedWinner: string;
  winProbHome: number; // 0-1
  winProbAway: number;
  projectedTotal: number;
  projectedSpread: number; // positive = home favored
  confidenceScore: number; // 0-100
  fairOddsHome: number; // American odds
  fairOddsAway: number;
  edgeHome: number; // percentage points
  edgeAway: number;
  supportingFactors: PredictionFactor[];
  riskFactors: PredictionFactor[];
  reasoning: string;
  createdAt: string;
}

export interface PredictionFactor {
  label: string;
  impact: "high" | "medium" | "low";
  direction: "positive" | "negative" | "neutral";
  value?: string;
  description: string;
}

// ── Props ──────────────────────────────────────────────────────────────────────

export interface Prop {
  id: string;
  player: Player;
  gameId: string;
  propType: string;
  line: number;
  overOdds: number;
  underOdds: number;
  projectedValue: number;
  overProbability: number; // 0-1
  underProbability: number;
  confidenceScore: number; // 0-100
  fairOddsOver: number;
  fairOddsUnder: number;
  edge: number; // percentage edge over book
  sentiment: SentimentSignal;
  factors: PredictionFactor[];
  sportsbook: string;
  recentPerformance?: number[]; // last 5 game values
}

// ── Simulations ────────────────────────────────────────────────────────────────

export interface SimulationResult {
  gameId: string;
  iterations: number;
  homeWinPct: number;
  awayWinPct: number;
  avgTotal: number;
  avgHomeScore: number;
  avgAwayScore: number;
  spreadCoverPct: number;
  distribution: ScoreBucket[];
  percentiles: Percentiles;
}

export interface ScoreBucket {
  range: string;
  count: number;
  pct: number;
}

export interface Percentiles {
  p10: { home: number; away: number };
  p25: { home: number; away: number };
  p50: { home: number; away: number };
  p75: { home: number; away: number };
  p90: { home: number; away: number };
}

// ── News & Sentiment ──────────────────────────────────────────────────────────

export interface NewsItem {
  id: string;
  headline: string;
  summary: string;
  source: string;
  url?: string;
  sport: Sport;
  tags: string[];
  sentiment: SentimentSignal;
  signals: NewsSignals;
  publishedAt: string;
}

export interface NewsSignals {
  injuryFlag: boolean;
  usageFlag: boolean;
  momentumFlag: boolean;
  fatigueFlag: boolean;
  publicHype: boolean;
}

export interface SentimentData {
  entityId: string;
  entityType: "player" | "team";
  overall: number; // -1 to 1
  reddit: number;
  twitter: number;
  news: number;
  volume: number;
  signals: SentimentSignal[];
  summary: string;
}

// ── Search ────────────────────────────────────────────────────────────────────

export type SearchResultType = "player" | "team" | "game" | "prop";

export interface SearchResult {
  type: SearchResultType;
  id: string;
  label: string;
  sublabel?: string;
  sport: Sport;
  href: string;
}

// ── UI State ─────────────────────────────────────────────────────────────────

export interface FilterState {
  sport: Sport | "ALL";
  betType: BetType | "ALL";
  minEdge: number;
  minConfidence: number;
  showInjured: boolean;
}

export interface EdgeRating {
  value: number; // percentage
  grade: "S" | "A" | "B" | "C" | "D";
  label: string;
  color: string;
}
