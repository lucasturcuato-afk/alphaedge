// src/lib/api/nba-model.ts — Model v3.1 FINAL
// Correct math: uses avgPts directly, estimates defense from win% + block/steal rates,
// Monte Carlo simulation for win prob and total distribution,
// Pythagorean expectation, rest days, home/away splits, injury adjustments.

import type { TeamInjuryImpact } from './injuries';

export interface TeamProfile {
  id: string; abbreviation: string; record: string;
  wins: number; losses: number; winPct: number;
  avgPts: number;        // points scored per game (real)
  estPtsAllowed: number; // estimated points allowed per game
  fgPct: number; threePct: number; threeRate: number;
  ftPct: number; avgAst: number; avgTov: number;
  avgReb: number; avgBlk: number; avgStl: number;
  pythWinPct: number;    // Pythagorean win% (pts^13.91 / (pts^13.91 + ptsAllowed^13.91))
  pace: number;
  netPts: number;        // avgPts - estPtsAllowed
  last10Wins: number;
  homeWins: number; homeLosses: number;
  awayWins: number; awayLosses: number;
  lastGameDate: string;
}

const ESPN_STATS    = (id:string) => `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/${id}/statistics`;
const ESPN_SCHEDULE = (id:string) => `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/${id}/schedule?seasontype=2&limit=82`;

const ESPN_IDS: Record<string,string> = {
  ATL:'1', BOS:'2', BKN:'17', CHA:'30', CHI:'4',  CLE:'5',  DAL:'6',  DEN:'7',
  DET:'8', GSW:'9', HOU:'10', IND:'11', LAC:'12', LAL:'13', MEM:'29', MIA:'14',
  MIL:'15',MIN:'16',NOP:'3',  NYK:'18', OKC:'25', ORL:'19', PHI:'20', PHX:'21',
  POR:'22',SAC:'23',SAS:'24', TOR:'28', UTA:'26', WAS:'27',
  NY:'18', GS:'9', SA:'24', NO:'3', UTAH:'26',
};

// League averages 2025-26
const LG_PTS = 115.8;
const LG_ALLOWED = 115.8; // symmetric
const LG_TOV = 13.5;
const LG_FG = 47.1;
const LG_3PCT = 36.8;

let cache: Record<string,{p:TeamProfile;ts:number}> = {};
const TTL = 2*60*60*1000;

