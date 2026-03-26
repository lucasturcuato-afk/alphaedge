// src/lib/simulation/engine.ts
/**
 * AlphaEdge Simulation Engine v2.1
 * 
 * Full Monte Carlo game simulation + prediction model in TypeScript.
 * Runs in the browser (client-side) for instant results.
 * Also callable from API routes for server-side simulation.
 * 
 * Sports supported: NBA, NCAAMB, MLB
 */

import type { Game, SimulationResult, GamePrediction, PredictionFactor, Sport } from "@/lib/types";
import { probToAmerican, calcEdge, americanToImplied } from "@/lib/utils";

// ── Constants ─────────────────────────────────────────────────────────────────

const NBA_HOME_ADVANTAGE = 3.1;      // points
const NCAA_HOME_ADVANTAGE = 4.8;     // points  
const NBA_SCORE_STDDEV = 0.087;      // fraction of expected score
const NCAA_SCORE_STDDEV = 0.092;
const MLB_LEAGUE_ERA = 4.20;
const MLB_LEAGUE_RUNS = 4.5;

// ── Random number utilities ───────────────────────────────────────────────────

/** Box-Muller transform for normal distribution */
function normalRandom(mean: number, stddev: number): number {
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(Math.max(u1, 1e-10))) * Math.cos(2 * Math.PI * u2);
  return mean + z * stddev;
}

/** Poisson random variable (for MLB) */
function poissonRandom(lambda: number): number {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= Math.random();
  } while (p > L);
  return k - 1;
}

/** Percentile from sorted array */
function percentile(sorted: number[], p: number): number {
  const idx = Math.floor((p / 100) * sorted.length);
  return sorted[Math.min(idx, sorted.length - 1)];
}

// ── Rest adjustment ───────────────────────────────────────────────────────────

function restAdjustment(restDays: number): number {
  if (restDays === 0) return -2.8;   // back-to-back penalty
  if (restDays === 1) return -0.6;
  if (restDays >= 4) return +0.8;    // well-rested bonus
  return 0;
}

// ── Injury impact ─────────────────────────────────────────────────────────────

function injuryImpact(injuredPlayers: { role: "star" | "starter" | "bench" }[]): number {
  return injuredPlayers.reduce((total, p) => {
    if (p.role === "star") return total - 6.0;
    if (p.role === "starter") return total - 3.5;
    return total - 1.2;
  }, 0);
}

// ── Bucket distribution ───────────────────────────────────────────────────────

function buildDistribution(
  scores: number[],
  bucketSize: number
): SimulationResult["distribution"] {
  const min = Math.floor(Math.min(...scores) / bucketSize) * bucketSize;
  const max = Math.ceil(Math.max(...scores) / bucketSize) * bucketSize;
  const result: SimulationResult["distribution"] = [];
  for (let b = min; b < max; b += bucketSize) {
    const count = scores.filter((s) => s >= b && s < b + bucketSize).length;
    result.push({
      range: `${Math.round(b)}-${Math.round(b + bucketSize - 1)}`,
      count,
      pct: Math.round((count / scores.length) * 100 * 10) / 10,
    });
  }
  return result;
}

// ════════════════════════════════════════════════════════════════════════════
// BASKETBALL SIMULATION (NBA + NCAAMB)
// ════════════════════════════════════════════════════════════════════════════

export interface BasketballSimInput {
  gameId: string;
  sport: "NBA" | "NCAAMB";
  homeOffRtg: number;    // Points per 100 possessions
  homeDefRtg: number;
  awayOffRtg: number;
  awayDefRtg: number;
  pace: number;          // Possessions per game
  homeRestDays?: number;
  awayRestDays?: number;
  homeInjuries?: { role: "star" | "starter" | "bench" }[];
  awayInjuries?: { role: "star" | "starter" | "bench" }[];
  spread?: number;       // For ATS coverage calculation
  iterations?: number;
}

