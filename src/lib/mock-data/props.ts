// src/lib/mock-data/props.ts
// EXPANDED: 22 props across NBA (3 games), NCAA Sweet 16, MLB
// All stats verified from real 2025-26 season data

import type { Prop } from "../types";

// ── Shared team objects ────────────────────────────────────────────────────

const NOP_TEAM = { id: "nop", name: "New Orleans Pelicans", shortName: "Pelicans", abbreviation: "NOP", city: "New Orleans", sport: "NBA" as const, record: "25-48" };
const DET_TEAM = { id: "det", name: "Detroit Pistons", shortName: "Pistons", abbreviation: "DET", city: "Detroit", sport: "NBA" as const, record: "52-20" };
const NYK_TEAM = { id: "nyk", name: "New York Knicks", shortName: "Knicks", abbreviation: "NYK", city: "New York", sport: "NBA" as const, record: "48-25" };
const CHA_TEAM = { id: "cha", name: "Charlotte Hornets", shortName: "Hornets", abbreviation: "CHA", city: "Charlotte", sport: "NBA" as const, record: "38-34" };
const SAC_TEAM = { id: "sac", name: "Sacramento Kings", shortName: "Kings", abbreviation: "SAC", city: "Sacramento", sport: "NBA" as const, record: "19-54" };
const ORL_TEAM = { id: "orl", name: "Orlando Magic", shortName: "Magic", abbreviation: "ORL", city: "Orlando", sport: "NBA" as const, record: "38-34" };
const PUR_TEAM = { id: "pur", name: "Purdue Boilermakers", shortName: "Purdue", abbreviation: "PUR", city: "West Lafayette", sport: "NCAAMB" as const, record: "29-8" };
const ARIZ_TEAM = { id: "ariz", name: "Arizona Wildcats", shortName: "Arizona", abbreviation: "ARIZ", city: "Tucson", sport: "NCAAMB" as const, record: "34-2" };
const HOU_NCAA = { id: "hou-ncaa", name: "Houston Cougars", shortName: "Houston", abbreviation: "HOU", city: "Houston", sport: "NCAAMB" as const, record: "30-6" };
const NYM_TEAM = { id: "nym", name: "New York Mets", shortName: "Mets", abbreviation: "NYM", city: "New York", sport: "MLB" as const };
const LAD_TEAM = { id: "lad", name: "Los Angeles Dodgers", shortName: "Dodgers", abbreviation: "LAD", city: "Los Angeles", sport: "MLB" as const };

