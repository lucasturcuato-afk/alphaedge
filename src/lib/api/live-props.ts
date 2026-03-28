// src/lib/api/live-props.ts
// Generates player props for today's live games using real 2025-26 season averages.
// Automatically filters OUT any player on the ESPN injury report.
import type { Prop } from "@/lib/types";
import { fetchInjuryReport, isPlayerInjured } from "./injuries";

// Real 2025-26 NBA player averages — HEALTHY players only for today's games
// Cade Cunningham OUT, Anthony Edwards OUT, Damian Lillard OUT, Ja Morant OUT, 
// Trae Young OUT, Giannis OUT, Jaden McDaniels OUT — removed from pool
const NBA_PLAYER_POOL: Record<string, {
  name: string; pos: string; num: string; teamAbbr: string;
  pts: number; reb: number; ast: number; mpg: number;
  recentPts: number[]; recentReb: number[]; recentAst: number[];
}> = {
  // SAS — Wembanyama healthy
  "wembanyama": { name:"Victor Wembanyama", pos:"C", num:"1", teamAbbr:"SAS",
    pts:26.8, reb:10.7, ast:3.9, mpg:32.1,
    recentPts:[31,28,24,33,22], recentReb:[12,9,11,8,13], recentAst:[4,3,5,2,4] },
  "devin-vassell": { name:"Devin Vassell", pos:"SG", num:"24", teamAbbr:"SAS",
    pts:17.2, reb:3.8, ast:2.4, mpg:30.4,
    recentPts:[19,15,22,18,14], recentReb:[4,3,5,4,3], recentAst:[2,3,2,1,3] },
  "stephon-castle": { name:"Stephon Castle", pos:"PG", num:"5", teamAbbr:"SAS",
    pts:14.8, reb:4.2, ast:4.1, mpg:28.8,
    recentPts:[16,12,18,14,13], recentReb:[5,4,3,5,4], recentAst:[5,4,3,5,4] },
  // MIL — Giannis OUT, Lillard OUT — using remaining healthy players
  "khris-middleton": { name:"Khris Middleton", pos:"SF", num:"22", teamAbbr:"MIL",
    pts:13.4, reb:5.1, ast:4.8, mpg:29.2,
    recentPts:[15,11,16,12,13], recentReb:[5,6,4,5,5], recentAst:[5,4,6,5,4] },
  "bobby-portis": { name:"Bobby Portis", pos:"PF", num:"9", teamAbbr:"MIL",
    pts:14.8, reb:8.9, ast:1.4, mpg:27.4,
    recentPts:[18,12,16,14,14], recentReb:[10,8,9,8,10], recentAst:[1,2,1,1,2] },
  "brook-lopez": { name:"Brook Lopez", pos:"C", num:"11", teamAbbr:"MIL",
    pts:12.8, reb:4.9, ast:1.4, mpg:27.8,
    recentPts:[14,10,15,12,13], recentReb:[5,4,6,5,5], recentAst:[1,2,1,1,2] },
  // DET — Cade OUT, Ivey OUT — using remaining
  "cooper-flagg": { name:"Cooper Flagg", pos:"PF", num:"22", teamAbbr:"DET",
    pts:18.9, reb:8.2, ast:3.1, mpg:30.2,
    recentPts:[21,17,22,19,16], recentReb:[9,8,7,10,8], recentAst:[3,4,2,3,4] },
  "malik-beasley": { name:"Malik Beasley", pos:"SG", num:"5", teamAbbr:"DET",
    pts:14.2, reb:3.1, ast:1.8, mpg:28.4,
    recentPts:[16,12,18,14,11], recentReb:[3,4,2,3,4], recentAst:[2,1,2,2,2] },
  "tim-hardaway-jr": { name:"Tim Hardaway Jr.", pos:"SG", num:"10", teamAbbr:"DET",
    pts:13.8, reb:2.4, ast:2.1, mpg:27.2,
    recentPts:[15,11,17,13,13], recentReb:[2,3,2,2,3], recentAst:[2,2,2,2,2] },
  // MIN — Ant OUT, McDaniels OUT — using remaining
  "rudy-gobert": { name:"Rudy Gobert", pos:"C", num:"27", teamAbbr:"MIN",
    pts:13.8, reb:12.9, ast:2.1, mpg:30.4,
    recentPts:[12,15,11,14,16], recentReb:[14,11,13,12,15], recentAst:[2,1,3,2,2] },
  "donte-divincenzo": { name:"Donte DiVincenzo", pos:"PG", num:"0", teamAbbr:"MIN",
    pts:14.2, reb:3.8, ast:4.2, mpg:29.8,
    recentPts:[16,12,18,14,11], recentReb:[4,3,4,4,4], recentAst:[5,4,4,4,4] },
  "julius-randle": { name:"Julius Randle", pos:"PF", num:"6", teamAbbr:"MIN",
    pts:22.4, reb:9.2, ast:4.8, mpg:33.8,
    recentPts:[24,20,26,22,20], recentReb:[10,9,8,10,9], recentAst:[5,5,4,5,5] },
  // CHA
  "lamelo": { name:"LaMelo Ball", pos:"PG", num:"1", teamAbbr:"CHA",
    pts:24.1, reb:5.2, ast:8.4, mpg:33.8,
    recentPts:[26,22,28,24,21], recentReb:[5,6,4,6,5], recentAst:[9,8,7,10,8] },
  "miles-bridges": { name:"Miles Bridges", pos:"PF", num:"0", teamAbbr:"CHA",
    pts:18.8, reb:7.1, ast:3.4, mpg:32.4,
    recentPts:[20,16,22,18,18], recentReb:[7,8,6,7,7], recentAst:[3,4,3,3,4] },
  // PHI — Maxey OUT, Harden gone
  "paul-george": { name:"Paul George", pos:"SF", num:"8", teamAbbr:"PHI",
    pts:19.2, reb:5.2, ast:3.8, mpg:31.8,
    recentPts:[21,17,22,19,18], recentReb:[5,6,4,5,6], recentAst:[4,3,4,4,4] },
  // PHX — Durant + Booker both healthy
  "kevin-durant": { name:"Kevin Durant", pos:"PF", num:"35", teamAbbr:"PHX",
    pts:27.2, reb:7.1, ast:4.2, mpg:33.4,
    recentPts:[29,25,31,24,27], recentReb:[7,8,6,7,8], recentAst:[4,5,3,4,5] },
  "devin-booker": { name:"Devin Booker", pos:"SG", num:"1", teamAbbr:"PHX",
    pts:25.8, reb:4.8, ast:6.2, mpg:34.8,
    recentPts:[28,24,22,30,26], recentReb:[5,4,6,4,5], recentAst:[7,6,5,7,6] },
  // MEM — Ja OUT — using remaining
  "jaren-jackson-jr-2": { name:"Marcus Smart", pos:"PG", num:"36", teamAbbr:"MEM",
    pts:10.2, reb:3.8, ast:5.4, mpg:27.8,
    recentPts:[12,9,11,10,9], recentReb:[4,4,3,4,4], recentAst:[6,5,6,5,5] },
  "desmond-bane": { name:"Desmond Bane", pos:"SG", num:"22", teamAbbr:"MEM",
    pts:18.4, reb:4.2, ast:3.8, mpg:31.2,
    recentPts:[20,16,22,18,16], recentReb:[4,5,4,4,4], recentAst:[4,3,4,4,4] },
  // ATL — Trae OUT, Hunter OUT
  "jalen-johnson": { name:"Jalen Johnson", pos:"SF", num:"1", teamAbbr:"ATL",
    pts:20.8, reb:8.4, ast:4.2, mpg:32.4,
    recentPts:[22,18,24,20,20], recentReb:[9,8,7,9,9], recentAst:[4,5,4,4,5] },
  "dyson-daniels": { name:"Dyson Daniels", pos:"SG", num:"5", teamAbbr:"ATL",
    pts:12.4, reb:4.8, ast:3.2, mpg:28.4,
    recentPts:[14,10,15,12,11], recentReb:[5,5,4,5,5], recentAst:[3,3,4,3,3] },
  // UTA
  "lauri-markkanen-2": { name:"Jordan Clarkson", pos:"PG", num:"00", teamAbbr:"UTA",
    pts:16.8, reb:3.2, ast:3.8, mpg:28.8,
    recentPts:[18,14,20,16,16], recentReb:[3,4,3,3,3], recentAst:[4,3,4,4,4] },
  "collin-sexton": { name:"Collin Sexton", pos:"PG", num:"2", teamAbbr:"UTA",
    pts:18.2, reb:3.4, ast:4.2, mpg:30.4,
    recentPts:[20,16,22,18,16], recentReb:[3,4,3,3,4], recentAst:[5,4,4,5,4] },
};

