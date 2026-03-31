// src/lib/api/nba-model.ts
// Independent NBA prediction model v2.2
// Uses: team efficiency (off/def rtg), pace, recent form (L10),
//       home/away splits, rest days, injury adjustments, schedule data
// Edge = model win prob minus Vegas implied win prob

import type { TeamInjuryImpact } from './injuries';

export interface TeamProfile {
  id: string;
  name: string;
  abbreviation: string;
  record: string;
  wins: number;
  losses: number;
  winPct: number;
  avgPts: number;
  fgPct: number;
  threePct: number;
  ftPct: number;
  avgAst: number;
  avgTov: number;
  avgReb: number;
  avgBlk: number;
  avgStl: number;
  offEfficiency: number;
  defEfficiency: number;
  netEfficiency: number;
  pace: number;
  last10Wins: number;
  homeWins: number;
  homeLosses: number;
  awayWins: number;
  awayLosses: number;
  lastGameDate: string;  // for rest day calculation
}

const ESPN_TEAM_STATS = (id: string) =>
  `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/${id}/statistics`;
const ESPN_TEAM_SCHEDULE = (id: string) =>
  `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/${id}/schedule?seasontype=2&limit=20`;

const ESPN_IDS: Record<string,string> = {
  ATL:'1',BOS:'2',BKN:'17',CHA:'30',CHI:'4',CLE:'5',DAL:'6',DEN:'7',
  DET:'8',GSW:'9',HOU:'10',IND:'11',LAC:'12',LAL:'13',MEM:'29',MIA:'14',
  MIL:'15',MIN:'16',NOP:'3',NYK:'18',OKC:'25',ORL:'19',PHI:'20',PHX:'21',
  POR:'22',SAC:'23',SAS:'24',TOR:'28',UTA:'26',WAS:'27',
  // alternate abbreviations ESPN uses in scoreboard
  NY:'18',GS:'9',SA:'24',NO:'3',
};

const LEAGUE_AVG_PTS = 115.2;

let profileCache: Record<string, {p: TeamProfile; ts: number}> = {};
const CACHE_TTL = 2 * 60 * 60 * 1000;