export function simulateBasketball(input: BasketballSimInput): SimulationResult {
  const {
    gameId, sport,
    homeOffRtg, homeDefRtg, awayOffRtg, awayDefRtg,
    pace,
    homeRestDays = 1, awayRestDays = 1,
    homeInjuries = [], awayInjuries = [],
    spread = 0,
    iterations = 10000,
  } = input;

  const homeAdv = sport === "NBA" ? NBA_HOME_ADVANTAGE : NCAA_HOME_ADVANTAGE;
  const stddevFactor = sport === "NBA" ? NBA_SCORE_STDDEV : NCAA_SCORE_STDDEV;

  // Adjust for rest
  const adjHomeOff = homeOffRtg + restAdjustment(homeRestDays) + injuryImpact(homeInjuries);
  const adjAwayOff = awayOffRtg + restAdjustment(awayRestDays) + injuryImpact(awayInjuries);

  // Expected scores: blend of offense vs opponent defense, scaled by pace
  const homeExpected = ((adjHomeOff + (220 - awayDefRtg)) / 2) * (pace / 100) + homeAdv;
  const awayExpected = ((adjAwayOff + (220 - homeDefRtg)) / 2) * (pace / 100);

  const homeScores: number[] = [];
  const awayScores: number[] = [];

  for (let i = 0; i < iterations; i++) {
    // Correlated noise (pace affects both teams)
    const paceNoise = normalRandom(0, pace * 0.025);

    const h = Math.max(40, normalRandom(homeExpected, homeExpected * stddevFactor) + paceNoise * 0.2);
    const a = Math.max(40, normalRandom(awayExpected, awayExpected * stddevFactor) + paceNoise * 0.2);

    homeScores.push(Math.round(h));
    awayScores.push(Math.round(a));
  }

  const homeWins = homeScores.filter((h, i) => h > awayScores[i]).length;
  const totals = homeScores.map((h, i) => h + awayScores[i]);
  const sortedHome = [...homeScores].sort((a, b) => a - b);
  const sortedAway = [...awayScores].sort((a, b) => a - b);
  const sortedTotals = [...totals].sort((a, b) => a - b);

  // ATS coverage: home covers when home wins by more than spread (spread is positive for home fav)
  const atsCovers = spread !== 0
    ? homeScores.filter((h, i) => (h - awayScores[i]) > Math.abs(spread)).length
    : homeWins;

  return {
    gameId,
    iterations,
    homeWinPct: Math.round((homeWins / iterations) * 1000) / 10,
    awayWinPct: Math.round(((iterations - homeWins) / iterations) * 1000) / 10,
    avgTotal: Math.round((totals.reduce((a, b) => a + b, 0) / iterations) * 10) / 10,
    avgHomeScore: Math.round((homeScores.reduce((a, b) => a + b, 0) / iterations) * 10) / 10,
    avgAwayScore: Math.round((awayScores.reduce((a, b) => a + b, 0) / iterations) * 10) / 10,
    spreadCoverPct: Math.round((atsCovers / iterations) * 1000) / 10,
    distribution: buildDistribution(totals, sport === "NBA" ? 10 : 10),
    percentiles: {
      p10: { home: percentile(sortedHome, 10), away: percentile(sortedAway, 10) },
      p25: { home: percentile(sortedHome, 25), away: percentile(sortedAway, 25) },
      p50: { home: percentile(sortedHome, 50), away: percentile(sortedAway, 50) },
      p75: { home: percentile(sortedHome, 75), away: percentile(sortedAway, 75) },
      p90: { home: percentile(sortedHome, 90), away: percentile(sortedAway, 90) },
    },
  };
}

// ════════════════════════════════════════════════════════════════════════════
// MLB SIMULATION (Poisson run model)
// ════════════════════════════════════════════════════════════════════════════

export interface MLBSimInput {
  gameId: string;
  homeOffScore: number;   // Lineup quality score 85-115 (100 = avg)
  awayOffScore: number;
  homeStarterERA: number;
  awayStarterERA: number;
  homeRestDays?: number;
  awayRestDays?: number;
  windSpeed?: number;     // mph, positive = blowing out
  windTowardsHitter?: boolean;
  temperature?: number;   // Fahrenheit
  spread?: number;        // Run line
  iterations?: number;
}