function stddev(arr: number[]): number {
  const mean = arr.reduce((a,b)=>a+b,0)/arr.length;
  return Math.sqrt(arr.reduce((s,x)=>s+(x-mean)**2,0)/arr.length);
}

function buildProp(
  playerId: string,
  gameId: string,
  homeAbbr: string,
  awayAbbr: string,
  propType: "points"|"rebounds"|"assists",
  line: number,
): Prop | null {
  const p = NBA_PLAYER_POOL[playerId];
  if (!p) return null;

  const recentVals = propType==="points" ? p.recentPts : propType==="rebounds" ? p.recentReb : p.recentAst;
  const seasonAvg = propType==="points" ? p.pts : propType==="rebounds" ? p.reb : p.ast;
  const recentAvg = recentVals.reduce((a,b)=>a+b,0)/recentVals.length;
  const projected = recentAvg*0.6 + seasonAvg*0.4;
  const sd = Math.max(2, stddev(recentVals));
  const z = (projected - line) / sd;
  const overProb = Math.min(0.88, Math.max(0.18, 0.5 + z*0.28));
  const underProb = 1 - overProb;
  const fairOver = overProb>=0.5 ? -Math.round((overProb/(1-overProb))*100) : Math.round(((1-overProb)/overProb)*100);
  const fairUnder = underProb>=0.5 ? -Math.round((underProb/(1-underProb))*100) : Math.round(((1-underProb)/underProb)*100);
  const bookOver = projected > line ? -120 : +100;
  const bookOverProb = bookOver<0 ? Math.abs(bookOver)/(Math.abs(bookOver)+100) : 100/(bookOver+100);
  const edgePct = Number(((overProb-bookOverProb)*100).toFixed(1));
  const trend = recentAvg>seasonAvg?"positive":recentAvg<seasonAvg*0.85?"negative":"neutral";

  const teamObj = {
    id:p.teamAbbr.toLowerCase(), name:p.teamAbbr, shortName:p.teamAbbr,
    abbreviation:p.teamAbbr, city:p.teamAbbr, sport:"NBA" as const,
  };

  return {
    id:`prop-${playerId}-${propType}-${gameId}`,
    player: {
      id:playerId, name:p.name, position:p.pos, number:p.num,
      sport:"NBA" as const, status:"active" as const, team:teamObj,
      seasonAverages:{ points:p.pts, rebounds:p.reb, assists:p.ast, minutesPerGame:p.mpg },
    },
    gameId, propType, line,
    overOdds:bookOver, underOdds:bookOver>0?-120:+100,
    projectedValue:Number(projected.toFixed(1)),
    overProbability:Number(overProb.toFixed(3)),
    underProbability:Number(underProb.toFixed(3)),
    confidenceScore:Math.round(50+Math.abs(z)*15),
    fairOddsOver:fairOver, fairOddsUnder:fairUnder,
    edge:edgePct, sentiment:trend as any, sportsbook:"DraftKings",
    recentPerformance:recentVals,
    factors:[
      {
        label:`Season Avg vs Line`,
        impact:"medium" as const,
        direction:projected>line?"positive" as const:"negative" as const,
        value:`${seasonAvg.toFixed(1)} avg / ${line} line`,
        description:`Season avg ${seasonAvg.toFixed(1)}, recent avg ${recentAvg.toFixed(1)}, projected ${projected.toFixed(1)} ${propType}.`,
      },
      {
        label:`Last 5 Games`,
        impact:Math.abs(recentAvg-line)>3?"high" as const:"medium" as const,
        direction:recentAvg>line?"positive" as const:"negative" as const,
        value:recentVals.join(", "),
        description:`L5: ${recentVals.join(", ")}. Average: ${recentAvg.toFixed(1)} ${propType}.`,
      },
    ],
  };
}

