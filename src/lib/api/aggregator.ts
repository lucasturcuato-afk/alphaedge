// src/lib/api/aggregator.ts
// NBA: Real model + live injury report from ESPN
// NCAA + MLB: ESPN with real DK odds

import type { Game, Prop, NewsItem } from "@/lib/types";
import { getTodayNCAAGames } from "./ncaa-stats";
import { getTodayMLBGames } from "./mlb-stats";
import { buildNBAPrediction } from "./nba-model";
import { fetchInjuryReport, getTeamInjuryImpact } from "./injuries";
import { MOCK_NEWS } from "@/lib/mock-data/news";

const ESPN_NBA = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard";

function parseML(s: string): number { return parseInt(s.replace(/[^-\d]/g,""),10)||0; }

async function buildNBAGames(): Promise<Game[]> {
  try {
    // Fetch scoreboard + injury report in parallel
    const [res, injuries] = await Promise.all([
      fetch(ESPN_NBA, { headers:{Accept:"application/json"}, next:{revalidate:300} }),
      fetchInjuryReport(),
    ]);
    if (!res.ok) return [];
    const data = await res.json();
    const events: any[] = data.events ?? [];
    console.log(`[NBA] ${events.length} games | ${injuries.filter(p=>p.status==='Out').length} players Out`);

    const games = await Promise.all(events.map(async (event: any) => {
      const comp = event.competitions[0];
      const homeC = comp.competitors?.find((c:any)=>c.homeAway==="home");
      const awayC = comp.competitors?.find((c:any)=>c.homeAway==="away");
      const odds = comp.odds?.[0];

      const homeAbbr = homeC?.team?.abbreviation ?? "";
      const awayAbbr = awayC?.team?.abbreviation ?? "";

      const vegasSpread = odds?.pointSpread?.home?.close?.line ? parseFloat(odds.pointSpread.home.close.line) : undefined;
      const vegasAwaySpread = odds?.pointSpread?.away?.close?.line ? parseFloat(odds.pointSpread.away.close.line) : undefined;
      const vegasTotal = odds?.overUnder ?? undefined;
      const vegasHomeML = odds?.moneyline?.home?.close?.odds ? parseML(odds.moneyline.home.close.odds) : undefined;
      const vegasAwayML = odds?.moneyline?.away?.close?.odds ? parseML(odds.moneyline.away.close.odds) : undefined;

      // Get injury impact for each team
      const homeInjury = getTeamInjuryImpact(injuries, homeAbbr);
      const awayInjury = getTeamInjuryImpact(injuries, awayAbbr);

      // Build real model prediction with injury adjustments
      const { prediction } = await buildNBAPrediction(
        homeAbbr, awayAbbr,
        vegasHomeML, vegasAwayML,
        vegasSpread, vegasTotal,
        homeInjury, awayInjury,
      );

      prediction.id = `pred-nba-${event.id}`;
      prediction.gameId = `nba-espn-${event.id}`;

      const homeRecord = homeC?.records?.[0]?.summary ?? "";
      const awayRecord = awayC?.records?.[0]?.summary ?? "";

      const lines = vegasSpread !== undefined && vegasTotal !== undefined ? [{
        sportsbook: "DraftKings",
        homeSpread: vegasSpread ?? 0,
        awaySpread: vegasAwaySpread ?? 0,
        total: vegasTotal ?? 0,
        homeML: vegasHomeML ?? 0,
        awayML: vegasAwayML ?? 0,
        timestamp: new Date().toISOString(),
      }] : [];

      return {
        id: `nba-espn-${event.id}`,
        sport: "NBA" as const,
        homeTeam: { id:homeC?.team?.id??"h", name:homeC?.team?.displayName??"Home", shortName:homeC?.team?.shortDisplayName??"Home", abbreviation:homeAbbr, city:homeC?.team?.location??"", sport:"NBA" as const, record:homeRecord||undefined },
        awayTeam: { id:awayC?.team?.id??"a", name:awayC?.team?.displayName??"Away", shortName:awayC?.team?.shortDisplayName??"Away", abbreviation:awayAbbr, city:awayC?.team?.location??"", sport:"NBA" as const, record:awayRecord||undefined },
        gameTime: event.date,
        status: event.status?.type?.completed ? "final" : event.status?.type?.state==="in" ? "live" : "scheduled",
        venue: comp.venue?.fullName ?? "TBD",
        lines,
        prediction,
        // Store injury summaries on game object for UI display
        homeInjuries: homeInjury.injuredPlayers,
        awayInjuries: awayInjury.injuredPlayers,
      } as any;
    }));

    return games;
  } catch(e) {
    console.error("[NBA] error:", e);
    return [];
  }
}

export async function getTodayAllGames(): Promise<Game[]> {
  const [nbaGames, ncaaGames, mlbGames] = await Promise.all([
    buildNBAGames().catch(e=>{console.error("[NBA]",e);return [];}),
    getTodayNCAAGames().catch(()=>[]),
    getTodayMLBGames().catch(()=>[]),
  ]);
  const all = [...nbaGames, ...ncaaGames, ...mlbGames];
  console.log(`[Aggregator] ${all.length} total (${nbaGames.length} NBA + ${ncaaGames.length} NCAA + ${mlbGames.length} MLB)`);
  return all;
}

export async function getSocialNews(_e:string, sport:"NBA"|"NCAAMB"|"MLB", limit=8): Promise<NewsItem[]> {
  const today = new Date().toISOString().slice(0,10);
  return MOCK_NEWS.filter(n=>n.sport===sport).slice(0,limit).map(n=>({...n,publishedAt:today+n.publishedAt.slice(10)}));
}
export async function enrichPlayerData(_id:number){return null;}
export async function getPlayerSentiment(_p:string,_s:string){return null;}
export async function refreshLinesOnly(_s:"NBA"|"NCAAMB"|"MLB"):Promise<Record<string,unknown>>{return {};}