async function fetchTeamProfile(abbr: string): Promise<TeamProfile | null> {
  const cached = profileCache[abbr];
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.p;

  const teamId = ESPN_IDS[abbr];
  if (!teamId) { console.warn(`[Model] No ESPN ID for "${abbr}"`); return null; }

  try {
    const [statsRes, schedRes] = await Promise.all([
      fetch(ESPN_TEAM_STATS(teamId), { next: { revalidate: 7200 } }),
      fetch(ESPN_TEAM_SCHEDULE(teamId), { next: { revalidate: 7200 } }),
    ]);
    if (!statsRes.ok) throw new Error(`Stats HTTP ${statsRes.status}`);

    const statsData = await statsRes.json();
    const cats: any[] = statsData.results?.stats?.categories ?? [];

    const getStat = (cat: string, stat: string): number => {
      const c = cats.find((x:any) => x.name === cat);
      const s = c?.stats?.find((x:any) => x.name === stat);
      return parseFloat(s?.displayValue ?? '0') || 0;
    };

    const avgPts   = getStat('offensive','avgPoints');
    const fgPct    = getStat('offensive','fieldGoalPct');
    const threePct = getStat('offensive','threePointFieldGoalPct') || getStat('offensive','threePointPct');
    const ftPct    = getStat('offensive','freeThrowPct');
    const avgAst   = getStat('offensive','avgAssists');
    const avgTov   = getStat('offensive','avgTurnovers');
    const avgReb   = getStat('general','avgRebounds');
    const avgBlk   = getStat('defensive','avgBlocks');
    const avgStl   = getStat('defensive','avgSteals');
    const fga      = getStat('offensive','avgFieldGoalsAttempted');
    const fta      = getStat('offensive','avgFreeThrowsAttempted');

    // Pace = possessions per game proxy (Dean Oliver formula)
    // Possessions ≈ FGA - OReb + TO + 0.44*FTA
    const pace = fga + avgTov + (fta * 0.44);

    // Off efficiency = points per 100 possessions
    const offEff = pace > 0 ? (avgPts / pace) * 100 : avgPts;

    let wins=0, losses=0, record='0-0';
    let last10Wins=0, homeWins=0, homeLosses=0, awayWins=0, awayLosses=0;
    let lastGameDate = '';

    if (schedRes.ok) {
      const schedData = await schedRes.json();
      // Record from team data
      const teamData = schedData.team;
      const recItems = teamData?.record?.items ?? [];
      const overall = recItems.find((r:any) => r.type==='total');
      if (overall?.summary) {
        record = overall.summary;
        [wins, losses] = record.split('-').map(Number);
      }

      const events: any[] = schedData.events ?? [];
      const completed = events.filter((e:any) =>
        e.competitions?.[0]?.status?.type?.completed
      );

      // Last game date for rest calculation
      if (completed.length > 0) {
        lastGameDate = completed[completed.length-1]?.date ?? '';
      }

      completed.forEach((e:any, i:number) => {
        const comp = e.competitions[0];
        const home = comp.competitors.find((c:any) => c.homeAway==='home');
        const away = comp.competitors.find((c:any) => c.homeAway==='away');
        const isHome = home?.team?.abbreviation === abbr ||
                       ESPN_IDS[abbr] === home?.team?.id;
        const ourTeam = isHome ? home : away;
        const won = ourTeam?.winner === true;
        if (isHome) { won ? homeWins++ : homeLosses++; }
        else        { won ? awayWins++ : awayLosses++; }
        if (i >= completed.length - 10 && won) last10Wins++;
      });
    }

    const totalGames = wins + losses || 74;
    const winPct = wins / totalGames;

    // Defensive efficiency: use steal/block rate as defensive quality proxy
    // Better defensive teams allow fewer points — baseline from win%
    const defQuality = (winPct - 0.5) * 12 + (avgStl * 0.5) + (avgBlk * 0.35);
    const defEff = Math.max(100, Math.min(125, LEAGUE_AVG_PTS - defQuality));

    const profile: TeamProfile = {
      id: teamId, name: abbr, abbreviation: abbr, record,
      wins, losses, winPct,
      avgPts, fgPct, threePct, ftPct, avgAst, avgTov, avgReb, avgBlk, avgStl,
      offEfficiency: offEff,
      defEfficiency: defEff,
      netEfficiency: offEff - defEff,
      pace, last10Wins, homeWins, homeLosses, awayWins, awayLosses, lastGameDate,
    };

    console.log(`[Model] ${abbr}: ${record} | OFF:${offEff.toFixed(1)} DEF:${defEff.toFixed(1)} NET:${(offEff-defEff).toFixed(1)} PACE:${pace.toFixed(1)} L10:${last10Wins}-${10-last10Wins}`);
    profileCache[abbr] = { p: profile, ts: Date.now() };
    return profile;
  } catch (e) {
    console.error(`[Model] Failed ${abbr}:`, e);
    return null;
  }
}

function calcRestDays(lastGameDate: string): number {
  if (!lastGameDate) return 2;
  const last = new Date(lastGameDate).getTime();
  const now = Date.now();
  return Math.floor((now - last) / (1000 * 60 * 60 * 24));
}

function restAdjustment(restDays: number): number {
  if (restDays === 0) return -3.5;  // back-to-back — well documented ~3.5pt penalty
  if (restDays === 1) return -1.0;
  if (restDays >= 4) return +1.0;   // well-rested bonus
  return 0;
}