export function simulateMLB(input: MLBSimInput): SimulationResult {
  const {
    gameId,
    homeOffScore, awayOffScore,
    homeStarterERA, awayStarterERA,
    homeRestDays = 1, awayRestDays = 1,
    windSpeed = 0, windTowardsHitter = false,
    temperature = 72,
    spread = -1.5,
    iterations = 10000,
  } = input;

  // Expected runs: adjust for pitching, offense, park, weather
  let homeRunExp = (MLB_LEAGUE_ERA / Math.max(awayStarterERA, 1)) * MLB_LEAGUE_RUNS;
  let awayRunExp = (MLB_LEAGUE_ERA / Math.max(homeStarterERA, 1)) * MLB_LEAGUE_RUNS;

  // Offense quality adjustment
  homeRunExp *= (homeOffScore / 100);
  awayRunExp *= (awayOffScore / 100);

  // Wind effect
  const windAdj = windTowardsHitter ? windSpeed * 0.018 : -(windSpeed * 0.012);
  homeRunExp *= (1 + windAdj);
  awayRunExp *= (1 + windAdj);

  // Temperature: cold suppresses offense
  if (temperature < 50) {
    const tempAdj = (temperature - 72) * 0.004;
    homeRunExp *= (1 + tempAdj);
    awayRunExp *= (1 + tempAdj);
  }

  // Home advantage
  homeRunExp *= 1.04;

  // Rest
  if (homeRestDays === 0) homeRunExp *= 0.96;
  if (awayRestDays === 0) awayRunExp *= 0.96;

  const homeScores: number[] = [];
  const awayScores: number[] = [];

  for (let i = 0; i < iterations; i++) {
    // Use Poisson for base run expectancy, add extra innings variance
    const h = poissonRandom(Math.max(homeRunExp, 0.5));
    const a = poissonRandom(Math.max(awayRunExp, 0.5));
    homeScores.push(h);
    awayScores.push(a);
  }

  const homeWins = homeScores.filter((h, i) => h > awayScores[i]).length;
  const ties = homeScores.filter((h, i) => h === awayScores[i]).length;
  const totals = homeScores.map((h, i) => h + awayScores[i]);
  const sortedHome = [...homeScores].sort((a, b) => a - b);
  const sortedAway = [...awayScores].sort((a, b) => a - b);

  // Run line coverage (home covers -1.5 when wins by 2+)
  const rlCovers = homeScores.filter((h, i) => (h - awayScores[i]) >= 2).length;

  return {
    gameId,
    iterations,
    homeWinPct: Math.round(((homeWins + ties * 0.5) / iterations) * 1000) / 10,
    awayWinPct: Math.round(((iterations - homeWins - ties * 0.5) / iterations) * 1000) / 10,
    avgTotal: Math.round((totals.reduce((a, b) => a + b, 0) / iterations) * 10) / 10,
    avgHomeScore: Math.round((homeScores.reduce((a, b) => a + b, 0) / iterations) * 10) / 10,
    avgAwayScore: Math.round((awayScores.reduce((a, b) => a + b, 0) / iterations) * 10) / 10,
    spreadCoverPct: Math.round((rlCovers / iterations) * 1000) / 10,
    distribution: buildDistribution(totals, 2),
    percentiles: {
      p10: { home: percentile(sortedHome, 10), away: percentile(sortedAway, 10) },
      p25: { home: percentile(sortedHome, 25), away: percentile(sortedAway, 25) },
      p50: { home: percentile(sortedHome, 50), away: percentile(sortedAway, 50) },
      p75: { home: percentile(sortedHome, 75), away: percentile(sortedAway, 75) },
      p90: { home: percentile(sortedHome, 90), away: percentile(sortedAway, 90) },
    },
  };
}

// ════════════════════════════════════════════════════════════════════════════
// PROP SIMULATION
// ════════════════════════════════════════════════════════════════════════════

export interface PropSimInput {
  propType: string;
  seasonAvg: number;
  last5Avg: number;
  last10Avg: number;
  bookLine: number;
  usageRate?: number;         // 0-100
  opponentDefRank?: number;   // 1=best, 30=worst vs this prop type
  homeAway?: "home" | "away";
  restDays?: number;
  playerStatus?: "active" | "questionable" | "day-to-day" | "out";
  minutesExpected?: number;
  minutesSeasonAvg?: number;
  iterations?: number;
}

