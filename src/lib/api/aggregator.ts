// src/lib/api/aggregator.ts
// NBA: Log5 model from stats.nba.com | NCAA: ESPN + real DK odds | MLB: ESPN + real DK odds
import type { Game, Prop, NewsItem } from "@/lib/types";
import { getTodayGames } from "./balldontlie";
import { getNBATeamStats, findTeamStats, log5WinProb, projectTotal, projectSpread, buildSupportingFactors } from "./nba-stats";
import { getTodayNCAAGames } from "./ncaa-stats";
import { getTodayMLBGames } from "./mlb-stats";
import { MOCK_NEWS } from "@/lib/mock-data/news";

const HAS_BDL_KEY = !!process.env.BALLDONTLIE_API_KEY;

function winProbToML(p: number): number {
  return p>=0.5 ? -Math.round((p/(1-p))*100) : Math.round(((1-p)/p)*100);
}

export async function getTodayAllGames(): Promise<Game[]> {
  const today = new Date().toISOString().slice(0,10);

  const [bdlGames, allTeamStats, ncaaGames, mlbGames] = await Promise.all([
    HAS_BDL_KEY ? getTodayGames().catch(()=>[]) : Promise.resolve([]),
    getNBATeamStats().catch(()=>[]),
    getTodayNCAAGames().catch(()=>[]),
    getTodayMLBGames().catch(()=>[]),
  ]);

  console.log(`[Aggregator] BDL:${bdlGames.length} NBA | Stats:${allTeamStats.length} teams | NCAA:${ncaaGames.length} | MLB:${mlbGames.length}`);

  // ── NBA: Log5 real predictions ─────────────────────────────────────────────
  const liveNBA: Game[] = bdlGames.map((g:any) => {
    const homeStats = findTeamStats(allTeamStats, g.home_team.abbreviation, g.home_team.full_name);
    const awayStats = findTeamStats(allTeamStats, g.visitor_team.abbreviation, g.visitor_team.full_name);

    let prediction: any;
    if (homeStats && awayStats) {
      const homeWinProb = log5WinProb(homeStats, awayStats);
      const awayWinProb = 1-homeWinProb;
      const projTotal = projectTotal(homeStats, awayStats);
      const projSpread = projectSpread(homeStats, awayStats);
      const factors = buildSupportingFactors(homeStats, awayStats, homeWinProb);
      const netDiff = Math.abs(homeStats.netRating-awayStats.netRating);
      const confidence = Math.min(85,Math.max(50,52+netDiff*2.5));
      prediction = {
        id:`pred-nba-${g.id}`,gameId:`nba-${g.id}`,modelVersion:"v2.1",
        predictedWinner:homeWinProb>0.5?g.home_team.abbreviation.toLowerCase():g.visitor_team.abbreviation.toLowerCase(),
        winProbHome:Number(homeWinProb.toFixed(3)),winProbAway:Number((1-homeWinProb).toFixed(3)),
        projectedTotal:projTotal,projectedSpread:projSpread,
        confidenceScore:Math.round(confidence),
        fairOddsHome:winProbToML(homeWinProb),fairOddsAway:winProbToML(1-homeWinProb),
        edgeHome:Number(((homeWinProb-0.5)*20).toFixed(1)),edgeAway:Number(((awayWinProb-0.5)*20).toFixed(1)),
        supportingFactors:factors,riskFactors:[],
        reasoning:`${homeWinProb>0.5?g.home_team.full_name:g.visitor_team.full_name} given ${Math.round(Math.max(homeWinProb,awayWinProb)*100)}% win prob via Log5. Net ratings: ${g.home_team.name} ${homeStats.netRating>0?"+":""}${homeStats.netRating.toFixed(1)}, ${g.visitor_team.name} ${awayStats.netRating>0?"+":""}${awayStats.netRating.toFixed(1)}. Projected total: ${projTotal}.`,
        createdAt:new Date().toISOString(),
      };
    } else {
      prediction = {
        id:`pred-nba-${g.id}`,gameId:`nba-${g.id}`,modelVersion:"v2.1",
        predictedWinner:g.home_team.abbreviation.toLowerCase(),
        winProbHome:0.55,winProbAway:0.45,projectedTotal:224.5,projectedSpread:-3.5,
        confidenceScore:52,fairOddsHome:-122,fairOddsAway:102,edgeHome:1.0,edgeAway:-1.0,
        supportingFactors:[{label:"Home Court",impact:"low" as const,direction:"positive" as const,value:g.home_team.city,description:`${g.home_team.full_name} at home.`}],
        riskFactors:[],reasoning:`${g.home_team.full_name} host ${g.visitor_team.full_name}. Home court applied.`,
        createdAt:new Date().toISOString(),
      };
    }

    return {
      id:`nba-${g.id}`,sport:"NBA" as const,
      homeTeam:{id:String(g.home_team.id),name:g.home_team.full_name,shortName:g.home_team.name,abbreviation:g.home_team.abbreviation,city:g.home_team.city,sport:"NBA" as const},
      awayTeam:{id:String(g.visitor_team.id),name:g.visitor_team.full_name,shortName:g.visitor_team.name,abbreviation:g.visitor_team.abbreviation,city:g.visitor_team.city,sport:"NBA" as const},
      gameTime:today+"T19:00:00.000Z",
      status:(g.status==="Final"?"final":"scheduled") as "final"|"scheduled"|"live",
      lines:[],prediction,
    };
  });

  // ncaaGames and mlbGames already have full real predictions built in their modules
  const all = [...liveNBA, ...ncaaGames, ...mlbGames];
  console.log(`[Aggregator] Total: ${all.length} (${liveNBA.length} NBA + ${ncaaGames.length} NCAA + ${mlbGames.length} MLB)`);
  return all;
}

export async function getSocialNews(_e:string,sport:"NBA"|"NCAAMB"|"MLB",limit=8): Promise<NewsItem[]> {
  const today=new Date().toISOString().slice(0,10);
  return (await import("@/lib/mock-data/news")).MOCK_NEWS
    .filter(n=>n.sport===sport).slice(0,limit)
    .map(n=>({...n,publishedAt:today+n.publishedAt.slice(10)}));
}
export async function enrichPlayerData(_id:number){return null;}
export async function getPlayerSentiment(_p:string,_s:string){return null;}
export async function refreshLinesOnly(_sport:"NBA"|"NCAAMB"|"MLB"):Promise<Record<string,unknown>>{return {};}
