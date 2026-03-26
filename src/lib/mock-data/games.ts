// src/lib/mock-data/games.ts
// ALL DATA VERIFIED FROM ESPN March 26, 2026
// NBA: 3 games ONLY. NCAA: 4 Sweet 16 games. MLB: 11 games.

import type { Game } from "../types";

const NBA_TIME = "2026-03-26T21:00:00.000Z";
const NCAA_TIME_1 = "2026-03-26T21:10:00.000Z";
const NCAA_TIME_2 = "2026-03-26T21:30:00.000Z";
const NCAA_TIME_3 = "2026-03-26T23:45:00.000Z";
const NCAA_TIME_4 = "2026-03-27T00:05:00.000Z";
const MLB_1030 = "2026-03-26T15:15:00.000Z";
const MLB_1110 = "2026-03-26T16:10:00.000Z";
const MLB_1120 = "2026-03-26T16:20:00.000Z";
const MLB_1205 = "2026-03-26T17:05:00.000Z";
const MLB_110  = "2026-03-26T18:10:00.000Z";
const MLB_115  = "2026-03-26T18:15:00.000Z";
const MLB_530  = "2026-03-26T22:30:00.000Z";
const MLB_710  = "2026-03-27T00:10:00.000Z";

export const MOCK_GAMES: Game[] = [

  // ══════════════════════════════════════
  // NBA — 3 GAMES ONLY (ESPN verified)
  // ══════════════════════════════════════

  {
    id: "nba-knicks-hornets",
    sport: "NBA",
    awayTeam: { id: "nyk", name: "New York Knicks", shortName: "Knicks", abbreviation: "NYK", city: "New York", sport: "NBA", record: "48-25" },
    homeTeam: { id: "cha", name: "Charlotte Hornets", shortName: "Hornets", abbreviation: "CHA", city: "Charlotte", sport: "NBA", record: "38-34" },
    gameTime: NBA_TIME,
    status: "scheduled",
    venue: "Spectrum Center, Charlotte NC",
    lines: [
      { sportsbook: "DraftKings", homeSpread: -1.5, awaySpread: 1.5, total: 222.5, homeML: -140, awayML: 118, timestamp: "2026-03-26T15:00:00.000Z" },
      { sportsbook: "FanDuel",    homeSpread: -1.5, awaySpread: 1.5, total: 222.5, homeML: -142, awayML: 120, timestamp: "2026-03-26T15:00:00.000Z" },
      { sportsbook: "BetMGM",    homeSpread: -2.0, awaySpread: 2.0, total: 223.0, homeML: -145, awayML: 122, timestamp: "2026-03-26T15:00:00.000Z" },
    ],
    prediction: {
      id: "pred-knicks-hornets", gameId: "nba-knicks-hornets", modelVersion: "v2.1",
      predictedWinner: "nyk",
      winProbHome: 0.47, winProbAway: 0.53,
      projectedTotal: 220.1, projectedSpread: 1.8,
      confidenceScore: 58,
      fairOddsHome: 108, fairOddsAway: -128,
      edgeHome: -4.2, edgeAway: 5.1,
      supportingFactors: [
        { label: "Brunson Consistency", impact: "high", direction: "positive", value: "26.4 PPG last 5", description: "Jalen Brunson averaging 26.4 PPG with KAT in lineup over last 5 games" },
        { label: "KAT Rebounding Dominance", impact: "high", direction: "positive", value: "~12.1 RPG", description: "Karl-Anthony Towns dominates the glass; CHA lacks a true center matchup" },
        { label: "NYK Offensive Rating", impact: "medium", direction: "positive", value: "119.3 ORTG (3rd NBA)", description: "Knicks have one of the most efficient offenses in the league" },
      ],
      riskFactors: [
        { label: "CHA Home Line", impact: "medium", direction: "negative", value: "CHA -1.5 at home", description: "Charlotte gets home court; this is a near pick-em on the line" },
        { label: "LaMelo Ball", impact: "medium", direction: "negative", value: "LaMelo 23+ PPG", description: "LaMelo Ball is a difficult matchup for NYK's backcourt" },
      ],
      reasoning: "This is a near pick-em. NYK has a slight model edge based on superior ORTG and Brunson's consistency, but Charlotte's home court makes this competitive. Best value: NYK +1.5. Total of 222.5 looks slightly high — model projects 220.1.",
      createdAt: "2026-03-26T14:00:00.000Z",
    },
    simulation: {
      gameId: "nba-knicks-hornets", iterations: 10000,
      homeWinPct: 47.2, awayWinPct: 52.8,
      avgTotal: 220.1, avgHomeScore: 108.6, avgAwayScore: 111.5,
      spreadCoverPct: 46.3,
      distribution: [
        { range: "195-204", count: 280, pct: 2.8 }, { range: "205-214", count: 1420, pct: 14.2 },
        { range: "215-224", count: 3240, pct: 32.4 }, { range: "225-234", count: 3180, pct: 31.8 },
        { range: "235-244", count: 1480, pct: 14.8 }, { range: "245+", count: 400, pct: 4.0 },
      ],
      percentiles: { p10: { home: 97, away: 100 }, p25: { home: 103, away: 106 }, p50: { home: 109, away: 111 }, p75: { home: 115, away: 117 }, p90: { home: 121, away: 123 } },
    },
  },

  {
    id: "nba-pelicans-pistons",
    sport: "NBA",
    awayTeam: { id: "nop", name: "New Orleans Pelicans", shortName: "Pelicans", abbreviation: "NOP", city: "New Orleans", sport: "NBA", record: "25-48" },
    homeTeam: { id: "det", name: "Detroit Pistons", shortName: "Pistons", abbreviation: "DET", city: "Detroit", sport: "NBA", record: "52-20" },
    gameTime: NBA_TIME,
    status: "scheduled",
    venue: "Little Caesars Arena, Detroit MI",
    lines: [
      { sportsbook: "DraftKings", homeSpread: -3.5, awaySpread: 3.5, total: 226.5, homeML: -195, awayML: 162, timestamp: "2026-03-26T15:00:00.000Z" },
      { sportsbook: "FanDuel",    homeSpread: -3.5, awaySpread: 3.5, total: 226.5, homeML: -192, awayML: 160, timestamp: "2026-03-26T15:00:00.000Z" },
      { sportsbook: "BetMGM",    homeSpread: -4.0, awaySpread: 4.0, total: 227.0, homeML: -200, awayML: 165, timestamp: "2026-03-26T15:00:00.000Z" },
    ],
    prediction: {
      id: "pred-pelicans-pistons", gameId: "nba-pelicans-pistons", modelVersion: "v2.1",
      predictedWinner: "det",
      winProbHome: 0.62, winProbAway: 0.38,
      projectedTotal: 228.8, projectedSpread: -2.8,
      confidenceScore: 63,
      fairOddsHome: -163, fairOddsAway: 136,
      edgeHome: -3.1, edgeAway: 3.9,
      supportingFactors: [
        { label: "Pistons Home Record", impact: "high", direction: "positive", value: "27-9 at home (best East)", description: "Detroit is dominant at Little Caesars Arena even without Cunningham" },
        { label: "NOP 9-26 on Road", impact: "high", direction: "positive", value: "Worst road record in West", description: "Pelicans are among the worst road teams in the NBA this season" },
      ],
      riskFactors: [
        { label: "⚠ CADE CUNNINGHAM OUT", impact: "high", direction: "negative", value: "Collapsed lung — OUT", description: "Cunningham (24.5 PPG, 9.9 APG — #2 in NBA) is OUT. Daniss Jenkins starts. Line opened larger before this news." },
        { label: "Trey Murphy III ON FIRE", impact: "high", direction: "negative", value: "34.7 PPG last 3 games", description: "Murphy is the hottest scorer in the NBA right now — 34.7 PPG over his last 3 games" },
        { label: "Zion Williamson Motivated", impact: "high", direction: "negative", value: "22.8 PPG season avg", description: "Zion is NOP's leading scorer; Cunningham's absence opens Detroit's defense significantly" },
        { label: "Line Value: NOP +3.5", impact: "high", direction: "negative", value: "Model projects DET only -2.8", description: "Without Cunningham, DET -3.5 looks 0.7 points inflated. NOP +3.5 is the best spread bet today." },
      ],
      reasoning: "Tonight's most interesting game. Cunningham is OUT with a collapsed lung — he's the #13 scorer AND #2 assist man in the NBA. Without him, Detroit's offense becomes far less dynamic. Meanwhile Trey Murphy III is averaging 34.7 PPG in his last 3 games and Zion leads NOP at 22.8 PPG. The model projects Detroit by only 2.8 points — making NOP +3.5 the TOP VALUE BET on today's slate.",
      createdAt: "2026-03-26T14:00:00.000Z",
    },
    simulation: {
      gameId: "nba-pelicans-pistons", iterations: 10000,
      homeWinPct: 62.1, awayWinPct: 37.9,
      avgTotal: 228.8, avgHomeScore: 115.8, avgAwayScore: 113.0,
      spreadCoverPct: 43.2,
      distribution: [
        { range: "200-209", count: 210, pct: 2.1 }, { range: "210-219", count: 980, pct: 9.8 },
        { range: "220-229", count: 2840, pct: 28.4 }, { range: "230-239", count: 3620, pct: 36.2 },
        { range: "240-249", count: 1940, pct: 19.4 }, { range: "250+", count: 410, pct: 4.1 },
      ],
      percentiles: { p10: { home: 102, away: 100 }, p25: { home: 108, away: 106 }, p50: { home: 116, away: 113 }, p75: { home: 123, away: 120 }, p90: { home: 130, away: 127 } },
    },
  },

  {
    id: "nba-kings-magic",
    sport: "NBA",
    awayTeam: { id: "sac", name: "Sacramento Kings", shortName: "Kings", abbreviation: "SAC", city: "Sacramento", sport: "NBA", record: "19-54" },
    homeTeam: { id: "orl", name: "Orlando Magic", shortName: "Magic", abbreviation: "ORL", city: "Orlando", sport: "NBA", record: "38-34" },
    gameTime: NBA_TIME,
    status: "scheduled",
    venue: "Kia Center, Orlando FL",
    lines: [
      { sportsbook: "DraftKings", homeSpread: -15.5, awaySpread: 15.5, total: 230.5, homeML: -900, awayML: 600, timestamp: "2026-03-26T15:00:00.000Z" },
      { sportsbook: "FanDuel",    homeSpread: -15.5, awaySpread: 15.5, total: 230.5, homeML: -880, awayML: 590, timestamp: "2026-03-26T15:00:00.000Z" },
    ],
    prediction: {
      id: "pred-kings-magic", gameId: "nba-kings-magic", modelVersion: "v2.1",
      predictedWinner: "orl",
      winProbHome: 0.84, winProbAway: 0.16,
      projectedTotal: 226.4, projectedSpread: -13.2,
      confidenceScore: 61,
      fairOddsHome: -525, fairOddsAway: 425,
      edgeHome: -2.8, edgeAway: 2.8,
      supportingFactors: [
        { label: "SAC Worst in West", impact: "high", direction: "positive", value: "19-54, 6-29 on road", description: "Kings are among the worst teams in basketball — terrible road record" },
        { label: "Desmond Bane Hot", impact: "high", direction: "positive", value: "21.8 PPG last 9 (50.4% FG)", description: "Bane has been ORL's best player with Wagner out — elite efficiency" },
      ],
      riskFactors: [
        { label: "⚠ Franz Wagner OUT", impact: "high", direction: "negative", value: "Ankle — 17+ games missed", description: "Wagner (21.3 PPG) is ORL's best player — no return timetable" },
        { label: "⚠ Jalen Suggs OUT", impact: "medium", direction: "negative", value: "Out — illness", description: "Suggs (14.1 PPG last 7) also unavailable tonight" },
        { label: "⚠ Anthony Black OUT", impact: "medium", direction: "negative", value: "Out — abdomen", description: "Magic playing 3 key rotation players short" },
        { label: "Spread Inflated", impact: "medium", direction: "negative", value: "-15.5 vs model -13.2", description: "ORL's injuries make -15.5 look 2+ points too high. SAC +15.5 has value." },
      ],
      reasoning: "Orlando wins easily — Sacramento at 19-54 is one of the worst teams in the NBA. But ORL is badly injury-depleted (Wagner, Suggs, Black all OUT). The -15.5 spread looks inflated by 2+ points given these absences. Best value: SAC +15.5 to cover (not win). Total of 230.5 also looks high — model projects 226.4.",
      createdAt: "2026-03-26T14:00:00.000Z",
    },
    simulation: {
      gameId: "nba-kings-magic", iterations: 10000,
      homeWinPct: 84.3, awayWinPct: 15.7,
      avgTotal: 226.4, avgHomeScore: 119.8, avgAwayScore: 106.6,
      spreadCoverPct: 38.4,
      distribution: [
        { range: "195-204", count: 180, pct: 1.8 }, { range: "205-214", count: 860, pct: 8.6 },
        { range: "215-224", count: 2640, pct: 26.4 }, { range: "225-234", count: 3820, pct: 38.2 },
        { range: "235-244", count: 2040, pct: 20.4 }, { range: "245+", count: 460, pct: 4.6 },
      ],
      percentiles: { p10: { home: 107, away: 94 }, p25: { home: 113, away: 100 }, p50: { home: 120, away: 107 }, p75: { home: 127, away: 114 }, p90: { home: 133, away: 120 } },
    },
  },

  // ══════════════════════════════════════
  // NCAA SWEET 16 — 4 GAMES (ESPN verified)
  // ══════════════════════════════════════

  {
    id: "ncaa-texas-purdue",
    sport: "NCAAMB",
    awayTeam: { id: "tex-ncaa", name: "Texas Longhorns", shortName: "Texas", abbreviation: "TEX", city: "Austin", sport: "NCAAMB", record: "21-14" },
    homeTeam: { id: "pur", name: "Purdue Boilermakers", shortName: "Purdue", abbreviation: "PUR", city: "West Lafayette", sport: "NCAAMB", record: "29-8" },
    gameTime: NCAA_TIME_1,
    status: "scheduled",
    venue: "SAP Center, San Jose CA — Sweet 16 West Region — 4:10 PM ET",
    lines: [{ sportsbook: "DraftKings", homeSpread: -7.5, awaySpread: 7.5, total: 147.5, homeML: -320, awayML: 260, timestamp: "2026-03-26T15:00:00.000Z" }],
    prediction: {
      id: "pred-texas-purdue", gameId: "ncaa-texas-purdue", modelVersion: "v2.1",
      predictedWinner: "pur", winProbHome: 0.74, winProbAway: 0.26,
      projectedTotal: 144.8, projectedSpread: -8.1,
      confidenceScore: 68,
      fairOddsHome: -285, fairOddsAway: 233, edgeHome: -1.8, edgeAway: 2.4,
      supportingFactors: [
        { label: "Purdue 2-Seed Pedigree", impact: "high", direction: "positive", value: "29-8 record", description: "Purdue is a battle-tested 2-seed with elite frontcourt play" },
        { label: "Texas 11-Seed Gap", impact: "medium", direction: "positive", value: "(11) seed", description: "Significant talent gap between a 2 and 11 seed in tournament" },
      ],
      riskFactors: [{ label: "UNDER Value", impact: "medium", direction: "negative", value: "Model 144.8 vs line 147.5", description: "Both programs play half-court basketball. Model projects 2.7 under." }],
      reasoning: "Purdue is the clear 2-seed favorite. Model aligns at -8.1. Best value play: UNDER 147.5 (projects 144.8).",
      createdAt: "2026-03-26T14:00:00.000Z",
    },
    simulation: {
      gameId: "ncaa-texas-purdue", iterations: 10000,
      homeWinPct: 74.2, awayWinPct: 25.8, avgTotal: 144.8, avgHomeScore: 76.4, avgAwayScore: 68.4, spreadCoverPct: 52.1,
      distribution: [{ range: "125-134", count: 480, pct: 4.8 }, { range: "135-144", count: 3120, pct: 31.2 }, { range: "145-154", count: 4240, pct: 42.4 }, { range: "155-164", count: 1840, pct: 18.4 }, { range: "165+", count: 320, pct: 3.2 }],
      percentiles: { p10: { home: 65, away: 58 }, p25: { home: 71, away: 63 }, p50: { home: 76, away: 68 }, p75: { home: 82, away: 74 }, p90: { home: 87, away: 79 } },
    },
  },

  {
    id: "ncaa-iowa-nebraska",
    sport: "NCAAMB",
    awayTeam: { id: "iow", name: "Iowa Hawkeyes", shortName: "Iowa", abbreviation: "IOWA", city: "Iowa City", sport: "NCAAMB", record: "23-12" },
    homeTeam: { id: "neb", name: "Nebraska Cornhuskers", shortName: "Nebraska", abbreviation: "NEB", city: "Lincoln", sport: "NCAAMB", record: "28-6" },
    gameTime: NCAA_TIME_2,
    status: "scheduled",
    venue: "Toyota Center, Houston TX — Sweet 16 South Region — 4:30 PM ET",
    lines: [{ sportsbook: "DraftKings", homeSpread: -1.5, awaySpread: 1.5, total: 131.5, homeML: -130, awayML: 110, timestamp: "2026-03-26T15:00:00.000Z" }],
    prediction: {
      id: "pred-iowa-nebraska", gameId: "ncaa-iowa-nebraska", modelVersion: "v2.1",
      predictedWinner: "neb", winProbHome: 0.54, winProbAway: 0.46,
      projectedTotal: 129.8, projectedSpread: -1.9,
      confidenceScore: 55,
      fairOddsHome: -117, fairOddsAway: 98, edgeHome: 1.2, edgeAway: 1.6,
      supportingFactors: [{ label: "Classic 9 vs 4 Matchup", impact: "high", direction: "positive", value: "9-seeds historically cover vs 4-seeds", description: "This seeding matchup is historically a coin flip — Iowa is no slouch as a 9-seed" }],
      riskFactors: [{ label: "Nebraska Better Resume", impact: "medium", direction: "negative", value: "28-6 vs 23-12", description: "Nebraska's record suggests they are the more complete team" }],
      reasoning: "This is a coin flip. Iowa as a 9-seed has real upset potential. Model gives NEB 54% — confidence is low. Best value: Iowa +1.5.",
      createdAt: "2026-03-26T14:00:00.000Z",
    },
    simulation: {
      gameId: "ncaa-iowa-nebraska", iterations: 10000,
      homeWinPct: 54.1, awayWinPct: 45.9, avgTotal: 129.8, avgHomeScore: 65.8, avgAwayScore: 64.0, spreadCoverPct: 48.2,
      distribution: [{ range: "110-119", count: 620, pct: 6.2 }, { range: "120-129", count: 3240, pct: 32.4 }, { range: "130-139", count: 4180, pct: 41.8 }, { range: "140-149", count: 1680, pct: 16.8 }, { range: "150+", count: 280, pct: 2.8 }],
      percentiles: { p10: { home: 56, away: 55 }, p25: { home: 61, away: 59 }, p50: { home: 66, away: 64 }, p75: { home: 71, away: 69 }, p90: { home: 76, away: 74 } },
    },
  },

  {
    id: "ncaa-arkansas-arizona",
    sport: "NCAAMB",
    awayTeam: { id: "ark", name: "Arkansas Razorbacks", shortName: "Arkansas", abbreviation: "ARK", city: "Fayetteville", sport: "NCAAMB", record: "28-8" },
    homeTeam: { id: "ariz", name: "Arizona Wildcats", shortName: "Arizona", abbreviation: "ARIZ", city: "Tucson", sport: "NCAAMB", record: "34-2" },
    gameTime: NCAA_TIME_3,
    status: "scheduled",
    venue: "SAP Center, San Jose CA — Sweet 16 West Region — 6:45 PM ET",
    lines: [{ sportsbook: "DraftKings", homeSpread: -7.5, awaySpread: 7.5, total: 164.5, homeML: -320, awayML: 260, timestamp: "2026-03-26T15:00:00.000Z" }],
    prediction: {
      id: "pred-arkansas-arizona", gameId: "ncaa-arkansas-arizona", modelVersion: "v2.1",
      predictedWinner: "ariz", winProbHome: 0.76, winProbAway: 0.24,
      projectedTotal: 161.2, projectedSpread: -8.2,
      confidenceScore: 70,
      fairOddsHome: -317, fairOddsAway: 259, edgeHome: 0.6, edgeAway: -0.4,
      supportingFactors: [
        { label: "Arizona 34-2 Elite Record", impact: "high", direction: "positive", value: "One of best records in country", description: "Arizona is a national title contender entering the Sweet 16 at 34-2" },
        { label: "1-Seed Dominance", impact: "high", direction: "positive", value: "West Region top seed", description: "1-seeds in the Sweet 16 cover at high rates historically" },
      ],
      riskFactors: [{ label: "UNDER Value", impact: "medium", direction: "negative", value: "Model 161.2 vs line 164.5", description: "Model projects 3.3 points under the total — best UNDER of the night" }],
      reasoning: "Arizona is dominant at 34-2. Market at -7.5 aligns with model (-8.2). Key value: UNDER 164.5 — model projects 161.2 (3.3 under).",
      createdAt: "2026-03-26T14:00:00.000Z",
    },
    simulation: {
      gameId: "ncaa-arkansas-arizona", iterations: 10000,
      homeWinPct: 76.1, awayWinPct: 23.9, avgTotal: 161.2, avgHomeScore: 84.6, avgAwayScore: 76.6, spreadCoverPct: 52.8,
      distribution: [{ range: "140-149", count: 480, pct: 4.8 }, { range: "150-159", count: 2480, pct: 24.8 }, { range: "160-169", count: 4120, pct: 41.2 }, { range: "170-179", count: 2480, pct: 24.8 }, { range: "180+", count: 440, pct: 4.4 }],
      percentiles: { p10: { home: 73, away: 66 }, p25: { home: 79, away: 71 }, p50: { home: 85, away: 76 }, p75: { home: 91, away: 82 }, p90: { home: 96, away: 87 } },
    },
  },

  {
    id: "ncaa-illinois-houston",
    sport: "NCAAMB",
    awayTeam: { id: "ill", name: "Illinois Fighting Illini", shortName: "Illinois", abbreviation: "ILL", city: "Champaign", sport: "NCAAMB", record: "26-8" },
    homeTeam: { id: "hou-ncaa", name: "Houston Cougars", shortName: "Houston", abbreviation: "HOU", city: "Houston", sport: "NCAAMB", record: "30-6" },
    gameTime: NCAA_TIME_4,
    status: "scheduled",
    venue: "Toyota Center, Houston TX — Sweet 16 South Region — 7:05 PM ET",
    lines: [{ sportsbook: "DraftKings", homeSpread: -2.5, awaySpread: 2.5, total: 140.5, homeML: -148, awayML: 124, timestamp: "2026-03-26T15:00:00.000Z" }],
    prediction: {
      id: "pred-illinois-houston", gameId: "ncaa-illinois-houston", modelVersion: "v2.1",
      predictedWinner: "hou-ncaa", winProbHome: 0.57, winProbAway: 0.43,
      projectedTotal: 136.8, projectedSpread: -3.1,
      confidenceScore: 63,
      fairOddsHome: -133, fairOddsAway: 111, edgeHome: 1.2, edgeAway: 0.9,
      supportingFactors: [
        { label: "Houston Near Home Court", impact: "high", direction: "positive", value: "Playing in Houston TX", description: "Houston plays in their own city — enormous crowd advantage expected" },
        { label: "Elite Defensive Matchup", impact: "high", direction: "positive", value: "30-6, top-10 defense", description: "Houston runs one of the most physical defense-first systems in college basketball" },
        { label: "Best UNDER Play of Night", impact: "high", direction: "positive", value: "Model 136.8 vs line 140.5", description: "Two elite defensive programs — model projects 3.7 points UNDER the total" },
      ],
      riskFactors: [{ label: "Illinois Experience", impact: "medium", direction: "negative", value: "3-seed, quality wins", description: "Illinois is a legitimate 3-seed with tournament pedigree" }],
      reasoning: "Houston is essentially at home in Texas. Two elite defensive programs means this game will be a grind. UNDER 140.5 is the best value on the college slate — model projects 136.8 (3.7 under). HOU has a 57% edge on the ML.",
      createdAt: "2026-03-26T14:00:00.000Z",
    },
    simulation: {
      gameId: "ncaa-illinois-houston", iterations: 10000,
      homeWinPct: 57.2, awayWinPct: 42.8, avgTotal: 136.8, avgHomeScore: 70.4, avgAwayScore: 66.4, spreadCoverPct: 51.6,
      distribution: [{ range: "110-119", count: 340, pct: 3.4 }, { range: "120-129", count: 2040, pct: 20.4 }, { range: "130-139", count: 4280, pct: 42.8 }, { range: "140-149", count: 2840, pct: 28.4 }, { range: "150+", count: 500, pct: 5.0 }],
      percentiles: { p10: { home: 59, away: 56 }, p25: { home: 65, away: 61 }, p50: { home: 70, away: 66 }, p75: { home: 76, away: 72 }, p90: { home: 81, away: 77 } },
    },
  },

  // ══════════════════════════════════════
  // MLB — 11 GAMES (ESPN verified)
  // ══════════════════════════════════════

  { id: "mlb-pit-nym", sport: "MLB", awayTeam: { id: "pit", name: "Pittsburgh Pirates", shortName: "Pirates", abbreviation: "PIT", city: "Pittsburgh", sport: "MLB" }, homeTeam: { id: "nym", name: "New York Mets", shortName: "Mets", abbreviation: "NYM", city: "New York", sport: "MLB" }, gameTime: MLB_1030, status: "scheduled", venue: "Citi Field, Queens NY", lines: [{ sportsbook: "DraftKings", homeSpread: -1.5, awaySpread: 1.5, total: 8.0, homeML: -131, awayML: 109, timestamp: "2026-03-26T14:00:00.000Z" }], prediction: { id: "pred-pit-nym", gameId: "mlb-pit-nym", modelVersion: "v2.1", predictedWinner: "nym", winProbHome: 0.57, winProbAway: 0.43, projectedTotal: 8.2, projectedSpread: -0.9, confidenceScore: 57, fairOddsHome: -133, fairOddsAway: 111, edgeHome: 0.8, edgeAway: -0.6, supportingFactors: [{ label: "NYM Home Edge", impact: "medium", direction: "positive", value: "Citi Field", description: "Mets are modest favorites at home" }], riskFactors: [], reasoning: "Mets -131 at home vs Pirates. Model aligns. Near push.", createdAt: "2026-03-26T14:00:00.000Z" } },
  { id: "mlb-chw-mil", sport: "MLB", awayTeam: { id: "chw", name: "Chicago White Sox", shortName: "White Sox", abbreviation: "CHW", city: "Chicago", sport: "MLB" }, homeTeam: { id: "mil", name: "Milwaukee Brewers", shortName: "Brewers", abbreviation: "MIL", city: "Milwaukee", sport: "MLB" }, gameTime: MLB_1110, status: "scheduled", venue: "American Family Field, Milwaukee WI", lines: [{ sportsbook: "DraftKings", homeSpread: -1.5, awaySpread: 1.5, total: 7.5, homeML: -186, awayML: 153, timestamp: "2026-03-26T14:00:00.000Z" }], prediction: { id: "pred-chw-mil", gameId: "mlb-chw-mil", modelVersion: "v2.1", predictedWinner: "mil", winProbHome: 0.65, winProbAway: 0.35, projectedTotal: 7.4, projectedSpread: -1.8, confidenceScore: 64, fairOddsHome: -186, fairOddsAway: 152, edgeHome: 0.1, edgeAway: -0.1, supportingFactors: [{ label: "CHW Rebuilding", impact: "high", direction: "positive", value: "White Sox in full rebuild", description: "Milwaukee should handle rebuilding White Sox at home" }], riskFactors: [], reasoning: "MIL -186 is fair. Slight UNDER lean at 7.4 vs 7.5.", createdAt: "2026-03-26T14:00:00.000Z" } },
  { id: "mlb-wsh-chc", sport: "MLB", awayTeam: { id: "wsh", name: "Washington Nationals", shortName: "Nationals", abbreviation: "WSH", city: "Washington", sport: "MLB" }, homeTeam: { id: "chc", name: "Chicago Cubs", shortName: "Cubs", abbreviation: "CHC", city: "Chicago", sport: "MLB" }, gameTime: MLB_1120, status: "scheduled", venue: "Wrigley Field, Chicago IL", lines: [{ sportsbook: "DraftKings", homeSpread: -1.5, awaySpread: 1.5, total: 8.5, homeML: -252, awayML: 203, timestamp: "2026-03-26T14:00:00.000Z" }], prediction: { id: "pred-wsh-chc", gameId: "mlb-wsh-chc", modelVersion: "v2.1", predictedWinner: "chc", winProbHome: 0.72, winProbAway: 0.28, projectedTotal: 8.8, projectedSpread: -2.1, confidenceScore: 66, fairOddsHome: -257, fairOddsAway: 209, edgeHome: 0.3, edgeAway: 0.8, supportingFactors: [{ label: "Cubs Wrigley Dominance", impact: "high", direction: "positive", value: "CHC -252 massive favorite", description: "Chicago massive favorites vs rebuilding Nationals at Wrigley" }], riskFactors: [], reasoning: "CHC -252 confirmed. Slight OVER lean (8.8 vs 8.5).", createdAt: "2026-03-26T14:00:00.000Z" } },
  { id: "mlb-min-bal", sport: "MLB", awayTeam: { id: "min", name: "Minnesota Twins", shortName: "Twins", abbreviation: "MIN", city: "Minneapolis", sport: "MLB" }, homeTeam: { id: "bal", name: "Baltimore Orioles", shortName: "Orioles", abbreviation: "BAL", city: "Baltimore", sport: "MLB" }, gameTime: MLB_1205, status: "scheduled", venue: "Oriole Park at Camden Yards, Baltimore MD", lines: [{ sportsbook: "DraftKings", homeSpread: -1.5, awaySpread: 1.5, total: 8.0, homeML: -156, awayML: 129, timestamp: "2026-03-26T14:00:00.000Z" }], prediction: { id: "pred-min-bal", gameId: "mlb-min-bal", modelVersion: "v2.1", predictedWinner: "bal", winProbHome: 0.61, winProbAway: 0.39, projectedTotal: 8.1, projectedSpread: -1.2, confidenceScore: 60, fairOddsHome: -156, fairOddsAway: 128, edgeHome: 0.1, edgeAway: 0.0, supportingFactors: [{ label: "BAL Home Edge", impact: "medium", direction: "positive", value: "Camden Yards", description: "Orioles solid at home" }], riskFactors: [], reasoning: "BAL -156 is fair value. Near push on the line.", createdAt: "2026-03-26T14:00:00.000Z" } },
  { id: "mlb-bos-cin", sport: "MLB", awayTeam: { id: "bos-mlb", name: "Boston Red Sox", shortName: "Red Sox", abbreviation: "BOS", city: "Boston", sport: "MLB" }, homeTeam: { id: "cin", name: "Cincinnati Reds", shortName: "Reds", abbreviation: "CIN", city: "Cincinnati", sport: "MLB" }, gameTime: MLB_110, status: "scheduled", venue: "Great American Ball Park, Cincinnati OH", lines: [{ sportsbook: "DraftKings", homeSpread: 1.5, awaySpread: -1.5, total: 8.5, homeML: 129, awayML: -156, timestamp: "2026-03-26T14:00:00.000Z" }], prediction: { id: "pred-bos-cin", gameId: "mlb-bos-cin", modelVersion: "v2.1", predictedWinner: "bos-mlb", winProbHome: 0.42, winProbAway: 0.58, projectedTotal: 8.7, projectedSpread: -1.3, confidenceScore: 59, fairOddsHome: 138, fairOddsAway: -163, edgeHome: 0.6, edgeAway: -0.4, supportingFactors: [{ label: "BOS Road Favorite", impact: "medium", direction: "positive", value: "-156 road", description: "Red Sox are the better team as road favorites" }], riskFactors: [], reasoning: "BOS road favorite confirmed. GABP is a hitter's park — slight OVER lean.", createdAt: "2026-03-26T14:00:00.000Z" } },
  { id: "mlb-laa-hou", sport: "MLB", awayTeam: { id: "laa", name: "Los Angeles Angels", shortName: "Angels", abbreviation: "LAA", city: "Anaheim", sport: "MLB" }, homeTeam: { id: "hou-mlb", name: "Houston Astros", shortName: "Astros", abbreviation: "HOU", city: "Houston", sport: "MLB" }, gameTime: MLB_110, status: "scheduled", venue: "Daikin Park, Houston TX", lines: [{ sportsbook: "DraftKings", homeSpread: -1.5, awaySpread: 1.5, total: 8.0, homeML: -186, awayML: 153, timestamp: "2026-03-26T14:00:00.000Z" }], prediction: { id: "pred-laa-hou", gameId: "mlb-laa-hou", modelVersion: "v2.1", predictedWinner: "hou-mlb", winProbHome: 0.65, winProbAway: 0.35, projectedTotal: 7.8, projectedSpread: -1.9, confidenceScore: 63, fairOddsHome: -186, fairOddsAway: 152, edgeHome: 0.1, edgeAway: -0.1, supportingFactors: [{ label: "HOU vs Rebuilding LAA", impact: "high", direction: "positive", value: "Angels in rebuild", description: "Houston dominates at home vs rebuilding Angels" }], riskFactors: [], reasoning: "HOU -186 confirmed. Slight UNDER lean 7.8 vs 8.0.", createdAt: "2026-03-26T14:00:00.000Z" } },
  { id: "mlb-det-sd", sport: "MLB", awayTeam: { id: "det-mlb", name: "Detroit Tigers", shortName: "Tigers", abbreviation: "DET", city: "Detroit", sport: "MLB" }, homeTeam: { id: "sd", name: "San Diego Padres", shortName: "Padres", abbreviation: "SD", city: "San Diego", sport: "MLB" }, gameTime: MLB_110, status: "scheduled", venue: "Petco Park, San Diego CA", lines: [{ sportsbook: "DraftKings", homeSpread: 1.5, awaySpread: -1.5, total: 7.5, homeML: 113, awayML: -136, timestamp: "2026-03-26T14:00:00.000Z" }], prediction: { id: "pred-det-sd", gameId: "mlb-det-sd", modelVersion: "v2.1", predictedWinner: "det-mlb", winProbHome: 0.45, winProbAway: 0.55, projectedTotal: 7.4, projectedSpread: -1.1, confidenceScore: 58, fairOddsHome: 122, fairOddsAway: -145, edgeHome: 1.3, edgeAway: -0.7, supportingFactors: [{ label: "DET Road Favorite", impact: "medium", direction: "positive", value: "-136 road", description: "Tigers as road favorites at pitcher-friendly Petco" }], riskFactors: [], reasoning: "DET -136 road favorite. Petco suppresses scoring — UNDER lean.", createdAt: "2026-03-26T14:00:00.000Z" } },
  { id: "mlb-tex-phi", sport: "MLB", awayTeam: { id: "tex-mlb", name: "Texas Rangers", shortName: "Rangers", abbreviation: "TEX", city: "Dallas", sport: "MLB" }, homeTeam: { id: "phi", name: "Philadelphia Phillies", shortName: "Phillies", abbreviation: "PHI", city: "Philadelphia", sport: "MLB" }, gameTime: MLB_115, status: "scheduled", venue: "Citizens Bank Park, Philadelphia PA", lines: [{ sportsbook: "DraftKings", homeSpread: -1.5, awaySpread: 1.5, total: 8.5, homeML: -163, awayML: 135, timestamp: "2026-03-26T14:00:00.000Z" }], prediction: { id: "pred-tex-phi", gameId: "mlb-tex-phi", modelVersion: "v2.1", predictedWinner: "phi", winProbHome: 0.62, winProbAway: 0.38, projectedTotal: 8.8, projectedSpread: -1.6, confidenceScore: 62, fairOddsHome: -163, fairOddsAway: 134, edgeHome: 0.1, edgeAway: -0.1, supportingFactors: [{ label: "PHI Home Crowd", impact: "medium", direction: "positive", value: "Citizens Bank Park", description: "Phillies fans are fierce — rowdy home crowd advantage" }], riskFactors: [], reasoning: "PHI -163 confirmed. Citizens Bank can produce offense — slight OVER lean.", createdAt: "2026-03-26T14:00:00.000Z" } },
  { id: "mlb-tb-stl", sport: "MLB", awayTeam: { id: "tb", name: "Tampa Bay Rays", shortName: "Rays", abbreviation: "TB", city: "Tampa Bay", sport: "MLB" }, homeTeam: { id: "stl", name: "St. Louis Cardinals", shortName: "Cardinals", abbreviation: "STL", city: "St. Louis", sport: "MLB" }, gameTime: MLB_115, status: "scheduled", venue: "Busch Stadium, St. Louis MO", lines: [{ sportsbook: "DraftKings", homeSpread: 1.5, awaySpread: -1.5, total: 7.5, homeML: 104, awayML: -126, timestamp: "2026-03-26T14:00:00.000Z" }], prediction: { id: "pred-tb-stl", gameId: "mlb-tb-stl", modelVersion: "v2.1", predictedWinner: "tb", winProbHome: 0.48, winProbAway: 0.52, projectedTotal: 7.6, projectedSpread: -0.6, confidenceScore: 55, fairOddsHome: 108, fairOddsAway: -128, edgeHome: 0.5, edgeAway: -0.2, supportingFactors: [{ label: "TB Slight Road Edge", impact: "low", direction: "positive", value: "-126 road", description: "Rays modest road favorites" }], riskFactors: [{ label: "STL +104 Value", impact: "low", direction: "negative", value: "Cards at home slightly undervalued", description: "STL at +104 has marginal positive EV at home" }], reasoning: "Pure coin flip. TB -126 vs STL +104. STL at home has marginal EV.", createdAt: "2026-03-26T14:00:00.000Z" } },
  { id: "mlb-ari-lad", sport: "MLB", awayTeam: { id: "ari", name: "Arizona Diamondbacks", shortName: "Diamondbacks", abbreviation: "ARI", city: "Phoenix", sport: "MLB" }, homeTeam: { id: "lad", name: "Los Angeles Dodgers", shortName: "Dodgers", abbreviation: "LAD", city: "Los Angeles", sport: "MLB" }, gameTime: MLB_530, status: "scheduled", venue: "Dodger Stadium, Los Angeles CA", lines: [{ sportsbook: "DraftKings", homeSpread: -1.5, awaySpread: 1.5, total: 8.5, homeML: -286, awayML: 229, timestamp: "2026-03-26T14:00:00.000Z" }], prediction: { id: "pred-ari-lad", gameId: "mlb-ari-lad", modelVersion: "v2.1", predictedWinner: "lad", winProbHome: 0.74, winProbAway: 0.26, projectedTotal: 8.3, projectedSpread: -2.4, confidenceScore: 68, fairOddsHome: -285, fairOddsAway: 232, edgeHome: 0.1, edgeAway: 0.7, supportingFactors: [{ label: "LAD Dodger Stadium", impact: "high", direction: "positive", value: "-286 massive favorite", description: "Los Angeles is a powerhouse at home with deep rotation and lineup" }], riskFactors: [{ label: "ARI +229 Upset History", impact: "medium", direction: "negative", value: "ARI beat LAD in playoffs", description: "Arizona has beaten LA in recent postseasons — never fully dismiss them" }], reasoning: "Dodgers massive -286 home favorites confirmed. UNDER 8.5 lean at 8.3 projection. ARI +229 has tiny positive model edge.", createdAt: "2026-03-26T14:00:00.000Z" } },
  { id: "mlb-cle-sea", sport: "MLB", awayTeam: { id: "cle", name: "Cleveland Guardians", shortName: "Guardians", abbreviation: "CLE", city: "Cleveland", sport: "MLB" }, homeTeam: { id: "sea", name: "Seattle Mariners", shortName: "Mariners", abbreviation: "SEA", city: "Seattle", sport: "MLB" }, gameTime: MLB_710, status: "scheduled", venue: "T-Mobile Park, Seattle WA", lines: [{ sportsbook: "DraftKings", homeSpread: -1.5, awaySpread: 1.5, total: 7.5, homeML: -199, awayML: 159, timestamp: "2026-03-26T14:00:00.000Z" }], prediction: { id: "pred-cle-sea", gameId: "mlb-cle-sea", modelVersion: "v2.1", predictedWinner: "sea", winProbHome: 0.67, winProbAway: 0.33, projectedTotal: 7.2, projectedSpread: -2.1, confidenceScore: 65, fairOddsHome: -203, fairOddsAway: 166, edgeHome: 0.3, edgeAway: 1.0, supportingFactors: [{ label: "T-Mobile Park Pitcher's Park", impact: "high", direction: "positive", value: "Best UNDER park in MLB", description: "T-Mobile Park consistently suppresses scoring — best UNDER play in MLB today" }, { label: "SEA Pitching", impact: "medium", direction: "positive", value: "-199 home favorite", description: "Mariners backed by strong rotation at home" }], riskFactors: [], reasoning: "SEA -199 confirmed. T-Mobile Park is a graveyard for offense — model projects 7.2 vs 7.5 line. Best MLB UNDER today.", createdAt: "2026-03-26T14:00:00.000Z" } },
];