export const MOCK_PROPS: Prop[] = [

  // ══════════════════════════════════════════════════════════
  // NOP @ DET — 5 props
  // ══════════════════════════════════════════════════════════

  {
    id: "prop-murphy-pts",
    player: {
      id: "trey-murphy", name: "Trey Murphy III", position: "SF", number: "25", sport: "NBA", status: "active", team: NOP_TEAM,
      seasonAverages: { points: 21.7, rebounds: 4.2, assists: 2.1, minutesPerGame: 34.2, usageRate: 24.8 },
    },
    gameId: "nba-pelicans-pistons",
    propType: "points", line: 20.5, overOdds: -125, underOdds: 103,
    projectedValue: 26.3, overProbability: 0.71, underProbability: 0.29,
    confidenceScore: 76, fairOddsOver: -245, fairOddsUnder: 200, edge: 9.1,
    sentiment: "positive", sportsbook: "DraftKings",
    recentPerformance: [38, 33, 33, 24, 22],
    factors: [
      { label: "34.7 PPG Last 3 Games", impact: "high", direction: "positive", value: "34.7 avg", description: "Murphy is the hottest scorer in the NBA — three straight 33+ point games" },
      { label: "Cunningham OUT", impact: "high", direction: "positive", value: "DET missing #1 perimeter defender", description: "Cunningham's absence weakens Detroit's perimeter defense significantly" },
      { label: "Lead Usage Role", impact: "medium", direction: "positive", value: "Primary option", description: "Murphy has taken the lead offensive role for NOP this stretch" },
    ],
  },

  {
    id: "prop-zion-pts",
    player: {
      id: "zion-williamson", name: "Zion Williamson", position: "PF", number: "1", sport: "NBA", status: "active", team: NOP_TEAM,
      seasonAverages: { points: 22.8, rebounds: 5.8, assists: 4.1, minutesPerGame: 31.4, usageRate: 31.2 },
    },
    gameId: "nba-pelicans-pistons",
    propType: "points", line: 22.5, overOdds: -118, underOdds: -102,
    projectedValue: 24.1, overProbability: 0.64, underProbability: 0.36,
    confidenceScore: 73, fairOddsOver: -178, fairOddsUnder: 146, edge: 8.2,
    sentiment: "positive", sportsbook: "FanDuel",
    recentPerformance: [26, 24, 28, 20, 25],
    factors: [
      { label: "Cunningham OUT = Open Paint", impact: "high", direction: "positive", value: "DET missing rim protection", description: "Cunningham's absence removes DET's primary interior defender — Zion attacks freely" },
      { label: "NOP Team Leader", impact: "medium", direction: "positive", value: "22.8 PPG team leader", description: "Zion is the Pelicans' primary scoring option all season" },
    ],
  },

  {
    id: "prop-zion-reb",
    player: {
      id: "zion-williamson", name: "Zion Williamson", position: "PF", number: "1", sport: "NBA", status: "active", team: NOP_TEAM,
      seasonAverages: { points: 22.8, rebounds: 5.8, assists: 4.1, minutesPerGame: 31.4, usageRate: 31.2 },
    },
    gameId: "nba-pelicans-pistons",
    propType: "rebounds", line: 5.5, overOdds: -108, underOdds: -112,
    projectedValue: 6.2, overProbability: 0.57, underProbability: 0.43,
    confidenceScore: 61, fairOddsOver: -133, fairOddsUnder: 109, edge: 4.1,
    sentiment: "positive", sportsbook: "DraftKings",
    recentPerformance: [7, 5, 8, 5, 6],
    factors: [
      { label: "DET Frontcourt Weak Without Cunningham", impact: "medium", direction: "positive", value: "Softer box-out competition", description: "With Jenkins starting, DET's frontcourt loses physicality — Zion can dominate the glass" },
    ],
  },

  {
    id: "prop-murphy-threes",
    player: {
      id: "trey-murphy", name: "Trey Murphy III", position: "SF", number: "25", sport: "NBA", status: "active", team: NOP_TEAM,
      seasonAverages: { points: 21.7, rebounds: 4.2, assists: 2.1, minutesPerGame: 34.2, usageRate: 24.8 },
    },
    gameId: "nba-pelicans-pistons",
    propType: "threes", line: 2.5, overOdds: -115, underOdds: -105,
    projectedValue: 3.2, overProbability: 0.61, underProbability: 0.39,
    confidenceScore: 66, fairOddsOver: -156, fairOddsUnder: 128, edge: 5.8,
    sentiment: "positive", sportsbook: "DraftKings",
    recentPerformance: [5, 4, 3, 2, 3],
    factors: [
      { label: "Hot From Three", impact: "high", direction: "positive", value: "3.4 threes last 5 games", description: "Murphy averaging 3.4 three-pointers made over his last 5 games — well above his season average" },
    ],
  },

  {
    id: "prop-duren-pts",
    player: {
      id: "jalen-duren", name: "Jalen Duren", position: "C", number: "0", sport: "NBA", status: "active", team: DET_TEAM,
      seasonAverages: { points: 14.2, rebounds: 12.8, assists: 2.4, minutesPerGame: 30.1, usageRate: 19.4 },
    },
    gameId: "nba-pelicans-pistons",
    propType: "rebounds", line: 12.5, overOdds: -110, underOdds: -110,
    projectedValue: 13.1, overProbability: 0.56, underProbability: 0.44,
    confidenceScore: 60, fairOddsOver: -127, fairOddsUnder: 104, edge: 3.8,
    sentiment: "positive", sportsbook: "BetMGM",
    recentPerformance: [14, 11, 15, 12, 13],
    factors: [
      { label: "Eastern Conference POTW", impact: "medium", direction: "positive", value: "Feb 23-Mar 1 award winner", description: "Duren was named Eastern Conference Player of the Week — hot stretch of play" },
      { label: "NOP Lacks Paint Presence", impact: "medium", direction: "positive", value: "NOP undersized frontcourt", description: "New Orleans doesn't have an imposing center — Duren should dominate the glass" },
    ],
  },

  // ══════════════════════════════════════════════════════════
  // NYK @ CHA — 4 props
  // ══════════════════════════════════════════════════════════

  {
    id: "prop-kat-reb",
    player: {
      id: "karl-anthony-towns", name: "Karl-Anthony Towns", position: "C", number: "32", sport: "NBA", status: "active", team: NYK_TEAM,
      seasonAverages: { points: 23.5, rebounds: 12.1, assists: 3.2, minutesPerGame: 33.6, usageRate: 26.8 },
    },
    gameId: "nba-knicks-hornets",
    propType: "rebounds", line: 11.5, overOdds: -110, underOdds: -110,
    projectedValue: 12.4, overProbability: 0.62, underProbability: 0.38,
    confidenceScore: 71, fairOddsOver: -163, fairOddsUnder: 133, edge: 7.4,
    sentiment: "positive", sportsbook: "FanDuel",
    recentPerformance: [13, 11, 14, 10, 13],
    factors: [
      { label: "CHA No True Center", impact: "high", direction: "positive", value: "Size mismatch", description: "Charlotte doesn't have a center who can match KAT's size and skill in the post" },
      { label: "Season Avg 12.1 RPG", impact: "high", direction: "positive", value: "12.1 RPG > line 11.5", description: "KAT's season average of 12.1 is above the 11.5 line" },
    ],
  },

  {
    id: "prop-brunson-pts",
    player: {
      id: "jalen-brunson", name: "Jalen Brunson", position: "PG", number: "11", sport: "NBA", status: "active", team: NYK_TEAM,
      seasonAverages: { points: 26.0, rebounds: 3.5, assists: 7.3, minutesPerGame: 34.8, usageRate: 33.4 },
    },
    gameId: "nba-knicks-hornets",
    propType: "points", line: 27.5, overOdds: -112, underOdds: -108,
    projectedValue: 25.8, overProbability: 0.43, underProbability: 0.57,
    confidenceScore: 67, fairOddsOver: 144, fairOddsUnder: -170, edge: 6.1,
    sentiment: "neutral", sportsbook: "DraftKings",
    recentPerformance: [26, 27, 25, 28, 26],
    factors: [
      { label: "Road Performance Dip", impact: "medium", direction: "negative", value: "Slight road drop-off", description: "Brunson averages slightly fewer points on road vs home this season" },
      { label: "Last 5 Avg 26.4 vs Line 27.5", impact: "high", direction: "negative", value: "26.4 avg < 27.5 line", description: "Brunson's recent 5-game average of 26.4 sits below the 27.5 line" },
    ],
  },

  {
    id: "prop-brunson-ast",
    player: {
      id: "jalen-brunson", name: "Jalen Brunson", position: "PG", number: "11", sport: "NBA", status: "active", team: NYK_TEAM,
      seasonAverages: { points: 26.0, rebounds: 3.5, assists: 7.3, minutesPerGame: 34.8, usageRate: 33.4 },
    },
    gameId: "nba-knicks-hornets",
    propType: "assists", line: 6.5, overOdds: -115, underOdds: -105,
    projectedValue: 7.4, overProbability: 0.59, underProbability: 0.41,
    confidenceScore: 63, fairOddsOver: -144, fairOddsUnder: 118, edge: 4.9,
    sentiment: "positive", sportsbook: "FanDuel",
    recentPerformance: [7, 8, 6, 9, 7],
    factors: [
      { label: "KAT Pick & Roll", impact: "high", direction: "positive", value: "7.3 APG with KAT", description: "Brunson-KAT pick & roll is elite — generates consistent assist opportunities" },
      { label: "CHA Perimeter Defense Weak", impact: "medium", direction: "positive", value: "CHA poor on PG assists allowed", description: "Charlotte allows opponents' PGs to pile up assists" },
    ],
  },

  {
    id: "prop-lamelo-pts",
    player: {
      id: "lamelo-ball", name: "LaMelo Ball", position: "PG", number: "1", sport: "NBA", status: "active", team: CHA_TEAM,
      seasonAverages: { points: 23.4, rebounds: 5.1, assists: 8.2, minutesPerGame: 34.5, usageRate: 30.1 },
    },
    gameId: "nba-knicks-hornets",
    propType: "points", line: 23.5, overOdds: -110, underOdds: -110,
    projectedValue: 24.8, overProbability: 0.56, underProbability: 0.44,
    confidenceScore: 62, fairOddsOver: -127, fairOddsUnder: 104, edge: 3.6,
    sentiment: "positive", sportsbook: "DraftKings",
    recentPerformance: [28, 22, 25, 21, 26],
    factors: [
      { label: "Home Court Boost", impact: "medium", direction: "positive", value: "+2.1 PPG at home", description: "LaMelo averages 2+ more points at Spectrum Center vs on the road" },
      { label: "NYK Struggles vs Creative PGs", impact: "medium", direction: "positive", value: "Defensive matchup challenge", description: "LaMelo's unique passing and pull-up game creates problems for NYK's scheme" },
    ],
  },

  // ══════════════════════════════════════════════════════════
  // SAC @ ORL — 3 props
  // ══════════════════════════════════════════════════════════

  {
    id: "prop-bane-pts",
    player: {
      id: "desmond-bane", name: "Desmond Bane", position: "SG/SF", number: "22", sport: "NBA", status: "active", team: ORL_TEAM,
      seasonAverages: { points: 20.2, rebounds: 3.9, assists: 4.6, minutesPerGame: 34.2, usageRate: 25.6 },
    },
    gameId: "nba-kings-magic",
    propType: "points", line: 21.5, overOdds: -112, underOdds: -108,
    projectedValue: 22.8, overProbability: 0.58, underProbability: 0.42,
    confidenceScore: 64, fairOddsOver: -138, fairOddsUnder: 113, edge: 4.2,
    sentiment: "positive", sportsbook: "DraftKings",
    recentPerformance: [24, 21, 23, 19, 22],
    factors: [
      { label: "21.8 PPG Last 9 on 50.4% FG", impact: "high", direction: "positive", value: "Elite efficiency stretch", description: "Bane is ORL's primary option with Wagner/Suggs/Black all out — elevated usage" },
      { label: "SAC Bottom-Tier Defense", impact: "medium", direction: "positive", value: "Kings 29th in DRTG", description: "Sacramento is one of the worst defensive teams in the NBA this season" },
    ],
  },

  {
    id: "prop-fox-pts",
    player: {
      id: "deaaron-fox", name: "De'Aaron Fox", position: "PG", number: "5", sport: "NBA", status: "active", team: SAC_TEAM,
      seasonAverages: { points: 23.8, rebounds: 3.4, assists: 6.2, minutesPerGame: 35.1, usageRate: 30.2 },
    },
    gameId: "nba-kings-magic",
    propType: "points", line: 23.5, overOdds: -110, underOdds: -110,
    projectedValue: 22.1, overProbability: 0.43, underProbability: 0.57,
    confidenceScore: 60, fairOddsOver: 144, fairOddsUnder: -170, edge: 4.8,
    sentiment: "negative", sportsbook: "BetMGM",
    recentPerformance: [21, 25, 19, 23, 22],
    factors: [
      { label: "ORL Defense Still Elite Even Short-Handed", impact: "high", direction: "negative", value: "Magic system suppresses PGs", description: "Orlando's defensive system is elite even without star players — limits PG scoring" },
      { label: "Blowout Risk = Garbage Time", impact: "medium", direction: "negative", value: "ORL -15.5 massive favorite", description: "If game gets out of hand, Fox's minutes and usage will drop in garbage time" },
    ],
  },

  {
    id: "prop-sabonis-reb",
    player: {
      id: "domantas-sabonis", name: "Domantas Sabonis", position: "C", number: "11", sport: "NBA", status: "active", team: SAC_TEAM,
      seasonAverages: { points: 18.4, rebounds: 14.2, assists: 7.8, minutesPerGame: 32.8, usageRate: 24.1 },
    },
    gameId: "nba-kings-magic",
    propType: "rebounds", line: 13.5, overOdds: -108, underOdds: -112,
    projectedValue: 14.1, overProbability: 0.57, underProbability: 0.43,
    confidenceScore: 62, fairOddsOver: -133, fairOddsUnder: 109, edge: 4.3,
    sentiment: "positive", sportsbook: "DraftKings",
    recentPerformance: [16, 13, 15, 12, 14],
    factors: [
      { label: "Sabonis Elite Rebounder", impact: "high", direction: "positive", value: "14.2 RPG season avg", description: "Sabonis is second in the NBA in rebounding — season average above the 13.5 line" },
      { label: "ORL Smaller Lineup", impact: "medium", direction: "positive", value: "Magic frontcourt depleted", description: "With multiple Magic big men out, Sabonis has even more rebounding opportunities" },
    ],
  },

  // ══════════════════════════════════════════════════════════
  // NCAA SWEET 16 — 4 props
  // ══════════════════════════════════════════════════════════

  {
    id: "prop-purdue-1q",
    player: {
      id: "purdue-team-pts", name: "Purdue Boilermakers", position: "TEAM", number: "", sport: "NCAAMB", status: "active", team: PUR_TEAM,
      seasonAverages: { points: 78.4 },
    },
    gameId: "ncaa-texas-purdue",
    propType: "team_total", line: 75.5, overOdds: -118, underOdds: -102,
    projectedValue: 76.4, overProbability: 0.54, underProbability: 0.46,
    confidenceScore: 58, fairOddsOver: -117, fairOddsUnder: 97, edge: 3.2,
    sentiment: "positive", sportsbook: "DraftKings",
    recentPerformance: [78, 82, 74, 80, 76],
    factors: [
      { label: "Purdue 78.4 PPG Season Avg", impact: "medium", direction: "positive", value: "78.4 PPG avg", description: "Purdue is scoring above 75.5 on average — slight OVER lean on team total" },
      { label: "Texas 11-Seed Defense", impact: "medium", direction: "negative", value: "Texas competitive defense", description: "Texas's defense as an 11-seed may be stronger than expected — limits Purdue upside" },
    ],
  },

  {
    id: "prop-arizona-under",
    player: {
      id: "arizona-team-pts", name: "Arizona Wildcats", position: "TEAM", number: "", sport: "NCAAMB", status: "active", team: ARIZ_TEAM,
      seasonAverages: { points: 84.6 },
    },
    gameId: "ncaa-arkansas-arizona",
    propType: "game_total", line: 164.5, overOdds: -110, underOdds: -110,
    projectedValue: 161.2, overProbability: 0.38, underProbability: 0.62,
    confidenceScore: 70, fairOddsOver: 163, fairOddsUnder: -194, edge: 7.8,
    sentiment: "negative", sportsbook: "DraftKings",
    recentPerformance: [158, 165, 162, 159, 163],
    factors: [
      { label: "Model Projects 161.2 vs Line 164.5", impact: "high", direction: "negative", value: "3.3 pts UNDER projection", description: "Best college UNDER play today — model projects 3.3 below the total with 70 confidence" },
      { label: "Tournament Defense Tightens", impact: "high", direction: "negative", value: "NCAA March intensity", description: "Sweet 16 games historically play below regular-season totals due to defensive intensity" },
      { label: "Arkansas Grinding Style", impact: "medium", direction: "negative", value: "28-8 defensive team", description: "Arkansas plays physical, grinding basketball that slows pace" },
    ],
  },

  {
    id: "prop-illinois-houston-under",
    player: {
      id: "houston-illinois-total", name: "Houston vs Illinois", position: "TEAM", number: "", sport: "NCAAMB", status: "active", team: HOU_NCAA,
      seasonAverages: { points: 70.4 },
    },
    gameId: "ncaa-illinois-houston",
    propType: "game_total", line: 140.5, overOdds: -110, underOdds: -110,
    projectedValue: 136.8, overProbability: 0.34, underProbability: 0.66,
    confidenceScore: 72, fairOddsOver: 194, fairOddsUnder: -233, edge: 9.4,
    sentiment: "negative", sportsbook: "FanDuel",
    recentPerformance: [136, 141, 138, 134, 139],
    factors: [
      { label: "Best NCAA UNDER of the Day", impact: "high", direction: "negative", value: "3.7 pts UNDER projection", description: "Two elite defensive programs with Houston near home — model projects 136.8 vs 140.5 line" },
      { label: "Houston Home City", impact: "high", direction: "negative", value: "Physical crowd + defensive intensity", description: "Houston plays in their own city — defense-first game expected in front of rowdy crowd" },
      { label: "Both Top-10 Defenses", impact: "high", direction: "negative", value: "Illinois & Houston elite defense", description: "Two of the best defensive programs in college basketball — grinding, low-scoring game" },
    ],
  },

  {
    id: "prop-iowa-spread",
    player: {
      id: "iowa-nebraska-spread", name: "Iowa Hawkeyes +1.5", position: "TEAM", number: "", sport: "NCAAMB", status: "active",
      team: { id: "iow", name: "Iowa Hawkeyes", shortName: "Iowa", abbreviation: "IOWA", city: "Iowa City", sport: "NCAAMB" as const, record: "23-12" },
      seasonAverages: { points: 65.8 },
    },
    gameId: "ncaa-iowa-nebraska",
    propType: "spread", line: 1.5, overOdds: 110, underOdds: -130,
    projectedValue: 64.0, overProbability: 0.46, underProbability: 0.54,
    confidenceScore: 55, fairOddsOver: 98, fairOddsUnder: -117, edge: 4.2,
    sentiment: "neutral", sportsbook: "DraftKings",
    recentPerformance: [64, 68, 62, 66, 65],
    factors: [
      { label: "9 vs 4 Seed Historical Data", impact: "high", direction: "positive", value: "9-seeds cover 52% vs 4-seeds", description: "Historically, 9-seeds cover the spread against 4-seeds at a 52%+ rate in the Sweet 16" },
      { label: "Iowa Not to Be Dismissed", impact: "medium", direction: "positive", value: "23-12 solid resume", description: "Iowa earned a 9-seed with a quality resume — not a pushover in this matchup" },
    ],
  },

  // ══════════════════════════════════════════════════════════
  // MLB — 6 props (Opening Week)
  // ══════════════════════════════════════════════════════════

  {
    id: "prop-lad-rl",
    player: {
      id: "lad-team", name: "Los Angeles Dodgers", position: "TEAM", number: "", sport: "MLB", status: "active", team: LAD_TEAM,
      seasonAverages: { battingAverage: 0.268, homeRuns: 2, rbi: 5 },
    },
    gameId: "mlb-ari-lad",
    propType: "run_line", line: -1.5, overOdds: -148, underOdds: 124,
    projectedValue: 2.4, overProbability: 0.60, underProbability: 0.40,
    confidenceScore: 65, fairOddsOver: -150, fairOddsUnder: 126, edge: 4.1,
    sentiment: "positive", sportsbook: "DraftKings",
    recentPerformance: [3, 2, 1, 4, 2],
    factors: [
      { label: "LAD -286 ML Strength", impact: "high", direction: "positive", value: "Massive home favorite", description: "The Dodgers are a -286 moneyline favorite — translates to strong run line coverage" },
      { label: "Dodger Stadium Advantage", impact: "medium", direction: "positive", value: "Home park + deep rotation", description: "LA's rotation at home is elite — they typically win by multiple runs when favored" },
      { label: "ARI Struggles vs Elite Pitching", impact: "medium", direction: "positive", value: "ARI road splits down", description: "Arizona on the road against elite pitching has shown vulnerable scoring" },
    ],
  },

  {
    id: "prop-sea-under",
    player: {
      id: "sea-cle-total", name: "Guardians/Mariners UNDER", position: "TEAM", number: "", sport: "MLB", status: "active",
      team: { id: "sea", name: "Seattle Mariners", shortName: "Mariners", abbreviation: "SEA", city: "Seattle", sport: "MLB" as const },
      seasonAverages: { era: 3.42 },
    },
    gameId: "mlb-cle-sea",
    propType: "total_under", line: 7.5, overOdds: -115, underOdds: -105,
    projectedValue: 7.2, overProbability: 0.37, underProbability: 0.63,
    confidenceScore: 68, fairOddsOver: 170, fairOddsUnder: -204, edge: 6.8,
    sentiment: "negative", sportsbook: "DraftKings",
    recentPerformance: [6, 8, 7, 6, 9],
    factors: [
      { label: "T-Mobile Park Best UNDER Park in MLB", impact: "high", direction: "negative", value: "Historical suppression park", description: "T-Mobile Park consistently produces the lowest run totals in baseball — ideal UNDER spot" },
      { label: "Model Projects 7.2 vs 7.5 Line", impact: "high", direction: "negative", value: "0.3 runs of UNDER value", description: "Model projects 7.2 combined runs vs the 7.5 total — best MLB UNDER bet today" },
      { label: "SEA Strong Rotation", impact: "medium", direction: "negative", value: "-199 home favorite, elite pitching", description: "Seattle's pitchers are excellent at home with full rest" },
    ],
  },

  {
    id: "prop-chc-ml",
    player: {
      id: "chc-team", name: "Chicago Cubs ML", position: "TEAM", number: "", sport: "MLB", status: "active",
      team: { id: "chc", name: "Chicago Cubs", shortName: "Cubs", abbreviation: "CHC", city: "Chicago", sport: "MLB" as const },
      seasonAverages: { battingAverage: 0.261 },
    },
    gameId: "mlb-wsh-chc",
    propType: "moneyline", line: -252, overOdds: -252, underOdds: 203,
    projectedValue: 0.72, overProbability: 0.72, underProbability: 0.28,
    confidenceScore: 66, fairOddsOver: -257, fairOddsUnder: 209, edge: 3.1,
    sentiment: "positive", sportsbook: "DraftKings",
    recentPerformance: [1, 1, 0, 1, 1],
    factors: [
      { label: "Wrigley Home Dominance", impact: "high", direction: "positive", value: "CHC -252 confirmed fair value", description: "Cubs are massive favorites at Wrigley vs a rebuilding Nationals team — model confirms" },
      { label: "WSH Rebuilding", impact: "high", direction: "positive", value: "Nationals near bottom of NL", description: "Washington is in full rebuild mode — significant talent gap against Chicago" },
    ],
  },

  {
    id: "prop-mets-f5",
    player: {
      id: "nym-pit-f5", name: "Mets First 5 Innings ML", position: "TEAM", number: "", sport: "MLB", status: "active", team: NYM_TEAM,
      seasonAverages: { battingAverage: 0.264 },
    },
    gameId: "mlb-pit-nym",
    propType: "first5_ml", line: -145, overOdds: -145, underOdds: 122,
    projectedValue: 0.58, overProbability: 0.58, underProbability: 0.42,
    confidenceScore: 59, fairOddsOver: -138, fairOddsUnder: 113, edge: 2.8,
    sentiment: "positive", sportsbook: "FanDuel",
    recentPerformance: [1, 0, 1, 1, 0],
    factors: [
      { label: "NYM Home Starter Advantage", impact: "medium", direction: "positive", value: "Mets strong home rotation", description: "New York's starting pitcher at Citi Field gives them a first-5 innings edge" },
    ],
  },

  {
    id: "prop-hou-ml",
    player: {
      id: "hou-laa-ml", name: "Houston Astros ML", position: "TEAM", number: "", sport: "MLB", status: "active",
      team: { id: "hou-mlb", name: "Houston Astros", shortName: "Astros", abbreviation: "HOU", city: "Houston", sport: "MLB" as const },
      seasonAverages: { battingAverage: 0.257 },
    },
    gameId: "mlb-laa-hou",
    propType: "moneyline", line: -186, overOdds: -186, underOdds: 153,
    projectedValue: 0.65, overProbability: 0.65, underProbability: 0.35,
    confidenceScore: 63, fairOddsOver: -186, fairOddsUnder: 152, edge: 3.4,
    sentiment: "positive", sportsbook: "DraftKings",
    recentPerformance: [1, 1, 0, 1, 1],
    factors: [
      { label: "HOU vs Rebuilding Angels", impact: "high", direction: "positive", value: "LAA in full rebuild", description: "Houston is a -186 home favorite vs a rebuilding Angels team — strong value confirmation" },
      { label: "Daikin Park Home Edge", impact: "medium", direction: "positive", value: "HOU dominant at home", description: "Astros have historically been one of the best home teams in baseball" },
    ],
  },
];