async function fetchProfile(abbr: string): Promise<TeamProfile|null> {
  const hit = cache[abbr];
  if (hit && Date.now()-hit.ts < TTL) return hit.p;

  const id = ESPN_IDS[abbr];
  if (!id) { console.warn(`[Model] No ESPN ID for "${abbr}"`); return null; }

  try {
    const [sr, schr] = await Promise.all([
      fetch(ESPN_STATS(id),    { next:{revalidate:7200} }),
      fetch(ESPN_SCHEDULE(id), { next:{revalidate:7200} }),
    ]);
    if (!sr.ok) throw new Error(`Stats ${sr.status}`);

    const sd = await sr.json();
    const cats: any[] = sd.results?.stats?.categories ?? [];
    const g = (cat:string, stat:string): number => {
      const c = cats.find((x:any)=>x.name===cat);
      const s = c?.stats?.find((x:any)=>x.name===stat);
      return parseFloat(s?.displayValue??'0')||0;
    };

    // Real offensive stats from ESPN
    const avgPts   = g('offensive','avgPoints');
    const fgPct    = g('offensive','fieldGoalPct');
    const threePct = g('offensive','threePointFieldGoalPct') || g('offensive','threePointPct');
    const ftPct    = g('offensive','freeThrowPct');
    const avgAst   = g('offensive','avgAssists');
    const avgTov   = g('offensive','avgTurnovers');
    const avgFGA   = g('offensive','avgFieldGoalsAttempted');
    const avg3PA   = g('offensive','avgThreePointFieldGoalsAttempted');
    const avgFTA   = g('offensive','avgFreeThrowsAttempted');
    const avgReb   = g('general','avgRebounds');
    const avgBlk   = g('defensive','avgBlocks');
    const avgStl   = g('defensive','avgSteals');
    const astToRatio = g('general','assistTurnoverRatio') || (avgAst/Math.max(avgTov,1));

    // Pace (Dean Oliver formula)
    const avgOReb = avgReb * 0.27;
    const pace = avgFGA + 0.44*avgFTA + avgTov - avgOReb;
    const threeRate = avgFGA > 0 ? avg3PA/avgFGA : 0.38;
    const ftRate    = avgFGA > 0 ? avgFTA/avgFGA : 0.28;

    // Parse schedule for record, form, splits
    let wins=0, losses=0, record='0-0';
    let last10Wins=0, homeWins=0, homeLosses=0, awayWins=0, awayLosses=0;
    let lastGameDate='';
    let totalPtsAllowed=0, gamesWithScore=0;

    if (schr.ok) {
      const schd = await schr.json();
      const recItems = schd.team?.record?.items ?? [];
      const overall  = recItems.find((r:any)=>r.type==='total');
      if (overall?.summary) {
        record = overall.summary;
        [wins,losses] = record.split('-').map(Number);
      }
      const events: any[] = schd.events ?? [];
      const done = events.filter((e:any)=>e.competitions?.[0]?.status?.type?.completed);
      if (done.length) lastGameDate = done[done.length-1]?.date ?? '';

      done.forEach((e:any,i:number) => {
        const comp = e.competitions[0];
        const homeC = comp.competitors.find((c:any)=>c.homeAway==='home');
        const awayC = comp.competitors.find((c:any)=>c.homeAway==='away');
        const isHome = homeC?.team?.id===id || homeC?.team?.abbreviation===abbr;
        const us  = isHome ? homeC : awayC;
        const opp = isHome ? awayC : homeC;
        const won = us?.winner===true;
        // Collect actual points allowed
        const oppScore = parseInt(opp?.score??'0',10);
        if (oppScore > 80) { totalPtsAllowed += oppScore; gamesWithScore++; }
        if (isHome) { won ? homeWins++ : homeLosses++; }
        else        { won ? awayWins++ : awayLosses++; }
        if (i >= done.length-10 && won) last10Wins++;
      });
    }

    const gp = wins+losses||74;
    const winPct = wins/gp;

    // Estimated points allowed:
    // Use real schedule data if we have enough games (>20), otherwise estimate from win%
    let estPtsAllowed: number;
    if (gamesWithScore >= 20) {
      estPtsAllowed = totalPtsAllowed / gamesWithScore;
    } else {
      // Estimate: good teams allow fewer points
      // Calibrated so that ~55% team allows ~112, ~45% team allows ~119
      // Defense quality: steal rate and block rate add ~0.3 pts prevention each
      const defBonus = (avgStl - 7.5) * 0.5 + (avgBlk - 4.5) * 0.35;
      const winBonus = (winPct - 0.5) * 10;
      estPtsAllowed = Math.max(105, Math.min(125, LG_ALLOWED - defBonus - winBonus));
    }

    const netPts = avgPts - estPtsAllowed;

    // Pythagorean win% — NBA exponent 13.91
    const exp = 13.91;
    const pythWinPct = avgPts>0 && estPtsAllowed>0
      ? Math.pow(avgPts,exp) / (Math.pow(avgPts,exp) + Math.pow(estPtsAllowed,exp))
      : winPct;

    const profile: TeamProfile = {
      id, abbreviation:abbr, record, wins, losses, winPct,
      avgPts, estPtsAllowed,
      fgPct, threePct, threeRate, ftPct, avgAst, avgTov,
      avgReb, avgBlk, avgStl,
      pythWinPct, pace, netPts,
      last10Wins, homeWins, homeLosses, awayWins, awayLosses, lastGameDate,
    };

    console.log(`[Model v3.1] ${abbr}: ${record} | pts:${avgPts.toFixed(1)} allowed:${estPtsAllowed.toFixed(1)} net:${netPts.toFixed(1)} pyth:${Math.round(pythWinPct*100)}% L10:${last10Wins}-${10-last10Wins}`);
    cache[abbr] = {p:profile, ts:Date.now()};
    return profile;
  } catch(e) {
    console.error(`[Model v3.1] Failed ${abbr}:`, e);
    return null;
  }
}