function computePrediction(
  home: TeamProfile,
  away: TeamProfile,
  vegasHomeML?: number,
  vegasAwayML?: number,
  vegasSpread?: number,
  vegasTotal?: number,
) {
  // ── Project scores ────────────────────────────────────────────────────────
  // Home team: our offense vs their defense
  // Adjustment = (our off / league avg) * (league avg / their def)
  const homeOffMult = home.offEfficiency / LEAGUE_AVG_PTS;
  const awayDefMult = LEAGUE_AVG_PTS / away.defEfficiency;  // >1 = weak defense
  const homeRawPts  = home.avgPts * homeOffMult * awayDefMult;

  const awayOffMult = away.offEfficiency / LEAGUE_AVG_PTS;
  const homeDefMult = LEAGUE_AVG_PTS / home.defEfficiency;
  const awayRawPts  = away.avgPts * awayOffMult * homeDefMult;

  // ── Adjustment factors ────────────────────────────────────────────────────
  const HOME_COURT    = 3.2;   // NBA home court = proven ~3 pts
  const homeFormAdj   = (home.last10Wins - 5) * 0.5;   // L10 above .500 = +0.5/win
  const awayFormAdj   = (away.last10Wins - 5) * 0.5;
  const homeShootAdj  = (home.fgPct - 46.5) * 0.25;    // per % above league avg
  const awayShootAdj  = (away.fgPct - 46.5) * 0.25;
  const home3pAdj     = (home.threePct - 36.0) * 0.15;
  const away3pAdj     = (away.threePct - 36.0) * 0.15;
  const homeTovAdj    = (13.5 - home.avgTov) * 0.7;    // each fewer TO = +0.7 pts
  const awayTovAdj    = (13.5 - away.avgTov) * 0.7;

  // Rest day adjustment
  const homeRestDays  = calcRestDays(home.lastGameDate);
  const awayRestDays  = calcRestDays(away.lastGameDate);
  const homeRestAdj   = restAdjustment(homeRestDays);
  const awayRestAdj   = restAdjustment(awayRestDays);

  // Home/away split adjustment (how much better/worse they perform specifically at home/away)
  const homeAtHomeGP  = (home.homeWins + home.homeLosses) || 1;
  const awayOnRoadGP  = (away.awayWins + away.awayLosses) || 1;
  const homeAtHomePct = home.homeWins / homeAtHomeGP;
  const awayOnRoadPct = away.awayWins / awayOnRoadGP;
  const homeSplitAdj  = (homeAtHomePct - home.winPct) * 6;
  const awaySplitAdj  = (awayOnRoadPct - away.winPct) * 6;

  // Final scores
  const homeFinal = homeRawPts + HOME_COURT + homeFormAdj + homeShootAdj + home3pAdj + homeTovAdj + homeRestAdj + homeSplitAdj;
  const awayFinal = awayRawPts + awayFormAdj + awayShootAdj + away3pAdj + awayTovAdj + awayRestAdj + awaySplitAdj;

  // ── Win probability ────────────────────────────────────────────────────────
  const scoreDiff = homeFinal - awayFinal;
  const STDDEV = 12.0;   // NBA game-to-game std dev ~12 pts
  const z = scoreDiff / STDDEV;
  const homeWinProb = Math.max(0.05, Math.min(0.95, 1 / (1 + Math.exp(-1.65 * z))));
  const awayWinProb = 1 - homeWinProb;
  const modelSpread  = -scoreDiff;  // negative = home favored
  const modelTotal   = homeFinal + awayFinal;

  // ── Edge vs Vegas ─────────────────────────────────────────────────────────
  let vegasHomeProb: number | undefined;
  let vegasAwayProb: number | undefined;
  let edgeHome = 0, edgeAway = 0;

  if (vegasHomeML && vegasAwayML) {
    const rH = vegasHomeML < 0 ? Math.abs(vegasHomeML)/(Math.abs(vegasHomeML)+100) : 100/(vegasHomeML+100);
    const rA = vegasAwayML < 0 ? Math.abs(vegasAwayML)/(Math.abs(vegasAwayML)+100) : 100/(vegasAwayML+100);
    const vig = rH + rA;
    vegasHomeProb = rH / vig;
    vegasAwayProb = rA / vig;
    edgeHome = Number(((homeWinProb - vegasHomeProb) * 100).toFixed(1));
    edgeAway = Number(((awayWinProb - vegasAwayProb) * 100).toFixed(1));
  }

  const spreadDisc = vegasSpread !== undefined ? Number((modelSpread - vegasSpread).toFixed(1)) : null;
  const totalDisc  = vegasTotal  !== undefined ? Number((modelTotal  - vegasTotal ).toFixed(1)) : null;

  // ── Confidence ────────────────────────────────────────────────────────────
  const netGap    = Math.abs(home.netEfficiency - away.netEfficiency);
  const formGap   = Math.abs(home.last10Wins - away.last10Wins);
  const restBonus = Math.abs(homeRestDays - awayRestDays) >= 2 ? 3 : 0;
  const confidence = Math.min(90, Math.max(48,
    50 + netGap * 1.8 + formGap * 1.5 + Math.abs(scoreDiff) * 0.6 + restBonus
  ));

  // ── Key factors ───────────────────────────────────────────────────────────
  const factors: any[] = [];
  const homeFav = homeWinProb > 0.5;
  const favTeam = homeFav ? home : away;
  const dogTeam = homeFav ? away : home;

  // Net efficiency
  if (netGap > 2) {
    factors.push({
      label: `${favTeam.name} Efficiency Edge`,
      impact: netGap > 8 ? 'high' : netGap > 4 ? 'medium' : 'low',
      direction: 'positive',
      value: `NET: ${favTeam.netEfficiency > 0?'+':''}${favTeam.netEfficiency.toFixed(1)} vs ${dogTeam.netEfficiency > 0?'+':''}${dogTeam.netEfficiency.toFixed(1)}`,
      description: `${favTeam.name} outperforms ${dogTeam.name} by ${netGap.toFixed(1)} points per 100 possessions in net efficiency this season.`,
    });
  }

  // Recent form
  if (formGap >= 2) {
    const betterForm = home.last10Wins > away.last10Wins ? home : away;
    const worseForm  = betterForm === home ? away : home;
    factors.push({
      label: `${betterForm.name} Recent Form`,
      impact: formGap >= 5 ? 'high' : formGap >= 3 ? 'medium' : 'low',
      direction: (betterForm === home) === homeFav ? 'positive' : 'negative',
      value: `L10: ${betterForm.last10Wins}-${10-betterForm.last10Wins} vs ${worseForm.last10Wins}-${10-worseForm.last10Wins}`,
      description: `${betterForm.name} is ${betterForm.last10Wins}-${10-betterForm.last10Wins} their last 10 games. ${worseForm.name} is ${worseForm.last10Wins}-${10-worseForm.last10Wins}.`,
    });
  }

  // Rest day factor
  if (Math.abs(homeRestDays - awayRestDays) >= 2) {
    const moreRested = homeRestDays > awayRestDays ? home : away;
    const lessRested = moreRested === home ? away : home;
    const lessRestDays = moreRested === home ? awayRestDays : homeRestDays;
    factors.push({
      label: `Rest Advantage — ${moreRested.name}`,
      impact: 'medium',
      direction: (moreRested === home) === homeFav ? 'positive' : 'negative',
      value: lessRestDays === 0 ? `${lessRested.name} on back-to-back` : `${moreRested.name} has ${Math.abs(homeRestDays-awayRestDays)} more rest days`,
      description: lessRestDays === 0
        ? `${lessRested.name} is playing the 2nd night of a back-to-back — historically worth -3.5 pts.`
        : `${moreRested.name} has had ${homeRestDays>awayRestDays?homeRestDays:awayRestDays} rest days vs ${lessRested.name}'s ${lessRestDays}.`,
    });
  }

  // Shooting
  const fgGap = Math.abs(home.fgPct - away.fgPct);
  if (fgGap > 2) {
    const betterShoot = home.fgPct > away.fgPct ? home : away;
    factors.push({
      label: `${betterShoot.name} Shooting Efficiency`,
      impact: fgGap > 4 ? 'medium' : 'low',
      direction: (betterShoot === home) === homeFav ? 'positive' : 'negative',
      value: `${betterShoot.fgPct.toFixed(1)}% FG vs ${(betterShoot===home?away:home).fgPct.toFixed(1)}%`,
      description: `${betterShoot.name} shoots ${betterShoot.fgPct.toFixed(1)}% from the field — ${fgGap.toFixed(1)}% better than their opponent this season.`,
    });
  }

  // Home/away splits
  factors.push({
    label: 'Home/Away Splits',
    impact: 'low',
    direction: homeAtHomePct > 0.5 ? 'positive' : 'negative',
    value: `${home.name} ${home.homeWins}-${home.homeLosses} home | ${away.name} ${away.awayWins}-${away.awayLosses} road`,
    description: `${home.name} home record: ${home.homeWins}-${home.homeLosses} (${Math.round(homeAtHomePct*100)}%). ${away.name} road record: ${away.awayWins}-${away.awayLosses} (${Math.round(awayOnRoadPct*100)}%).`,
  });

  // Model vs Vegas discrepancy — the actual edge signal
  if (spreadDisc !== null && Math.abs(spreadDisc) >= 2.5) {
    const valueSide = spreadDisc < 0 ? home.name : away.name;
    factors.push({
      label: `Model Disagrees with Vegas (${Math.abs(spreadDisc).toFixed(1)} pts)`,
      impact: Math.abs(spreadDisc) > 5 ? 'high' : 'medium',
      direction: 'positive',
      value: `Model: ${modelSpread.toFixed(1)} | Vegas: ${vegasSpread?.toFixed(1)}`,
      description: `Model projects a ${Math.abs(spreadDisc).toFixed(1)}-point gap vs the posted line, favoring ${valueSide}. This is a potential betting edge.`,
    });
  }

  const reasoning = [
    `Model projects ${home.name} ${homeFinal.toFixed(1)} — ${away.name} ${awayFinal.toFixed(1)}.`,
    `Win probability: ${home.name} ${Math.round(homeWinProb*100)}% / ${away.name} ${Math.round(awayWinProb*100)}%.`,
    `Model spread: ${home.name} ${modelSpread>0?'+':''}${modelSpread.toFixed(1)} | Model total: ${modelTotal.toFixed(1)}.`,
    vegasSpread !== undefined
      ? `Vegas: ${home.name} ${vegasSpread>0?'+':''}${vegasSpread} — model ${Math.abs(spreadDisc??0)<1.5?'agrees':'DISAGREES by '+Math.abs(spreadDisc??0).toFixed(1)+' pts'}.`
      : '',
    `Net efficiency: ${home.name} ${home.netEfficiency>0?'+':''}${home.netEfficiency.toFixed(1)} vs ${away.name} ${away.netEfficiency>0?'+':''}${away.netEfficiency.toFixed(1)}.`,
    `L10: ${home.name} ${home.last10Wins}-${10-home.last10Wins} | ${away.name} ${away.last10Wins}-${10-away.last10Wins}.`,
    homeRestDays === 0 ? `${home.name} on back-to-back.` : awayRestDays === 0 ? `${away.name} on back-to-back.` : '',
  ].filter(Boolean).join(' ');

  return {
    homeWinProb, awayWinProb,
    modelSpread: Number(modelSpread.toFixed(1)),
    modelTotal:  Number(modelTotal.toFixed(1)),
    vegasHomeProb, vegasAwayProb,
    edgeHome, edgeAway,
    confidence: Math.round(confidence),
    factors: factors.slice(0, 5),
    reasoning,
    spreadDisc, totalDisc,
  };
}

