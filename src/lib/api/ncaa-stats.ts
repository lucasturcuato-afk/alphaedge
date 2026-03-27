// src/lib/api/ncaa-stats.ts
// Fetches real NCAA CBB games + odds from ESPN's free public API.
// No API key required. Returns today's games with real lines and team stats.

import type { Game } from "@/lib/types";

const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball";

interface ESPNTeam {
  id: string;
  abbreviation: string;
  displayName: string;
  shortDisplayName: string;
  location: string;
  name: string;
  logo?: string;
  records?: Array<{ name: string; type: string; summary: string }>;
  statistics?: Array<{ name: string; displayValue: string; rankDisplayValue: string }>;
  rank?: number;
}

interface ESPNCompetitor {
  homeAway: "home" | "away";
  team: ESPNTeam;
  records?: Array<{ name: string; type: string; summary: string }>;
  statistics?: Array<{ name: string; displayValue: string; rankDisplayValue: string }>;
  curatedRank?: { current: number };
}

interface ESPNOdds {
  details?: string;
  overUnder?: number;
  spread?: number;
  moneyline?: {
    home: { close: { odds: string } };
    away: { close: { odds: string } };
  };
  pointSpread?: {
    home: { close: { line: string; odds: string } };
    away: { close: { line: string; odds: string } };
  };
  total?: {
    over: { close: { line: string; odds: string } };
    under: { close: { line: string; odds: string } };
  };
}

interface ESPNEvent {
  id: string;
  date: string;
  name: string;
  status: { type: { description: string; completed: boolean; state: string } };
  competitions: Array<{
    venue?: { fullName: string };
    competitors: ESPNCompetitor[];
    odds?: ESPNOdds[];
    notes?: Array<{ type: string; headline: string }>;
  }>;
}

function getStat(stats: ESPNCompetitor["statistics"], name: string): string {
  return stats?.find((s) => s.name === name)?.displayValue ?? "N/A";
}

function getRecord(records: ESPNCompetitor["records"], type: string): string {
  return records?.find((r) => r.type === type)?.summary ?? "";
}

// Convert ML odds string to number
function parseML(odds: string): number {
  return parseInt(odds.replace(/[^-\d]/g, ""), 10);
}

// Convert ML odds to win probability
function mlToWinProb(ml: number): number {
  if (ml < 0) return Math.abs(ml) / (Math.abs(ml) + 100);
  return 100 / (ml + 100);
}