function restDays(lastDate:string): number {
  if (!lastDate) return 2;
  return Math.max(0, Math.floor((Date.now()-new Date(lastDate).getTime())/(86400000)));
}
function restAdj(days:number): number {
  if (days===0) return -3.5;
  if (days===1) return -0.8;
  if (days>=4)  return +1.2;
  return 0;
}

// Box-Muller normal random for Monte Carlo
function normalRandom(mean:number, sd:number): number {
  const u1 = Math.random(), u2 = Math.random();
  const z = Math.sqrt(-2*Math.log(Math.max(u1,1e-10))) * Math.cos(2*Math.PI*u2);
  return mean + z*sd;
}

interface SimResult {
  homeWinPct: number;
  avgHomeScore: number;
  avgAwayScore: number;
  avgTotal: number;
  spreadCoverPct: number; // pct home covers vegas spread
  overPct: number;
  distribution: Array<{range:string; pct:number}>;
}

function runMonteCarlo(
  homeExpected: number, awayExpected: number,
  vegasSpread: number|undefined, vegasTotal: number|undefined,
  iterations=10000
): SimResult {
  const GAME_SD = 11.5; // per-team std dev in NBA
  let homeWins=0;
  const totals: number[]=[], homeScores: number[]=[], awayScores: number[]=[];

  for (let i=0; i<iterations; i++) {
    const h = Math.round(normalRandom(homeExpected, GAME_SD));
    const a = Math.round(normalRandom(awayExpected, GAME_SD));
    homeScores.push(h); awayScores.push(a); totals.push(h+a);
    if (h>a) homeWins++;
  }

  const avg = (arr:number[]) => arr.reduce((s,x)=>s+x,0)/arr.length;
  const avgHome = avg(homeScores);
  const avgAway = avg(awayScores);
  const avgTot  = avg(totals);

  const spreadCovers = vegasSpread!==undefined
    ? homeScores.filter((_,i)=>(homeScores[i]-awayScores[i])>-vegasSpread).length
    : homeWins;
  const overCount = vegasTotal!==undefined
    ? totals.filter(t=>t>vegasTotal).length
    : totals.filter(t=>t>avgTot).length;

  // Build distribution in 8-pt buckets
  const bucketSize = 8;
  const buckets: Record<number,number>={};
  totals.forEach(t=>{const b=Math.floor(t/bucketSize)*bucketSize; buckets[b]=(buckets[b]||0)+1;});
  const distribution = Object.entries(buckets)
    .sort(([a],[b])=>Number(a)-Number(b))
    .map(([b,cnt])=>({range:`${b}-${Number(b)+bucketSize-1}`,pct:Number(((cnt/iterations)*100).toFixed(1))}));

  return {
    homeWinPct: Number(((homeWins/iterations)*100).toFixed(1)),
    avgHomeScore: Number(avgHome.toFixed(1)),
    avgAwayScore: Number(avgAway.toFixed(1)),
    avgTotal: Number(avgTot.toFixed(1)),
    spreadCoverPct: Number(((spreadCovers/iterations)*100).toFixed(1)),
    overPct: Number(((overCount/iterations)*100).toFixed(1)),
    distribution: distribution.slice(0,14),
  };
}

function winProbToML(p:number): number {
  return p>=0.5 ? -Math.round((p/(1-p))*100) : Math.round(((1-p)/p)*100);
}

