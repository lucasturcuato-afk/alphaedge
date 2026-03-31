// src/lib/api/nba-model.ts — Model v3.0
// Real independent NBA prediction model.
// Uses: opponent-adjusted scoring, Pythagorean win%, home/away splits,
//       rest days, recent form, shooting efficiency, turnovers.
// Edge = our win probability vs Vegas implied probability.

import type { TeamInjuryImpact } from './injuries';

export interface TeamProfile {
  id: string;
  abbreviation: string;
  record: string;
  wins: number;
  losses: number;
  winPct: number;
  // Scoring
  avgPts: number;          // points scored per game
  avgPtsAllowed: number;   // points allowed per game (from opponent stats in schedule)
  // Shooting
  fgPct: number;
  threePct: number;
  threeRate: number;       // 3PA / FGA — how 3pt-heavy they are
  ftPct: number;
  ftRate: number;          // FTA / FGA
  // Ball movement
  avgAst: number;
  avgTov: number;
  astToRatio: number;
  // Defense
  avgReb: number;
  avgBlk: number;
  avgStl: number;
  // Derived
  pythWinPct: number;      // Pythagorean win% (more predictive than actual W%)
  pace: number;            // possessions per game
  netPts: number;          // avgPts - avgPtsAllowed
  // Form & splits
  last10Wins: number;
  homeWins: number; homeLosses: number;
  awayWins: number; awayLosses: number;
  lastGameDate: string;
}

const ESPN_STATS    = (id:string) => `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/${id}/statistics`;
const ESPN_SCHEDULE = (id:string) => `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/${id}/schedule?seasontype=2&limit=20`;

// ESPN team ID lookup — must handle both standard and alternate abbreviations
const ESPN_IDS: Record<string,string> = {
  ATL:'1', BOS:'2', BKN:'17', CHA:'30', CHI:'4',  CLE:'5',  DAL:'6',  DEN:'7',
  DET:'8', GSW:'9', HOU:'10', IND:'11', LAC:'12', LAL:'13', MEM:'29', MIA:'14',
  MIL:'15',MIN:'16',NOP:'3',  NYK:'18', OKC:'25', ORL:'19', PHI:'20', PHX:'21',
  POR:'22',SAC:'23',SAS:'24', TOR:'28', UTA:'26', WAS:'27',
  // ESPN scoreboard sometimes uses these alternate abbrs:
  NY:'18', GS:'9', SA:'24', NO:'3', UTAH:'26',
};

// League averages 2025-26 (for normalization)
const LG = { pts: 115.8, fgPct: 47.1, threePct: 36.8, tov: 13.5, pace: 98.2 };

let cache: Record<string,{p:TeamProfile;ts:number}> = {};
const TTL = 2*60*60*1000;

