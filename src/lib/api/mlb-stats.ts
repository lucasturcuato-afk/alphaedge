// src/lib/api/mlb-stats.ts
// Real MLB games + DraftKings odds from ESPN free API. No key needed.
import type { Game } from "@/lib/types";

const ESPN_MLB = "https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard";

function parseML(s: string): number { return parseInt(s.replace(/[^-\d]/g,""),10)||0; }
function mlToProb(ml: number): number {
  if (!ml) return 0.5;
  return ml < 0 ? Math.abs(ml)/(Math.abs(ml)+100) : 100/(ml+100);
}
function getStat(stats: any[], name: string) {
  return stats?.find((s:any)=>s.name===name)?.displayValue??"N/A";
}

export async function getTodayMLBGames(): Promise<Game[]> {
  try {
    const res = await fetch(ESPN_MLB, {
      headers:{"Accept":"application/json"},
      next:{revalidate:300},
    });
    if (!res.ok) { console.error("[MLB] ESPN error:",res.status); return []; }
    const data = await res.json();
    const events: any[] = data.events??[];
    console.log(`[MLB] ${events.length} games today`);

    return events.map((event:any) => {
      const comp = event.competitions[0];
      const homeC = comp.competitors?.find((c:any)=>c.homeAway==="home");
      const awayC = comp.competitors?.find((c:any)=>c.homeAway==="away");
      const odds = comp.odds?.[0];

      const homeSpread = odds?.pointSpread?.home?.close?.line ? parseFloat(odds.pointSpread.home.close.line) : null;
      const awaySpread = odds?.pointSpread?.away?.close?.line ? parseFloat(odds.pointSpread.away.close.line) : null;
      const total = odds?.overUnder??null;
      const homeML = odds?.moneyline?.home?.close?.odds ? parseML(odds.moneyline.home.close.odds) : null;
      const awayML = odds?.moneyline?.away?.close?.odds ? parseML(odds.moneyline.away.close.odds) : null;

      let homeWinProb=0.5, awayWinProb=0.5;
      if (homeML && awayML) {
        const rH=mlToProb(homeML), rA=mlToProb(awayML), vig=rH+rA;
        homeWinProb=rH/vig; awayWinProb=rA/vig;
      }

      const homeRecord = homeC?.records?.[0]?.summary??"";
      const awayRecord = awayC?.records?.[0]?.summary??"";
      const spreadSize = Math.abs(homeML??0)/100;
      const confidence = Math.min(80,Math.max(52,52+spreadSize*8));
      const edgeHome = Number(((homeWinProb-0.5)*20).toFixed(1));
      const edgeAway = Number(((awayWinProb-0.5)*20).toFixed(1));

      const supportingFactors:any[] = [];
      if (homeML && awayML) {
        const fav = homeML<0 ? homeC : awayC;
        supportingFactors.push({
          label:`Vegas: ${fav?.team?.shortDisplayName} Favored`,
          impact:Math.abs(homeML)>150?"high":"medium" as any,
          direction:"positive" as any,
          value:`ML ${homeML>0?"+":""}${homeML}/${awayML>0?"+":""}${awayML}`,
          description:`Market gives ${fav?.team?.displayName} ${Math.round(Math.max(homeWinProb,awayWinProb)*100)}% win probability based on Vegas lines.`,
        });
      }
      if (homeRecord) supportingFactors.push({
        label:`${homeC?.team?.shortDisplayName} Season Record`,
        impact:"medium" as any,
        direction:homeWinProb>0.5?"positive":"negative" as any,
        value:homeRecord,
        description:`${homeC?.team?.displayName} are ${homeRecord} this season.`,
      });
      if (total) supportingFactors.push({
        label:"Posted Total",
        impact:"low" as any,
        direction:"positive" as any,
        value:`O/U ${total}`,
        description:`DraftKings total set at ${total} runs.`,
      });

      const favTeam = homeWinProb>0.5 ? homeC?.team : awayC?.team;
      const reasoning = [
        homeML&&awayML?`Vegas: ${homeC?.team?.abbreviation} ${homeML>0?"+":""}${homeML} / ${awayC?.team?.abbreviation} ${awayML>0?"+":""}${awayML}.`:"",
        `Model gives ${favTeam?.displayName} ${Math.round(Math.max(homeWinProb,awayWinProb)*100)}% win probability.`,
        homeRecord?`${homeC?.team?.displayName} season record: ${homeRecord}.`:"",
        total?`Total: ${total} runs.`:"",
      ].filter(Boolean).join(" ");

      const lines = homeSpread!==null&&total!==null ? [{
        sportsbook:"DraftKings",
        homeSpread:homeSpread??0, awaySpread:awaySpread??0,
        total:total??0, homeML:homeML??0, awayML:awayML??0,
        timestamp:new Date().toISOString(),
      }] : [];

      return {
        id:`mlb-espn-${event.id}`,
        sport:"MLB" as const,
        homeTeam:{id:homeC?.team?.id??"h",name:homeC?.team?.displayName??"Home",shortName:homeC?.team?.shortDisplayName??"Home",abbreviation:homeC?.team?.abbreviation??"HM",city:homeC?.team?.location??"",sport:"MLB" as const,record:homeRecord||undefined},
        awayTeam:{id:awayC?.team?.id??"a",name:awayC?.team?.displayName??"Away",shortName:awayC?.team?.shortDisplayName??"Away",abbreviation:awayC?.team?.abbreviation??"AW",city:awayC?.team?.location??"",sport:"MLB" as const,record:awayRecord||undefined},
        gameTime:event.date,
        status:event.status?.type?.completed?"final":event.status?.type?.state==="in"?"live":"scheduled",
        venue:comp.venue?.fullName??"TBD",
        lines,
        prediction:{
          id:`pred-mlb-${event.id}`,gameId:`mlb-espn-${event.id}`,modelVersion:"v2.1",
          predictedWinner:homeWinProb>0.5?(homeC?.team?.abbreviation??"home").toLowerCase():(awayC?.team?.abbreviation??"away").toLowerCase(),
          winProbHome:Number(homeWinProb.toFixed(3)),winProbAway:Number(awayWinProb.toFixed(3)),
          projectedTotal:total??8.5,projectedSpread:homeSpread??-1.5,
          confidenceScore:Math.round(confidence),
          fairOddsHome:homeML??-110,fairOddsAway:awayML??-110,
          edgeHome,edgeAway,
          supportingFactors,riskFactors:[],reasoning,
          createdAt:new Date().toISOString(),
        },
      };
    });
  } catch(e) { console.error("[MLB] Error:",e); return []; }
}