export async function getTodayNCAAGames(): Promise<Game[]> {
  try {
    const res = await fetch(`${ESPN_BASE}/scoreboard`, {
      headers: { "Accept": "application/json" },
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      console.error("[NCAA] ESPN scoreboard error:", res.status);
      return [];
    }

    const data = await res.json();
    const events: ESPNEvent[] = data.events ?? [];
    console.log(`[NCAA] ESPN returned ${events.length} games today`);

    const games: Game[] = events.map((event) => {
      const comp = event.competitions[0];
      const homeComp = comp.competitors.find((c) => c.homeAway === "home")!;
      const awayComp = comp.competitors.find((c) => c.homeAway === "away")!;
      const odds = comp.odds?.[0];
      const venue = comp.venue?.fullName ?? "Neutral Site";

      // Tournament round from notes
      const roundNote = comp.notes?.find((n) => n.type === "rotation")?.headline ?? "";

      // Parse real lines from ESPN/DraftKings
      const homeSpread = odds?.pointSpread?.home?.close?.line
        ? parseFloat(odds.pointSpread.home.close.line)
        : null;
      const awaySpread = odds?.pointSpread?.away?.close?.line
        ? parseFloat(odds.pointSpread.away.close.line)
        : null;
      const total = odds?.overUnder ?? null;
      const homeML = odds?.moneyline?.home?.close?.odds
        ? parseML(odds.moneyline.home.close.odds)
        : null;
      const awayML = odds?.moneyline?.away?.close?.odds
        ? parseML(odds.moneyline.away.close.odds)
        : null;

      // Real win probabilities from ML odds
      let homeWinProb = 0.5;
      let awayWinProb = 0.5;
      if (homeML && awayML) {
        const rawHome = mlToWinProb(homeML);
        const rawAway = mlToWinProb(awayML);
        const totalProb = rawHome + rawAway; // normalize for vig
        homeWinProb = rawHome / totalProb;
        awayWinProb = rawAway / totalProb;
      }

      // Real team stats
      const homeStats = homeComp.statistics ?? [];
      const awayStats = awayComp.statistics ?? [];
      const homeRecords = homeComp.records ?? [];
      const awayRecords = awayComp.records ?? [];

      const homeRecord = getRecord(homeRecords, "total");
      const awayRecord = getRecord(awayRecords, "total");
      const homeHomeSplit = getRecord(homeRecords, "home");
      const awayRoadSplit = getRecord(awayRecords, "road");

      const homePPG = getStat(homeStats, "avgPoints");
      const awayPPG = getStat(awayStats, "avgPoints");
      const homeFGPct = getStat(homeStats, "fieldGoalPct");
      const away3PPct = getStat(awayStats, "threePointFieldGoalPct");
      const homeRank = homeComp.curatedRank?.current;
      const awayRank = awayComp.curatedRank?.current;

      // Build real supporting factors from actual stats
      const supportingFactors = [];

      if (homeSpread && homeSpread < -4) {
        supportingFactors.push({
          label: `${homeComp.team.shortDisplayName} Heavy Favorite`,
          impact: Math.abs(homeSpread) > 7 ? "high" : "medium",
          direction: "positive",
          value: `${homeSpread > 0 ? "+" : ""}${homeSpread} spread`,
          description: `Vegas has ${homeComp.team.displayName} as a ${Math.abs(homeSpread)}-point favorite — market strongly agrees.`,
        });
      } else if (awaySpread && awaySpread < -4) {
        supportingFactors.push({
          label: `${awayComp.team.shortDisplayName} Favored on Road`,
          impact: "high",
          direction: "negative",
          value: `${awaySpread > 0 ? "+" : ""}${awaySpread} spread`,
          description: `${awayComp.team.displayName} favored by ${Math.abs(awaySpread)} despite playing from the away side.`,
        });
      }

      if (homeRecord) {
        supportingFactors.push({
          label: `${homeComp.team.shortDisplayName} Season Record`,
          impact: "medium",
          direction: homeWinProb > 0.5 ? "positive" : "negative",
          value: homeRecord,
          description: `${homeComp.team.displayName} finished the season ${homeRecord}${homeHomeSplit ? ` (${homeHomeSplit} at home)` : ""}.`,
        });
      }

      if (homePPG !== "N/A" && awayPPG !== "N/A") {
        const homeScoring = parseFloat(homePPG);
        const awayScoring = parseFloat(awayPPG);
        const betterOffense = homeScoring > awayScoring ? homeComp : awayComp;
        supportingFactors.push({
          label: `${betterOffense.team.shortDisplayName} Scoring Edge`,
          impact: "medium",
          direction: (betterOffense === homeComp) === (homeWinProb > 0.5) ? "positive" : "negative",
          value: `${betterOffense === homeComp ? homePPG : awayPPG} PPG`,
          description: `${betterOffense.team.displayName} averages ${betterOffense === homeComp ? homePPG : awayPPG} PPG this season — ${parseFloat(Math.abs(homeScoring - awayScoring).toFixed(1))} more than their opponent.`,
        });
      }

      if (homeFGPct !== "N/A") {
        supportingFactors.push({
          label: `${homeComp.team.shortDisplayName} Shooting Efficiency`,
          impact: "low",
          direction: "positive",
          value: `${homeFGPct}% FG`,
          description: `${homeComp.team.displayName} shoots ${homeFGPct}% from the field this season.`,
        });
      }

      // Confidence based on spread size
      const spreadSize = Math.abs(homeSpread ?? 0);
      const confidence = Math.min(82, Math.max(52, 54 + spreadSize * 2));

      // Edge vs implied 50/50
      const edgeHome = Number(((homeWinProb - 0.5) * 20).toFixed(1));
      const edgeAway = Number(((awayWinProb - 0.5) * 20).toFixed(1));

      // Build real reasoning from data
      const favTeam = homeWinProb > 0.5 ? homeComp.team : awayComp.team;
      const favRecord = homeWinProb > 0.5 ? homeRecord : awayRecord;
      const reasoning = [
        homeML && awayML
          ? `Vegas lines: ${homeComp.team.abbreviation} ${homeML > 0 ? "+" : ""}${homeML} / ${awayComp.team.abbreviation} ${awayML > 0 ? "+" : ""}${awayML}.`
          : "",
        `Model gives ${favTeam.displayName} a ${Math.round(Math.max(homeWinProb, awayWinProb) * 100)}% win probability`,
        favRecord ? `(season record: ${favRecord}).` : ".",
        total ? `Projected total near posted line of ${total}.` : "",
        roundNote ? `Game context: ${roundNote}.` : "",
      ].filter(Boolean).join(" ");

      const lines = homeSpread !== null && total !== null
        ? [{
            sportsbook: "DraftKings",
            homeSpread: homeSpread ?? 0,
            awaySpread: awaySpread ?? 0,
            total: total ?? 0,
            homeML: homeML ?? 0,
            awayML: awayML ?? 0,
            timestamp: new Date().toISOString(),
          }]
        : [];

      return {
        id: `ncaa-espn-${event.id}`,
        sport: "NCAAMB" as const,
        homeTeam: {
          id: homeComp.team.id,
          name: homeComp.team.displayName,
          shortName: homeComp.team.shortDisplayName,
          abbreviation: homeComp.team.abbreviation,
          city: homeComp.team.location,
          sport: "NCAAMB" as const,
          record: homeRecord || undefined,
        },
        awayTeam: {
          id: awayComp.team.id,
          name: awayComp.team.displayName,
          shortName: awayComp.team.shortDisplayName,
          abbreviation: awayComp.team.abbreviation,
          city: awayComp.team.location,
          sport: "NCAAMB" as const,
          record: awayRecord || undefined,
        },
        gameTime: event.date,
        status: event.status.type.completed
          ? "final"
          : event.status.type.state === "in"
          ? "live"
          : "scheduled",
        venue,
        lines,
        prediction: {
          id: `pred-ncaa-${event.id}`,
          gameId: `ncaa-espn-${event.id}`,
          modelVersion: "v2.1",
          predictedWinner: homeWinProb > 0.5
            ? homeComp.team.abbreviation.toLowerCase()
            : awayComp.team.abbreviation.toLowerCase(),
          winProbHome: Number(homeWinProb.toFixed(3)),
          winProbAway: Number(awayWinProb.toFixed(3)),
          projectedTotal: total ?? 140,
          projectedSpread: homeSpread ?? 0,
          confidenceScore: Math.round(confidence),
          fairOddsHome: homeML ?? -110,
          fairOddsAway: awayML ?? -110,
          edgeHome,
          edgeAway,
          supportingFactors: supportingFactors.slice(0, 4) as any,
          riskFactors: [],
          reasoning,
          createdAt: new Date().toISOString(),
        },
      };
    });

    return games;
  } catch (e) {
    console.error("[NCAA] Error:", e);
    return [];
  }
}