async function fetchProfile(abbr: string): Promise<TeamProfile|null> {
  const hit = cache[abbr];
  if (hit && Date.now()-hit.ts < TTL) return hit.p;

  const id = ESPN_IDS[abbr];
  if (!id) { console.warn(`[Model v3] No ESPN ID for "${abbr}"`); return null; }

  try {
    const [sr, schr] = await Promise.all([
      fetch(ESPN_STATS(id),    { next:{revalidate:7200} }),
      fetch(ESPN_SCHEDULE(id), { next:{revalidate:7200} }),
    ]);
    if (!sr.ok) throw new Error(`Stats ${sr.status}`);

    const sd  = await sr.json();
    const cats: any[] = sd.results?.stats?.categories ?? [];
    const g = (cat:string, stat:string): number => {
      const c = cats.find((x:any)=>x.name===cat);
      const s = c?.stats?.find((x:any)=>x.name===stat);
      return parseFloat(s?.displayValue??'0')||0;
    };

    // Core stats from ESPN
    const avgPts    = g('offensive','avgPoints');
    const fgPct     = g('offensive','fieldGoalPct');
    const threePct  = g('offensive','threePointFieldGoalPct') || g('offensive','threePointPct');
    const ftPct     = g('offensive','freeThrowPct');
    const avgAst    = g('offensive','avgAssists');
    const avgTov    = g('offensive','avgTurnovers');
    const avgFGA    = g('offensive','avgFieldGoalsAttempted');
    const avg3PA    = g('offensive','avgThreePointFieldGoalsAttempted');
    const avgFTA    = g('offensive','avgFreeThrowsAttempted');
    const avgReb    = g('general','avgRebounds');
    const avgBlk    = g('defensive','avgBlocks');
    const avgStl    = g('defensive','avgSteals');
    const astToRatio= g('general','assistTurnoverRatio') || (avgAst/(avgTov||1));

    // Pace: Dean Oliver formula — possessions = FGA + 0.44*FTA + TOV - OReb
    // We don't have OReb directly so use 0.25*TReb as proxy
    const avgOReb = avgReb * 0.27; // ~27% of rebounds are offensive
    const pace = avgFGA + 0.44*avgFTA + avgTov - avgOReb;

    // 3-point rate (how 3pt-heavy they play)
    const threeRate = avgFGA > 0 ? avg3PA/avgFGA : 0.38;
    const ftRate    = avgFGA > 0 ? avgFTA/avgFGA : 0.28;

    // Parse schedule for record, form, splits, pts allowed
    let wins=0, losses=0, record='0-0';
    let last10Wins=0, homeWins=0, homeLosses=0, awayWins=0, awayLosses=0;
    let lastGameDate='', totalPtsAllowed=0, gamesWithScore=0;

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

      done.forEach((e:any, i:number) => {
        const comp = e.competitions[0];
        const homeC = comp.competitors.find((c:any)=>c.homeAway==='home');
        const awayC = comp.competitors.find((c:any)=>c.homeAway==='away');
        const isHome = homeC?.team?.abbreviation===abbr ||
                       homeC?.team?.id===id;
        const us  = isHome ? homeC : awayC;
        const opp = isHome ? awayC : homeC;
        const won = us?.winner===true;

        // Accumulate pts allowed
        const oppScore = parseInt(opp?.score??'0',10);
        if (oppScore>0) { totalPtsAllowed+=oppScore; gamesWithScore++; }

        if (isHome) { won ? homeWins++ : homeLosses++; }
        else        { won ? awayWins++ : awayLosses++; }
        if (i >= done.length-10 && won) last10Wins++;
      });
    }

    const gp    = wins+losses||74;
    const winPct = wins/gp;
    const avgPtsAllowed = gamesWithScore>0 ? totalPtsAllowed/gamesWithScore : LG.pts;
    const netPts = avgPts - avgPtsAllowed;

    // Pythagorean win% — more predictive than actual win% (NBA exponent ~13.91)
    // P_win = pts^exp / (pts^exp + pts_allowed^exp)
    const exp = 13.91;
    const pythWinPct = avgPts>0 && avgPtsAllowed>0
      ? Math.pow(avgPts,exp) / (Math.pow(avgPts,exp)+Math.pow(avgPtsAllowed,exp))
      : winPct;

    const profile: TeamProfile = {
      id, abbreviation:abbr, record, wins, losses, winPct,
      avgPts, avgPtsAllowed,
      fgPct, threePct, threeRate, ftPct, ftRate,
      avgAst, avgTov, astToRatio,
      avgReb, avgBlk, avgStl,
      pythWinPct, pace, netPts,
      last10Wins, homeWins, homeLosses, awayWins, awayLosses, lastGameDate,
    };

    console.log(
      `[Model v3] ${abbr}: ${record} | +/-:${netPts.toFixed(1)} pyth:${(pythWinPct*100).toFixed(0)}% `+
      `pace:${pace.toFixed(1)} L10:${last10Wins}-${10-last10Wins}`
    );
    cache[abbr] = {p:profile, ts:Date.now()};
    return profile;
  } catch(e) {
    console.error(`[Model v3] Failed ${abbr}:`, e);
    return null;
  }
}