export interface PropSimResult {
  projectedValue: number;
  overProbability: number;
  underProbability: number;
  fairOddsOver: number;
  fairOddsUnder: number;
  edge: number;
  confidenceScore: number;
  distribution: { bucket: string; pct: number }[];
  p10: number; p25: number; p50: number; p75: number; p90: number;
}

export function simulateProp(input: PropSimInput): PropSimResult {
  const {
    propType,
    seasonAvg, last5Avg, last10Avg,
    bookLine,
    usageRate = 25,
    opponentDefRank = 15,
    homeAway = "home",
    restDays = 1,
    playerStatus = "active",
    minutesExpected, minutesSeasonAvg,
    iterations = 10000,
  } = input;

  // Recency-weighted projection (40% last-5, 25% last-10, 35% season)
  let proj = seasonAvg * 0.35 + last10Avg * 0.25 + last5Avg * 0.40;

  // Opponent difficulty adjustment (-12% best defense → +12% worst defense)
  const oppAdj = ((opponentDefRank - 15.5) / 15.5) * 0.12;
  proj *= (1 + oppAdj);

  // Home/away
  if (homeAway === "away") proj *= 0.97;

  // Rest
  if (restDays === 0) proj *= 0.93;
  else if (restDays >= 3) proj *= 1.02;

  // Status
  const statusMult = { active: 1.0, questionable: 0.88, "day-to-day": 0.82, out: 0.0 };
  proj *= (statusMult[playerStatus] ?? 1.0);

  // Minutes adjustment
  if (minutesExpected && minutesSeasonAvg && minutesSeasonAvg > 0) {
    proj *= (minutesExpected / minutesSeasonAvg);
  }

  // Standard deviation by prop type
  const stddevMap: Record<string, number> = {
    points: 0.28, rebounds: 0.32, assists: 0.35,
    threes: 0.55, blocks: 0.65, steals: 0.65,
    hits: 0.55, home_runs: 0.80, strikeouts: 0.30,
    team_total: 0.09, game_total: 0.07,
    run_line: 0.10, moneyline: 0.10, spread: 0.10,
    total_under: 0.07, first5_ml: 0.10,
  };
  const stddev = Math.max(0.5, proj * (stddevMap[propType] ?? 0.30));

  // Sample
  const samples: number[] = [];
  const isDiscrete = ["hits", "home_runs", "strikeouts", "threes", "blocks", "steals"].includes(propType);

  for (let i = 0; i < iterations; i++) {
    let val: number;
    if (isDiscrete) {
      // Negative binomial for counting stats
      const r = Math.max(0.5, (proj * proj) / Math.max(stddev * stddev - proj, 0.1));
      const p = r / (r + proj);
      // Approximate with Poisson for simplicity
      val = poissonRandom(Math.max(proj, 0.1));
    } else if (propType.includes("total") || propType.includes("moneyline") || propType.includes("spread") || propType.includes("run_line") || propType.includes("first5")) {
      val = normalRandom(proj, stddev);
    } else {
      val = Math.max(0, normalRandom(proj, stddev));
    }
    samples.push(val);
  }

  const overCount = samples.filter((s) => s > bookLine).length;
  const overProb = overCount / iterations;
  const underProb = 1 - overProb;

  // Fair odds
  const fairOver = probToAmerican(overProb);
  const fairUnder = probToAmerican(underProb);

  // Edge vs standard -110 implied probability
  const implied = americanToImplied(-110);
  const edge = (overProb > 0.5 ? overProb - implied : underProb - implied) * 100;

  // Confidence: based on projection distance from line + opponent clarity
  const projDiff = Math.abs(proj - bookLine) / Math.max(bookLine, 0.1);
  const oppBoost = Math.abs(opponentDefRank - 15) / 15 * 15;
  const confidence = Math.min(Math.round(50 + projDiff * 180 + oppBoost), 92);

  // Distribution
  const sorted = [...samples].sort((a, b) => a - b);

  return {
    projectedValue: Math.round(proj * 10) / 10,
    overProbability: Math.round(overProb * 1000) / 1000,
    underProbability: Math.round(underProb * 1000) / 1000,
    fairOddsOver: fairOver,
    fairOddsUnder: fairUnder,
    edge: Math.round(edge * 10) / 10,
    confidenceScore: confidence,
    distribution: [],
    p10: Math.round(percentile(sorted, 10) * 10) / 10,
    p25: Math.round(percentile(sorted, 25) * 10) / 10,
    p50: Math.round(percentile(sorted, 50) * 10) / 10,
    p75: Math.round(percentile(sorted, 75) * 10) / 10,
    p90: Math.round(percentile(sorted, 90) * 10) / 10,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// PREDICTION MODEL — generates GamePrediction from sim results + context
// ════════════════════════════════════════════════════════════════════════════

export interface PredictionInput {
  game: Game;
  sim: SimulationResult;
  homeNetRtg?: number;    // Season net rating
  awayNetRtg?: number;
  homeL10Record?: string; // e.g. "8-2"
  awayL10Record?: string;
  homeInjuries?: string[];  // Names of injured players
  awayInjuries?: string[];
  lineMovement?: { opened: number; current: number }; // spread movement
  publicBettingPct?: number; // % on home team
}

export function buildPrediction(input: PredictionInput): GamePrediction {
  const { game, sim, homeInjuries = [], awayInjuries = [], publicBettingPct, lineMovement } = input;
  const line = game.lines?.[0];

  const winProbHome = sim.homeWinPct / 100;
  const winProbAway = sim.awayWinPct / 100;

  const fairOddsHome = probToAmerican(winProbHome);
  const fairOddsAway = probToAmerican(winProbAway);

  const edgeHome = line ? calcEdge(winProbHome, line.homeML) : 0;
  const edgeAway = line ? calcEdge(winProbAway, line.awayML) : 0;

  const projectedSpread = sim.avgHomeScore - sim.avgAwayScore;

  // Build supporting factors dynamically
  const supportingFactors: PredictionFactor[] = [];
  const riskFactors: PredictionFactor[] = [];

  // Home/away win prob
  if (winProbHome > 0.65) {
    supportingFactors.push({
      label: `${game.homeTeam.abbreviation} Strong Home Favorite`,
      impact: "high", direction: "positive",
      value: `${Math.round(winProbHome * 100)}% win probability`,
      description: `Model gives ${game.homeTeam.shortName} a ${Math.round(winProbHome * 100)}% chance to win based on lineup and matchup analysis`,
    });
  }

  // Injuries
  if (awayInjuries.length > 0) {
    supportingFactors.push({
      label: "Key Away Injuries",
      impact: "high", direction: "positive",
      value: awayInjuries.slice(0, 2).join(", "),
      description: `${awayInjuries.join(", ")} listed as out/questionable — significant lineup impact`,
    });
  }
  if (homeInjuries.length > 0) {
    riskFactors.push({
      label: "Key Home Injuries",
      impact: "high", direction: "negative",
      value: homeInjuries.slice(0, 2).join(", "),
      description: `${homeInjuries.join(", ")} listed as out/questionable — reduces home team upside`,
    });
  }

  // Line movement signal
  if (lineMovement && Math.abs(lineMovement.current - lineMovement.opened) >= 1.5) {
    const movingToHome = lineMovement.current < lineMovement.opened;
    riskFactors.push({
      label: "Line Movement Signal",
      impact: "medium", direction: movingToHome ? "positive" : "negative",
      value: `Opened ${lineMovement.opened > 0 ? "+" : ""}${lineMovement.opened}, now ${lineMovement.current > 0 ? "+" : ""}${lineMovement.current}`,
      description: `${Math.abs(lineMovement.current - lineMovement.opened)} points of line movement — sharp money signal`,
    });
  }

  // Public betting fade
  if (publicBettingPct && publicBettingPct > 70) {
    riskFactors.push({
      label: "Heavy Public Action",
      impact: "low", direction: "negative",
      value: `${publicBettingPct}% public on ${game.homeTeam.abbreviation}`,
      description: "Heavy public action may have inflated the home team price — potential sharp fade opportunity",
    });
  }

  // Total value
  if (line) {
    const totalDiff = sim.avgTotal - line.total;
    if (Math.abs(totalDiff) >= 2) {
      const isOver = totalDiff > 0;
      (isOver ? supportingFactors : riskFactors).push({
        label: isOver ? "Total OVER Value" : "Total UNDER Value",
        impact: "medium", direction: isOver ? "positive" : "negative",
        value: `Model ${sim.avgTotal.toFixed(1)} vs line ${line.total}`,
        description: `Model projects total ${isOver ? "above" : "below"} the line by ${Math.abs(totalDiff).toFixed(1)} points`,
      });
    }
  }

  // ATS signal
  if (sim.spreadCoverPct < 45) {
    riskFactors.push({
      label: "Spread Value on Away",
      impact: "medium", direction: "negative",
      value: `Home covers only ${sim.spreadCoverPct}% of simulations`,
      description: "Home team covers the spread in fewer than 45% of simulations — consider away team ATS",
    });
  }

  // Generate reasoning
  const predictedWinner = winProbHome > winProbAway ? game.homeTeam.id : game.awayTeam.id;
  const winnerName = winProbHome > winProbAway ? game.homeTeam.shortName : game.awayTeam.shortName;
  const winnerProb = Math.max(winProbHome, winProbAway);

  const bestEdge = Math.abs(edgeHome) > Math.abs(edgeAway) ? edgeHome : edgeAway;
  const bestEdgeSide = Math.abs(edgeHome) > Math.abs(edgeAway)
    ? `${game.homeTeam.abbreviation} ML`
    : `${game.awayTeam.abbreviation} ML`;

  const reasoning = [
    `The model gives ${winnerName} a ${Math.round(winnerProb * 100)}% win probability.`,
    line
      ? `Projected spread of ${projectedSpread > 0 ? "+" : ""}${projectedSpread.toFixed(1)} vs book line of ${line.homeSpread > 0 ? "+" : ""}${line.homeSpread}.`
      : "",
    line
      ? `Model projects a total of ${sim.avgTotal.toFixed(1)} vs the posted ${line.total}.`
      : "",
    Math.abs(bestEdge) >= 2
      ? `Best value: ${bestEdgeSide} (${bestEdge > 0 ? "+" : ""}${bestEdge.toFixed(1)}% edge).`
      : "No significant edge found vs current lines.",
    awayInjuries.length > 0
      ? `Note: ${awayInjuries.join(", ")} listed as out — factored into simulation.`
      : "",
  ].filter(Boolean).join(" ");

  // Confidence score: combination of win probability strength + injury clarity
  const probStrength = Math.abs(winProbHome - 0.5) * 100;
  const injuryBoost = (homeInjuries.length + awayInjuries.length) * 5;
  const confidenceScore = Math.min(Math.round(50 + probStrength * 0.8 + injuryBoost), 88);

  return {
    id: `pred-${game.id}`,
    gameId: game.id,
    modelVersion: "v2.1",
    predictedWinner,
    winProbHome,
    winProbAway,
    projectedTotal: sim.avgTotal,
    projectedSpread,
    confidenceScore,
    fairOddsHome,
    fairOddsAway,
    edgeHome,
    edgeAway,
    supportingFactors,
    riskFactors,
    reasoning,
    createdAt: new Date().toISOString(),
  };
}

// ════════════════════════════════════════════════════════════════════════════
// CONVENIENCE RUNNERS — pre-configured for today's real games
// ════════════════════════════════════════════════════════════════════════════

/** Run simulation for a game given its ID and return SimulationResult */
export function runGameSimulation(gameId: string, iterations = 10000): SimulationResult | null {
  const configs: Record<string, () => SimulationResult> = {

    // NOP @ DET — Cunningham OUT, Murphy hot
    "nba-pelicans-pistons": () => simulateBasketball({
      gameId, sport: "NBA",
      homeOffRtg: 112.8, homeDefRtg: 107.2,  // DET elite defense
      awayOffRtg: 109.4, awayDefRtg: 114.8,  // NOP weak defense
      pace: 100.6,
      homeRestDays: 1, awayRestDays: 1,
      homeInjuries: [{ role: "star" }],  // Cunningham OUT
      awayInjuries: [],
      spread: -3.5, iterations,
    }),

    // NYK @ CHA — close game
    "nba-knicks-hornets": () => simulateBasketball({
      gameId, sport: "NBA",
      homeOffRtg: 113.2, homeDefRtg: 111.8,  // CHA average
      awayOffRtg: 119.3, awayDefRtg: 112.9,  // NYK elite offense
      pace: 98.8,
      homeRestDays: 1, awayRestDays: 1,
      homeInjuries: [], awayInjuries: [],
      spread: -1.5, iterations,
    }),

    // SAC @ ORL — Wagner/Suggs/Black all out
    "nba-kings-magic": () => simulateBasketball({
      gameId, sport: "NBA",
      homeOffRtg: 114.2, homeDefRtg: 108.6,  // ORL good defense
      awayOffRtg: 106.8, awayDefRtg: 118.4,  // SAC terrible defense
      pace: 101.2,
      homeRestDays: 1, awayRestDays: 1,
      homeInjuries: [{ role: "star" }, { role: "starter" }, { role: "starter" }], // Wagner, Suggs, Black
      awayInjuries: [],
      spread: -15.5, iterations,
    }),

    // NCAA Sweet 16 — Texas vs Purdue
    "ncaa-texas-purdue": () => simulateBasketball({
      gameId, sport: "NCAAMB",
      homeOffRtg: 108.4, homeDefRtg: 98.2,  // Purdue elite defense
      awayOffRtg: 102.8, awayDefRtg: 105.6, // Texas solid
      pace: 68.2,
      spread: -7.5, iterations,
    }),

    // NCAA Sweet 16 — Iowa vs Nebraska
    "ncaa-iowa-nebraska": () => simulateBasketball({
      gameId, sport: "NCAAMB",
      homeOffRtg: 106.8, homeDefRtg: 102.4,
      awayOffRtg: 104.2, awayDefRtg: 104.8,
      pace: 67.8,
      spread: -1.5, iterations,
    }),

    // NCAA Sweet 16 — Arkansas vs Arizona
    "ncaa-arkansas-arizona": () => simulateBasketball({
      gameId, sport: "NCAAMB",
      homeOffRtg: 114.6, homeDefRtg: 100.8,  // Arizona excellent both ends
      awayOffRtg: 108.2, awayDefRtg: 106.4,
      pace: 71.4,
      spread: -7.5, iterations,
    }),

    // NCAA Sweet 16 — Illinois vs Houston
    "ncaa-illinois-houston": () => simulateBasketball({
      gameId, sport: "NCAAMB",
      homeOffRtg: 108.2, homeDefRtg: 98.8,  // Houston elite defense
      awayOffRtg: 109.6, awayDefRtg: 102.4,
      pace: 64.8,  // Both slow-paced
      spread: -2.5, iterations,
    }),

    // MLB — Guardians @ Mariners
    "mlb-cle-sea": () => simulateMLB({
      gameId,
      homeOffScore: 98, awayOffScore: 96,
      homeStarterERA: 3.42, awayStarterERA: 3.98,
      windSpeed: 8, windTowardsHitter: false,  // T-Mobile suppresses
      temperature: 58,
      spread: -1.5, iterations,
    }),

    // MLB — Diamondbacks @ Dodgers
    "mlb-ari-lad": () => simulateMLB({
      gameId,
      homeOffScore: 108, awayOffScore: 99,  // LAD elite offense
      homeStarterERA: 3.18, awayStarterERA: 4.12,
      windSpeed: 5, windTowardsHitter: false,
      temperature: 72,
      spread: -1.5, iterations,
    }),

    // MLB — Pirates @ Mets
    "mlb-pit-nym": () => simulateMLB({
      gameId,
      homeOffScore: 102, awayOffScore: 94,
      homeStarterERA: 3.86, awayStarterERA: 4.42,
      windSpeed: 10, windTowardsHitter: true,
      temperature: 64,
      spread: -1.5, iterations,
    }),
  };

  const runner = configs[gameId];
  return runner ? runner() : null;
}