function winProbToML(p: number): number {
  return p >= 0.5 ? -Math.round((p/(1-p))*100) : Math.round(((1-p)/p)*100);
}

export async function buildNBAPrediction(
  homeAbbr: string,
  awayAbbr: string,
  vegasHomeML?: number,
  vegasAwayML?: number,
  vegasSpread?: number,
  vegasTotal?: number,
  homeInjury?: TeamInjuryImpact,
  awayInjury?: TeamInjuryImpact,
): Promise<{ prediction: any; homeProfile: TeamProfile | null; awayProfile: TeamProfile | null }> {

  const [homeProfile, awayProfile] = await Promise.all([
    fetchTeamProfile(homeAbbr),
    fetchTeamProfile(awayAbbr),
  ]);

  // Fallback if profile fetch fails
  if (!homeProfile || !awayProfile) {
    let hp = 0.5, ap = 0.5;
    if (vegasHomeML && vegasAwayML) {
      const rH = vegasHomeML<0 ? Math.abs(vegasHomeML)/(Math.abs(vegasHomeML)+100) : 100/(vegasHomeML+100);
      const rA = vegasAwayML<0 ? Math.abs(vegasAwayML)/(Math.abs(vegasAwayML)+100) : 100/(vegasAwayML+100);
      const vig = rH+rA; hp=rH/vig; ap=rA/vig;
    }
    return { homeProfile, awayProfile, prediction: {
      id:'pred-nba-fallback', modelVersion:'v2.2',
      predictedWinner: hp>0.5 ? homeAbbr.toLowerCase() : awayAbbr.toLowerCase(),
      winProbHome:hp, winProbAway:ap,
      projectedTotal: vegasTotal??224, projectedSpread: vegasSpread??0,
      confidenceScore:50, fairOddsHome:winProbToML(hp), fairOddsAway:winProbToML(ap),
      edgeHome:0, edgeAway:0, modelVsVegasSpread:null, modelVsVegasTotal:null,
      supportingFactors:[], riskFactors:[],
      reasoning:'Team profile unavailable — using Vegas lines as reference.',
      createdAt: new Date().toISOString(),
    }};
  }

  // Apply injury deductions before computing
  if (homeInjury && homeInjury.pointsLost > 0) {
    homeProfile.avgPts       = Math.max(90, homeProfile.avgPts - homeInjury.pointsLost);
    homeProfile.offEfficiency = Math.max(88, homeProfile.offEfficiency - homeInjury.pointsLost * 0.85);
    homeProfile.netEfficiency = homeProfile.offEfficiency - homeProfile.defEfficiency;
    console.log(`[Model] ${homeAbbr} -${homeInjury.pointsLost.toFixed(1)}pts: ${homeInjury.description}`);
  }
  if (awayInjury && awayInjury.pointsLost > 0) {
    awayProfile.avgPts       = Math.max(90, awayProfile.avgPts - awayInjury.pointsLost);
    awayProfile.offEfficiency = Math.max(88, awayProfile.offEfficiency - awayInjury.pointsLost * 0.85);
    awayProfile.netEfficiency = awayProfile.offEfficiency - awayProfile.defEfficiency;
    console.log(`[Model] ${awayAbbr} -${awayInjury.pointsLost.toFixed(1)}pts: ${awayInjury.description}`);
  }

  const model = computePrediction(homeProfile, awayProfile, vegasHomeML, vegasAwayML, vegasSpread, vegasTotal);

  const prediction: any = {
    id: `pred-nba-model`,
    modelVersion: 'v2.2',
    predictedWinner: model.homeWinProb>0.5 ? homeAbbr.toLowerCase() : awayAbbr.toLowerCase(),
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
    supportingFactors: model.factors,
    riskFactors: [],
    reasoning: model.reasoning,
    createdAt: new Date().toISOString(),
  };

  // Prepend injury factors if significant
  if (homeInjury && homeInjury.pointsLost >= 4) {
    prediction.supportingFactors.unshift({
      label: `⚠ ${homeAbbr} Injury Report`,
      impact: homeInjury.pointsLost >= 8 ? 'high' : 'medium',
      direction: 'negative',
      value: `−${homeInjury.pointsLost.toFixed(0)} PPG`,
      description: homeInjury.description,
    });
  }
  if (awayInjury && awayInjury.pointsLost >= 4) {
    prediction.supportingFactors.unshift({
      label: `⚠ ${awayAbbr} Injury Report`,
      impact: awayInjury.pointsLost >= 8 ? 'high' : 'medium',
      direction: 'negative',
      value: `−${awayInjury.pointsLost.toFixed(0)} PPG`,
      description: awayInjury.description,
    });
  }
  prediction.supportingFactors = prediction.supportingFactors.slice(0, 5);

  return { prediction, homeProfile, awayProfile };
}