function restDays(lastGameDate:string): number {
  if (!lastGameDate) return 2;
  const ms = Date.now() - new Date(lastGameDate).getTime();
  return Math.max(0, Math.floor(ms/(1000*60*60*24)));
}

function restAdj(days:number): number {
  if (days===0) return -3.5;   // back-to-back penalty (well documented)
  if (days===1) return -0.8;
  if (days>=4)  return +1.2;   // well-rested bonus
  return 0;
}

function logistic(z:number): number {
  return 1/(1+Math.exp(-z));
}

function winProbToML(p:number): number {
  return p>=0.5 ? -Math.round((p/(1-p))*100) : Math.round(((1-p)/p)*100);
}

function compute(
  home: TeamProfile, away: TeamProfile,
  vegasHomeML?: number, vegasAwayML?: number,
  vegasSpread?: number, vegasTotal?: number,
) {
  // ── STEP 1: Opponent-adjusted score projections ───────────────────────────
  // Expected home score:
  //   Base = home's avgPts
  //   Defensive adj = (away's avgPtsAllowed / league avg) — scales our scoring
  //   E.g. if away allows only 108 (LG avg 115.8), factor = 108/115.8 = 0.933 → we score less
  const homeDefFactor  = away.avgPtsAllowed / LG.pts;
  const awayDefFactor  = home.avgPtsAllowed / LG.pts;
  const homeBaseScore  = home.avgPts * homeDefFactor;
  const awayBaseScore  = away.avgPts * awayDefFactor;

  // ── STEP 2: Adjustment factors ────────────────────────────────────────────
  const HOME_COURT = 3.2;

  // Recent form (L10 above/below .500 × 0.5 pts per win)
  const homeFormAdj = (home.last10Wins - 5) * 0.5;
  const awayFormAdj = (away.last10Wins - 5) * 0.5;

  // Shooting efficiency vs league avg
  const homeShootAdj = (home.fgPct - LG.fgPct) * 0.3;
  const awayShootAdj = (away.fgPct - LG.fgPct) * 0.3;

  // 3-point rate advantage — high 3pt rate teams score more efficiently
  const home3Adj = (home.threeRate - 0.38) * home.avgPts * 0.08;
  const away3Adj = (away.threeRate - 0.38) * away.avgPts * 0.08;

  // Turnover differential — each extra TO ≈ 1.1 pts (opponent gets possession)
  const homeTovAdj = (LG.tov - home.avgTov) * 1.1;
  const awayTovAdj = (LG.tov - away.avgTov) * 1.1;

  // Assist/TO ratio — ball movement quality
  const homeAstAdj = (home.astToRatio - 2.0) * 0.4;
  const awayAstAdj = (away.astToRatio - 2.0) * 0.4;

  // Rest days
  const homeRest = restDays(home.lastGameDate);
  const awayRest = restDays(away.lastGameDate);
  const homeRestAdj = restAdj(homeRest);
  const awayRestAdj = restAdj(awayRest);

  // Home/away split (how much better/worse vs overall record)
  const homeAtHomeGP  = (home.homeWins + home.homeLosses) || 1;
  const awayOnRoadGP  = (away.awayWins + away.awayLosses) || 1;
  const homeAtHomePct = home.homeWins / homeAtHomeGP;
  const awayOnRoadPct = away.awayWins / awayOnRoadGP;
  const homeSplitAdj  = (homeAtHomePct - home.winPct) * 5;
  const awaySplitAdj  = (awayOnRoadPct - away.winPct) * 5;

  // Pythagorean strength adjustment
  // Teams with better pyth than actual record tend to regress toward pyth
  const homePythAdj = (home.pythWinPct - home.winPct) * 4;
  const awayPythAdj = (away.pythWinPct - away.winPct) * 4;

  // Final projected scores
  const homeFinal = homeBaseScore + HOME_COURT
    + homeFormAdj + homeShootAdj + home3Adj + homeTovAdj + homeAstAdj
    + homeRestAdj + homeSplitAdj + homePythAdj;
  const awayFinal = awayBaseScore
    + awayFormAdj + awayShootAdj + away3Adj + awayTovAdj + awayAstAdj
    + awayRestAdj + awaySplitAdj + awayPythAdj;

  // ── STEP 3: Win probability ───────────────────────────────────────────────
  // NBA game score difference std dev ≈ 12 pts (empirical)
  const scoreDiff = homeFinal - awayFinal;
  const STDDEV = 12.0;
  const homeWinProb = Math.max(0.05, Math.min(0.95, logistic(1.65 * scoreDiff/STDDEV)));
  const awayWinProb = 1 - homeWinProb;
  const modelSpread = Number((-scoreDiff).toFixed(1));
  const modelTotal  = Number((homeFinal + awayFinal).toFixed(1));

  // ── STEP 4: Edge vs Vegas ─────────────────────────────────────────────────
  let vegHP: number|undefined, vegAP: number|undefined;
  let edgeHome=0, edgeAway=0;
  if (vegasHomeML && vegasAwayML) {
    const rH = vegasHomeML<0 ? Math.abs(vegasHomeML)/(Math.abs(vegasHomeML)+100) : 100/(vegasHomeML+100);
    const rA = vegasAwayML<0 ? Math.abs(vegasAwayML)/(Math.abs(vegasAwayML)+100) : 100/(vegasAwayML+100);
    const vig = rH+rA;
    vegHP = rH/vig; vegAP = rA/vig;
    edgeHome = Number(((homeWinProb-vegHP)*100).toFixed(1));
    edgeAway = Number(((awayWinProb-vegAP)*100).toFixed(1));
  }

  const spreadDisc = vegasSpread!==undefined ? Number((modelSpread-vegasSpread).toFixed(1)) : null;
  const totalDisc  = vegasTotal!==undefined  ? Number((modelTotal-vegasTotal).toFixed(1))   : null;

  // ── STEP 5: Confidence ────────────────────────────────────────────────────
  const ptsDiff   = Math.abs(home.netPts - away.netPts);
  const formGap   = Math.abs(home.last10Wins - away.last10Wins);
  const pythGap   = Math.abs(home.pythWinPct - away.pythWinPct)*100;
  const restBonus = Math.abs(homeRest-awayRest)>=2 ? 4 : 0;
  const confidence = Math.min(90, Math.max(48,
    50 + ptsDiff*1.2 + formGap*1.4 + pythGap*0.5 + Math.abs(scoreDiff)*0.5 + restBonus
  ));

  // ── STEP 6: Key factors ───────────────────────────────────────────────────
  const factors: any[] = [];
  const homeFav = homeWinProb > 0.5;
  const favT = homeFav ? home : away;
  const dogT = homeFav ? away : home;

  // Points differential (net scoring)
  if (ptsDiff > 2) {
    factors.push({
      label: `${favT.abbreviation} Scoring Advantage`,
      impact: ptsDiff>8?'high':ptsDiff>4?'medium':'low',
      direction: 'positive',
      value: `+${favT.netPts>0?'+':''}${favT.netPts.toFixed(1)} vs ${dogT.netPts>0?'+':''}${dogT.netPts.toFixed(1)} pts/game`,
      description: `${favT.abbreviation} outscores opponents by ${favT.netPts.toFixed(1)} pts/game this season. ${dogT.abbreviation}: ${dogT.netPts.toFixed(1)} pts/game net.`,
    });
  }

  // Pythagorean strength
  if (pythGap > 5) {
    factors.push({
      label: `${favT.abbreviation} True Strength (Pythagorean)`,
      impact: pythGap>12?'high':'medium',
      direction: 'positive',
      value: `${Math.round(favT.pythWinPct*100)}% vs ${Math.round(dogT.pythWinPct*100)}% pyth win%`,
      description: `Pythagorean win% (based on point differential, more predictive than record): ${favT.abbreviation} ${Math.round(favT.pythWinPct*100)}% vs ${dogT.abbreviation} ${Math.round(dogT.pythWinPct*100)}%.`,
    });
  }

  // Recent form
  if (formGap >= 2) {
    const betF = home.last10Wins>away.last10Wins?home:away;
    const worF = betF===home?away:home;
    factors.push({
      label: `${betF.abbreviation} Recent Form`,
      impact: formGap>=5?'high':formGap>=3?'medium':'low',
      direction: (betF===home)===homeFav?'positive':'negative',
      value: `L10: ${betF.last10Wins}-${10-betF.last10Wins} vs ${worF.last10Wins}-${10-worF.last10Wins}`,
      description: `${betF.abbreviation} is ${betF.last10Wins}-${10-betF.last10Wins} in their last 10 games vs ${worF.abbreviation}'s ${worF.last10Wins}-${10-worF.last10Wins}.`,
    });
  }

  // Rest advantage
  if (Math.abs(homeRest-awayRest)>=2) {
    const moreR = homeRest>awayRest?home:away;
    const lessR = moreR===home?away:home;
    const lrDays = moreR===home?awayRest:homeRest;
    factors.push({
      label: lrDays===0?`${lessR.abbreviation} Back-to-Back`:`Rest Advantage — ${moreR.abbreviation}`,
      impact: 'medium',
      direction: (moreR===home)===homeFav?'positive':'negative',
      value: lrDays===0?'B2B penalty -3.5 pts':`${Math.abs(homeRest-awayRest)} day rest edge`,
      description: lrDays===0
        ? `${lessR.abbreviation} playing 2nd night of a back-to-back — well-documented ~3.5pt disadvantage.`
        : `${moreR.abbreviation} has had ${homeRest>awayRest?homeRest:awayRest} rest days vs ${lessR.abbreviation}'s ${lrDays}.`,
    });
  }

  // Shooting / turnover edge
  const tovDiff = Math.abs(home.avgTov - away.avgTov);
  if (tovDiff > 1.5) {
    const lowerTov = home.avgTov < away.avgTov ? home : away;
    const higherTov = lowerTov===home?away:home;
    factors.push({
      label: `${lowerTov.abbreviation} Ball Security`,
      impact: tovDiff>3?'medium':'low',
      direction: (lowerTov===home)===homeFav?'positive':'negative',
      value: `${lowerTov.avgTov.toFixed(1)} vs ${higherTov.avgTov.toFixed(1)} TOV/game`,
      description: `${lowerTov.abbreviation} turns it over ${tovDiff.toFixed(1)} fewer times per game — each turnover worth ~1.1 pts in possession value.`,
    });
  }

  // Home/away splits
  factors.push({
    label: 'Home/Away Splits',
    impact: 'low',
    direction: homeAtHomePct>0.5?'positive':'negative',
    value: `${home.abbreviation} ${home.homeWins}-${home.homeLosses} home | ${away.abbreviation} ${away.awayWins}-${away.awayLosses} road`,
    description: `${home.abbreviation} home record: ${home.homeWins}-${home.homeLosses} (${Math.round(homeAtHomePct*100)}%). ${away.abbreviation} road: ${away.awayWins}-${away.awayLosses} (${Math.round(awayOnRoadPct*100)}%).`,
  });

  // Model vs Vegas discrepancy
  if (spreadDisc!==null && Math.abs(spreadDisc)>=2.5) {
    const valSide = spreadDisc<0?home.abbreviation:away.abbreviation;
    factors.push({
      label: `Model Disagrees with Vegas by ${Math.abs(spreadDisc).toFixed(1)} pts`,
      impact: Math.abs(spreadDisc)>5?'high':'medium',
      direction: 'positive',
      value: `Model: ${modelSpread>0?'+':''}${modelSpread} | Vegas: ${vegasSpread}`,
      description: `Model projects ${Math.abs(spreadDisc).toFixed(1)}-pt gap vs posted line. Model favors ${valSide} — potential betting value.`,
    });
  }

  const reasoning = [
    `Model v3 projects ${home.abbreviation} ${homeFinal.toFixed(1)} — ${away.abbreviation} ${awayFinal.toFixed(1)}.`,
    `Win prob: ${home.abbreviation} ${Math.round(homeWinProb*100)}% / ${away.abbreviation} ${Math.round(awayWinProb*100)}%.`,
    `Model spread: ${home.abbreviation} ${modelSpread>0?'+':''}${modelSpread} | Total: ${modelTotal}.`,
    vegasSpread!==undefined
      ? `Vegas: ${home.abbreviation} ${vegasSpread>0?'+':''}${vegasSpread} — model ${Math.abs(spreadDisc??0)<1.5?'aligned':'DISAGREES by '+Math.abs(spreadDisc??0).toFixed(1)+' pts'}.`
      : '',
    `Pythagorean: ${home.abbreviation} ${Math.round(home.pythWinPct*100)}% / ${away.abbreviation} ${Math.round(away.pythWinPct*100)}%.`,
    `Net pts/game: ${home.abbreviation} ${home.netPts>0?'+':''}${home.netPts.toFixed(1)} | ${away.abbreviation} ${away.netPts>0?'+':''}${away.netPts.toFixed(1)}.`,
    `L10: ${home.abbreviation} ${home.last10Wins}-${10-home.last10Wins} | ${away.abbreviation} ${away.last10Wins}-${10-away.last10Wins}.`,
    homeRest===0?`${home.abbreviation} on back-to-back.`:awayRest===0?`${away.abbreviation} on back-to-back.`:'',
  ].filter(Boolean).join(' ');

  return {
    homeWinProb, awayWinProb, modelSpread, modelTotal,
    vegHP, vegAP, edgeHome, edgeAway,
    confidence:Math.round(confidence), factors:factors.slice(0,5),
    reasoning, spreadDisc, totalDisc,
    homeFinal: Number(homeFinal.toFixed(1)),
    awayFinal: Number(awayFinal.toFixed(1)),
  };
}