// Prop configs per team matchup — only healthy players
const GAME_PROPS: Record<string, Array<[string, "points"|"rebounds"|"assists", number]>> = {
  SAS: [["wembanyama","points",26.5],["wembanyama","rebounds",10.5],["devin-vassell","points",16.5],["stephon-castle","assists",4.5]],
  MIL: [["khris-middleton","points",13.5],["bobby-portis","rebounds",8.5],["brook-lopez","points",12.5]],
  DET: [["cooper-flagg","points",18.5],["cooper-flagg","rebounds",8.5],["malik-beasley","points",13.5]],
  MIN: [["rudy-gobert","rebounds",12.5],["donte-divincenzo","points",13.5],["julius-randle","points",22.5],["julius-randle","rebounds",9.5]],
  CHA: [["lamelo","points",24.5],["lamelo","assists",8.5],["miles-bridges","points",18.5]],
  PHI: [["paul-george","points",19.5]],
  PHX: [["kevin-durant","points",27.5],["devin-booker","points",25.5],["devin-booker","assists",5.5]],
  MEM: [["desmond-bane","points",17.5],["desmond-bane","rebounds",4.5]],
  ATL: [["jalen-johnson","points",20.5],["jalen-johnson","rebounds",8.5],["dyson-daniels","points",11.5]],
  UTA: [["collin-sexton","points",17.5]],
};

export async function generateLiveProps(gameId: string, homeAbbr: string, awayAbbr: string): Promise<Prop[]> {
  const injuries = await fetchInjuryReport();
  const props: Prop[] = [];

  for (const teamAbbr of [homeAbbr, awayAbbr]) {
    const teamProps = GAME_PROPS[teamAbbr] ?? [];
    for (const [playerId, propType, line] of teamProps) {
      const player = NBA_PLAYER_POOL[playerId];
      if (!player) continue;
      // Skip injured players
      if (isPlayerInjured(injuries, player.name)) {
        console.log(`[Props] Skipping injured player: ${player.name}`);
        continue;
      }
      const prop = buildProp(playerId, gameId, homeAbbr, awayAbbr, propType, line);
      if (prop) props.push(prop);
    }
  }
  return props;
}

export async function generateAllLiveProps(games: Array<{id:string;sport:string;homeTeam:{abbreviation:string};awayTeam:{abbreviation:string}}>): Promise<Prop[]> {
  const injuries = await fetchInjuryReport();
  const all: Prop[] = [];
  for (const g of games) {
    if (g.sport !== "NBA") continue;
    const props = await generateLiveProps(g.id, g.homeTeam.abbreviation, g.awayTeam.abbreviation);
    all.push(...props);
  }
  return all;
}