function compute(
  home: TeamProfile, away: TeamProfile,
  vegasHomeML?: number, vegasAwayML?: number,
  vegasSpread?: number, vegasTotal?: number,
) {
  // ── Score projections using opponent-adjusted model ───────────────────────
  // Home expected = (our offense × their defensive quality)
  // Their def quality = estPtsAllowed / league avg (lower = better defense)
  const awayDefFactor = away.estPtsAllowed / LG_ALLOWED; // >1 weak def, <1 strong def
  const homeDefFactor = home.estPtsAllowed / LG_ALLOWED;
  const homeBase = home.avgPts * awayDefFactor;
  const awayBase = away.avgPts * homeDefFactor;

  // Adjustments
  const HOME_COURT   = 3.2;
  const homeFormAdj  = (home.last10Wins - 5) * 0.5;
  const awayFormAdj  = (away.last10Wins - 5) * 0.5;
  const homeShoot    = (home.fgPct - LG_FG)  * 0.25;
  const awayShoot    = (away.fgPct - LG_FG)  * 0.25;
  const home3p       = (home.threeRate - 0.38) * home.avgPts * 0.06;
  const away3p       = (away.threeRate - 0.38) * away.avgPts * 0.06;
  const homeTov      = (LG_TOV - home.avgTov) * 1.0;
  const awayTov      = (LG_TOV - away.avgTov) * 1.0;

  const homeRestDays = restDays(home.lastGameDate);
  const awayRestDays = restDays(away.lastGameDate);
  const homeRest     = restAdj(homeRestDays);
  const awayRest     = restAdj(awayRestDays);

  const homeAtHomeGP  = (home.homeWins+home.homeLosses)||1;
  const awayOnRoadGP  = (away.awayWins+away.awayLosses)||1;
  const homeAtHomePct = home.homeWins/homeAtHomeGP;
  const awayOnRoadPct = away.awayWins/awayOnRoadGP;
  const homeSplit     = (homeAtHomePct - home.winPct) * 5;
  const awaySplit     = (awayOnRoadPct - away.winPct) * 5;

  // Pythagorean adjustment (regress toward pyth from actual)
  const homePyth = (home.pythWinPct - home.winPct) * 4;
  const awayPyth = (away.pythWinPct - away.winPct) * 4;

  const homeExpected = homeBase + HOME_COURT + homeFormAdj + homeShoot + home3p + homeTov + homeRest + homeSplit + homePyth;
  const awayExpected = awayBase            + awayFormAdj + awayShoot + away3p + awayTov + awayRest + awaySplit + awayPyth;

  // ── Monte Carlo simulation ────────────────────────────────────────────────
  const sim = runMonteCarlo(homeExpected, awayExpected, vegasSpread, vegasTotal, 10000);

  // Use Monte Carlo win% as primary probability (more robust than logistic)
  const homeWinProb = Math.max(0.05, Math.min(0.95, sim.homeWinPct/100));
  const awayWinProb = 1 - homeWinProb;
  const modelSpread = Number(-(homeExpected - awayExpected).toFixed(1));
  const modelTotal  = Number(sim.avgTotal.toFixed(1));

  // ── Edge vs Vegas ─────────────────────────────────────────────────────────
  let vegHP: number|undefined, vegAP: number|undefined;
  let edgeHome=0, edgeAway=0;
  if (vegasHomeML && vegasAwayML) {
    const rH = vegasHomeML<0 ? Math.abs(vegasHomeML)/(Math.abs(vegasHomeML)+100) : 100/(vegasHomeML+100);
    const rA = vegasAwayML<0 ? Math.abs(vegasAwayML)/(Math.abs(vegasAwayML)+100) : 100/(vegasAwayML+100);
    const v=rH+rA; vegHP=rH/v; vegAP=rA/v;
    edgeHome = Number(((homeWinProb-vegHP)*100).toFixed(1));
    edgeAway = Number(((awayWinProb-vegAP)*100).toFixed(1));
  }

  const spreadDisc = vegasSpread!==undefined ? Number((modelSpread-vegasSpread).toFixed(1)) : null;
  const totalDisc  = vegasTotal!==undefined  ? Number((modelTotal-vegasTotal).toFixed(1))   : null;

  // ── Confidence ────────────────────────────────────────────────────────────
  const netGap    = Math.abs(home.netPts - away.netPts);
  const formGap   = Math.abs(home.last10Wins - away.last10Wins);
  const pythGap   = Math.abs(home.pythWinPct - away.pythWinPct)*100;
  const restBonus = Math.abs(homeRestDays-awayRestDays)>=2 ? 4 : 0;
  const confidence = Math.min(90, Math.max(48,
    50 + netGap*1.2 + formGap*1.4 + pythGap*0.4 + Math.abs(homeExpected-awayExpected)*0.4 + restBonus
  ));

  // ── Factors ───────────────────────────────────────────────────────────────
  const factors: any[] = [];
  const homeFav = homeWinProb > 0.5;
  const favT = homeFav ? home : away;
  const dogT = homeFav ? away : home;

  // Net scoring
  if (netGap > 1.5) {
    factors.push({
      label:`${favT.abbreviation} Scoring Edge`,
      impact: netGap>8?'high':netGap>4?'medium':'low',
      direction:'positive',
      value:`${favT.abbreviation} ${favT.netPts>0?'+':''}${favT.netPts.toFixed(1)} vs ${dogT.abbreviation} ${dogT.netPts>0?'+':''}${dogT.netPts.toFixed(1)} net pts/gm`,
      description:`${favT.abbreviation} outscores opponents by ${favT.netPts.toFixed(1)} pts/game vs ${dogT.abbreviation}'s ${dogT.netPts.toFixed(1)}. Scoring: ${favT.avgPts.toFixed(1)} / allowing ~${favT.estPtsAllowed.toFixed(1)}.`,
    });
  }

  // Pythagorean
  if (pythGap > 4) {
    factors.push({
      label:`Pythagorean Strength`,
      impact: pythGap>12?'high':'medium',
      direction:'positive',
      value:`${favT.abbreviation} ${Math.round(favT.pythWinPct*100)}% vs ${dogT.abbreviation} ${Math.round(dogT.pythWinPct*100)}%`,
      description:`Pythagorean win% (true team quality based on point differential): ${favT.abbreviation} ${Math.round(favT.pythWinPct*100)}% vs ${dogT.abbreviation} ${Math.round(dogT.pythWinPct*100)}%. Stronger predictor than actual W%.`,
    });
  }

  // Recent form
  if (formGap >= 2) {
    const betF = home.last10Wins>away.last10Wins?home:away;
    const worF = betF===home?away:home;
    factors.push({
      label:`${betF.abbreviation} Recent Form`,
      impact: formGap>=5?'high':formGap>=3?'medium':'low',
      direction:(betF===home)===homeFav?'positive':'negative',
      value:`L10: ${betF.last10Wins}-${10-betF.last10Wins} vs ${worF.last10Wins}-${10-worF.last10Wins}`,
      description:`${betF.abbreviation} is ${betF.last10Wins}-${10-betF.last10Wins} in last 10 vs ${worF.abbreviation}'s ${worF.last10Wins}-${10-worF.last10Wins}.`,
    });
  }

  // Rest advantage
  if (Math.abs(homeRestDays-awayRestDays)>=2) {
    const moreR=homeRestDays>awayRestDays?home:away;
    const lessR=moreR===home?away:home;
    const lrD=moreR===home?awayRestDays:homeRestDays;
    factors.push({
      label:lrD===0?`${lessR.abbreviation} Back-to-Back`:`Rest Edge — ${moreR.abbreviation}`,
      impact:'medium',
      direction:(moreR===home)===homeFav?'positive':'negative',
      value:lrD===0?'B2B -3.5pt penalty':`+${Math.abs(homeRestDays-awayRestDays)} days rest`,
      description:lrD===0
        ?`${lessR.abbreviation} on back-to-back (2nd night) — historically -3.5 pts.`
        :`${moreR.abbreviation} has ${homeRestDays>awayRestDays?homeRestDays:awayRestDays} days rest vs ${lessR.abbreviation}'s ${lrD}.`,
    });
  }

  // Home/away splits
  factors.push({
    label:'Home/Away Splits',
    impact:'low',
    direction:homeAtHomePct>0.5?'positive':'negative',
    value:`${home.abbreviation} ${home.homeWins}-${home.homeLosses} home | ${away.abbreviation} ${away.awayWins}-${away.awayLosses} road`,
    description:`${home.abbreviation} at home: ${home.homeWins}-${home.homeLosses} (${Math.round(homeAtHomePct*100)}%). ${away.abbreviation} on road: ${away.awayWins}-${away.awayLosses} (${Math.round(awayOnRoadPct*100)}%).`,
  });

  // Model vs Vegas
  if (spreadDisc!==null && Math.abs(spreadDisc)>=2.5) {
    const valSide = spreadDisc<0?home.abbreviation:away.abbreviation;
    factors.push({
      label:`Model-Vegas Gap: ${Math.abs(spreadDisc).toFixed(1)} pts`,
      impact:Math.abs(spreadDisc)>5?'high':'medium',
      direction:'positive',
      value:`Model: ${home.abbreviation} ${modelSpread>0?'+':''}${modelSpread} | Vegas: ${vegasSpread}`,
      description:`Model projects ${Math.abs(spreadDisc).toFixed(1)}-pt discrepancy. Favors ${valSide} vs posted line — potential value.`,
    });
  }

  const reasoning = [
    `Model v3.1 (10K Monte Carlo): ${home.abbreviation} ${homeExpected.toFixed(1)} — ${away.abbreviation} ${awayExpected.toFixed(1)}.`,
    `Simulated ${home.abbreviation} win ${Math.round(homeWinProb*100)}% / ${away.abbreviation} ${Math.round(awayWinProb*100)}% across 10,000 iterations.`,
    `Projected total: ${modelTotal} | Spread: ${home.abbreviation} ${modelSpread>0?'+':''}${modelSpread}.`,
    vegasSpread!==undefined
      ? `Vegas: ${home.abbreviation} ${vegasSpread>0?'+':''}${vegasSpread} — model ${Math.abs(spreadDisc??0)<1.5?'agrees':'DISAGREES by '+Math.abs(spreadDisc??0).toFixed(1)+' pts'}.`
      : '',
    `Monte Carlo: ${sim.overPct}% over ${vegasTotal??modelTotal} | ${home.abbreviation} covers ${sim.spreadCoverPct}%.`,
    `Net pts/gm: ${home.abbreviation} ${home.netPts>0?'+':''}${home.netPts.toFixed(1)} | ${away.abbreviation} ${away.netPts>0?'+':''}${away.netPts.toFixed(1)}.`,
    `Pythagorean: ${home.abbreviation} ${Math.round(home.pythWinPct*100)}% | ${away.abbreviation} ${Math.round(away.pythWinPct*100)}%.`,
    homeRestDays===0?`${home.abbreviation} back-to-back.`:awayRestDays===0?`${away.abbreviation} back-to-back.`:'',
  ].filter(Boolean).join(' ');

  return {
    homeWinProb, awayWinProb, modelSpread, modelTotal,
    vegHP, vegAP, edgeHome, edgeAway,
    confidence:Math.round(confidence),
    factors:factors.slice(0,5), reasoning,
    spreadDisc, totalDisc,
    homeFinal: Number(homeExpected.toFixed(1)),
    awayFinal: Number(awayExpected.toFixed(1)),
    sim,
  };
}