export async function buildNBAPrediction(
  homeAbbr: string, awayAbbr: string,
  vegasHomeML?: number, vegasAwayML?: number,
  vegasSpread?: number, vegasTotal?: number,
  homeInjury?: TeamInjuryImpact, awayInjury?: TeamInjuryImpact,
): Promise<{prediction:any; homeProfile:TeamProfile|null; awayProfile:TeamProfile|null}> {

  const [homeProfile, awayProfile] = await Promise.all([
    fetchProfile(homeAbbr), fetchProfile(awayAbbr),
  ]);

  // Vegas-based fallback if ESPN stats unavailable
  if (!homeProfile || !awayProfile) {
    let hp=0.5, ap=0.5;
    if (vegasHomeML && vegasAwayML) {
      const rH=vegasHomeML<0?Math.abs(vegasHomeML)/(Math.abs(vegasHomeML)+100):100/(vegasHomeML+100);
      const rA=vegasAwayML<0?Math.abs(vegasAwayML)/(Math.abs(vegasAwayML)+100):100/(vegasAwayML+100);
      const v=rH+rA; hp=rH/v; ap=rA/v;
    }
    return { homeProfile, awayProfile, prediction:{
      id:'pred-fallback', modelVersion:'v3.0',
      predictedWinner: hp>0.5?homeAbbr.toLowerCase():awayAbbr.toLowerCase(),
      winProbHome:hp, winProbAway:ap,
      projectedTotal:vegasTotal??224, projectedSpread:vegasSpread??0,
      confidenceScore:50, fairOddsHome:winProbToML(hp), fairOddsAway:winProbToML(ap),
      edgeHome:0, edgeAway:0, modelVsVegasSpread:null, modelVsVegasTotal:null,
      supportingFactors:[], riskFactors:[],
      reasoning:'Team stats unavailable — Vegas lines used as reference.',
      createdAt:new Date().toISOString(),
    }};
  }

  // Apply injury deductions to scoring averages
  if (homeInjury?.pointsLost > 0) {
    homeProfile.avgPts        = Math.max(90, homeProfile.avgPts - homeInjury.pointsLost);
    homeProfile.netPts        = homeProfile.avgPts - homeProfile.avgPtsAllowed;
    homeProfile.pythWinPct    = Math.pow(homeProfile.avgPts,13.91)/(Math.pow(homeProfile.avgPts,13.91)+Math.pow(homeProfile.avgPtsAllowed,13.91));
    console.log(`[Model v3] ${homeAbbr} injury adj -${homeInjury.pointsLost.toFixed(0)}pts: ${homeInjury.description}`);
  }
  if (awayInjury?.pointsLost > 0) {
    awayProfile.avgPts        = Math.max(90, awayProfile.avgPts - awayInjury.pointsLost);
    awayProfile.netPts        = awayProfile.avgPts - awayProfile.avgPtsAllowed;
    awayProfile.pythWinPct    = Math.pow(awayProfile.avgPts,13.91)/(Math.pow(awayProfile.avgPts,13.91)+Math.pow(awayProfile.avgPtsAllowed,13.91));
    console.log(`[Model v3] ${awayAbbr} injury adj -${awayInjury.pointsLost.toFixed(0)}pts: ${awayInjury.description}`);
  }

  const model = compute(homeProfile, awayProfile, vegasHomeML, vegasAwayML, vegasSpread, vegasTotal);

  const prediction: any = {
    id: `pred-nba-model`,
    modelVersion: 'v3.0',
    predictedWinner: model.homeWinProb>0.5?homeAbbr.toLowerCase():awayAbbr.toLowerCase(),
    winProbHome:  Number(model.homeWinProb.toFixed(3)),
    winProbAway:  Number(model.awayWinProb.toFixed(3)),
    projectedTotal:  model.modelTotal,
    projectedSpread: model.modelSpread,
    confidenceScore: model.confidence,
    fairOddsHome: winProbToML(model.homeWinProb),
    fairOddsAway: winProbToML(model.awayWinProb),
    edgeHome: model.edgeHome,
    edgeAway: model.edgeAway,
    modelVsVegasSpread: model.spreadDisc,
    modelVsVegasTotal:  model.totalDisc,
    projectedHomeScore: model.homeFinal,
    projectedAwayScore: model.awayFinal,
    supportingFactors: model.factors,
    riskFactors: [],
    reasoning: model.reasoning,
    createdAt: new Date().toISOString(),
  };

  // Prepend injury factors if meaningful
  if (homeInjury?.pointsLost >= 4) {
    prediction.supportingFactors.unshift({
      label: `⚠ ${homeAbbr} Injuries`,
      impact: homeInjury.pointsLost>=8?'high':'medium',
      direction: 'negative',
      value: `−${homeInjury.pointsLost.toFixed(0)} PPG impact`,
      description: homeInjury.description,
    });
  }
  if (awayInjury?.pointsLost >= 4) {
    prediction.supportingFactors.unshift({
      label: `⚠ ${awayAbbr} Injuries`,
      impact: awayInjury.pointsLost>=8?'high':'medium',
      direction: 'negative',
      value: `−${awayInjury.pointsLost.toFixed(0)} PPG impact`,
      description: awayInjury.description,
    });
  }
  prediction.supportingFactors = prediction.supportingFactors.slice(0, 5);

  return { prediction, homeProfile, awayProfile };
}