export async function buildNBAPrediction(
  homeAbbr:string, awayAbbr:string,
  vegasHomeML?:number, vegasAwayML?:number,
  vegasSpread?:number, vegasTotal?:number,
  homeInjury?:TeamInjuryImpact, awayInjury?:TeamInjuryImpact,
): Promise<{prediction:any; homeProfile:TeamProfile|null; awayProfile:TeamProfile|null}> {

  const [homeProfile, awayProfile] = await Promise.all([
    fetchProfile(homeAbbr), fetchProfile(awayAbbr),
  ]);

  if (!homeProfile || !awayProfile) {
    let hp=0.5, ap=0.5;
    if (vegasHomeML && vegasAwayML) {
      const rH=vegasHomeML<0?Math.abs(vegasHomeML)/(Math.abs(vegasHomeML)+100):100/(vegasHomeML+100);
      const rA=vegasAwayML<0?Math.abs(vegasAwayML)/(Math.abs(vegasAwayML)+100):100/(vegasAwayML+100);
      const v=rH+rA; hp=rH/v; ap=rA/v;
    }
    return { homeProfile, awayProfile, prediction:{
      id:'pred-fallback', modelVersion:'v3.1',
      predictedWinner:hp>0.5?homeAbbr.toLowerCase():awayAbbr.toLowerCase(),
      winProbHome:hp, winProbAway:ap,
      projectedTotal:vegasTotal??224, projectedSpread:vegasSpread??0,
      confidenceScore:50, fairOddsHome:winProbToML(hp), fairOddsAway:winProbToML(ap),
      edgeHome:0, edgeAway:0, modelVsVegasSpread:null, modelVsVegasTotal:null,
      supportingFactors:[], riskFactors:[],
      reasoning:'Team stats unavailable — Vegas lines used as reference.',
      createdAt:new Date().toISOString(),
    }};
  }

  // Apply injury deductions
  if (homeInjury?.pointsLost > 0) {
    homeProfile.avgPts        = Math.max(90, homeProfile.avgPts - homeInjury.pointsLost);
    homeProfile.netPts        = homeProfile.avgPts - homeProfile.estPtsAllowed;
    homeProfile.pythWinPct    = Math.pow(homeProfile.avgPts,13.91)/(Math.pow(homeProfile.avgPts,13.91)+Math.pow(homeProfile.estPtsAllowed,13.91));
    console.log(`[Model v3.1] ${homeAbbr} inj adj -${homeInjury.pointsLost.toFixed(0)}: ${homeInjury.description}`);
  }
  if (awayInjury?.pointsLost > 0) {
    awayProfile.avgPts        = Math.max(90, awayProfile.avgPts - awayInjury.pointsLost);
    awayProfile.netPts        = awayProfile.avgPts - awayProfile.estPtsAllowed;
    awayProfile.pythWinPct    = Math.pow(awayProfile.avgPts,13.91)/(Math.pow(awayProfile.avgPts,13.91)+Math.pow(awayProfile.estPtsAllowed,13.91));
    console.log(`[Model v3.1] ${awayAbbr} inj adj -${awayInjury.pointsLost.toFixed(0)}: ${awayInjury.description}`);
  }

  const model = compute(homeProfile, awayProfile, vegasHomeML, vegasAwayML, vegasSpread, vegasTotal);

  const prediction: any = {
    id:`pred-nba-model`,
    modelVersion:'v3.1',
    predictedWinner: model.homeWinProb>0.5?homeAbbr.toLowerCase():awayAbbr.toLowerCase(),
    winProbHome:  Number(model.homeWinProb.toFixed(3)),
    winProbAway:  Number(model.awayWinProb.toFixed(3)),
    projectedTotal:  model.modelTotal,
    projectedSpread: model.modelSpread,
    projectedHomeScore: model.homeFinal,
    projectedAwayScore: model.awayFinal,
    confidenceScore: model.confidence,
    fairOddsHome: winProbToML(model.homeWinProb),
    fairOddsAway: winProbToML(model.awayWinProb),
    edgeHome: model.edgeHome,
    edgeAway: model.edgeAway,
    modelVsVegasSpread: model.spreadDisc,
    modelVsVegasTotal:  model.totalDisc,
    monteCarlo: model.sim,  // full simulation results
    supportingFactors: model.factors,
    riskFactors: [],
    reasoning: model.reasoning,
    createdAt: new Date().toISOString(),
  };

  // Injury factors prepended
  if (homeInjury?.pointsLost >= 4) {
    prediction.supportingFactors.unshift({
      label:`⚠ ${homeAbbr} Injuries`,
      impact:homeInjury.pointsLost>=8?'high':'medium',
      direction:'negative',
      value:`−${homeInjury.pointsLost.toFixed(0)} PPG impact`,
      description:homeInjury.description,
    });
  }
  if (awayInjury?.pointsLost >= 4) {
    prediction.supportingFactors.unshift({
      label:`⚠ ${awayAbbr} Injuries`,
      impact:awayInjury.pointsLost>=8?'high':'medium',
      direction:'negative',
      value:`−${awayInjury.pointsLost.toFixed(0)} PPG impact`,
      description:awayInjury.description,
    });
  }
  prediction.supportingFactors = prediction.supportingFactors.slice(0,5);
  return { prediction, homeProfile, awayProfile };
}
