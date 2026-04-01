// src/lib/api/nba-model.ts -- Model v4.1
// Uses stats.nba.com for real opponent-adjusted ORTG/DRTG/NetRtg/Pace
// ESPN for schedule, splits, rest days
// Monte Carlo simulation for spread/total distribution
// This is how real sports analytics models work.

import type { TeamInjuryImpact } from './injuries';

export interface TeamProfile {
  id: string;
  abbreviation: string;
  record: string;
  wins: number;
  losses: number;
  winPct: number;
  offRtg: number;
  defRtg: number;
  netRtg: number;
  pace: number;
  avgPts: number;
  fgPct: number;
  threePct: number;
  threeRate: number;
  ftPct: number;
  avgAst: number;
  avgTov: number;
  avgBlk: number;
  avgStl: number;
  pythWinPct: number;
  last10Wins: number;
  homeWins: number;
  homeLosses: number;
  awayWins: number;
  awayLosses: number;
  lastGameDate: string;
}

const NBA_STATS_URL = 'https://stats.nba.com/stats/leaguedashteamstats'
  + '?MeasureType=Advanced&PerMode=PerGame&Season=2024-25'
  + '&SeasonType=Regular+Season&LeagueID=00&LastNGames=0'
  + '&Month=0&OpponentTeamID=0&PaceAdjust=N&Period=0&PORound=0&TeamID=0';

const NBA_STATS_HEADERS = {
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Origin': 'https://www.nba.com',
  'Referer': 'https://www.nba.com/',
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  'x-nba-stats-origin': 'stats',
  'x-nba-stats-token': 'true',
};

const ESPN_STATS    = (id: string) => `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/${id}/statistics`;
const ESPN_SCHEDULE = (id: string) => `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/${id}/schedule?seasontype=2&limit=30`;

const ESPN_IDS: Record<string, string> = {
  ATL:'1',BOS:'2',BKN:'17',CHA:'30',CHI:'4',CLE:'5',DAL:'6',DEN:'7',
  DET:'8',GSW:'9',HOU:'10',IND:'11',LAC:'12',LAL:'13',MEM:'29',MIA:'14',
  MIL:'15',MIN:'16',NOP:'3',NYK:'18',OKC:'25',ORL:'19',PHI:'20',PHX:'21',
  POR:'22',SAC:'23',SAS:'24',TOR:'28',UTA:'26',WAS:'27',
  NY:'18',GS:'9',SA:'24',NO:'3',UTAH:'26',
};

const NBA_NAME_TO_ABBR: Record<string, string> = {
  'Atlanta Hawks':'ATL','Boston Celtics':'BOS','Brooklyn Nets':'BKN',
  'Charlotte Hornets':'CHA','Chicago Bulls':'CHI','Cleveland Cavaliers':'CLE',
  'Dallas Mavericks':'DAL','Denver Nuggets':'DEN','Detroit Pistons':'DET',
  'Golden State Warriors':'GSW','Houston Rockets':'HOU','Indiana Pacers':'IND',
  'LA Clippers':'LAC','Los Angeles Lakers':'LAL','Memphis Grizzlies':'MEM',
  'Miami Heat':'MIA','Milwaukee Bucks':'MIL','Minnesota Timberwolves':'MIN',
  'New Orleans Pelicans':'NOP','New York Knicks':'NYK','Oklahoma City Thunder':'OKC',
  'Orlando Magic':'ORL','Philadelphia 76ers':'PHI','Phoenix Suns':'PHX',
  'Portland Trail Blazers':'POR','Sacramento Kings':'SAC','San Antonio Spurs':'SAS',
  'Toronto Raptors':'TOR','Utah Jazz':'UTA','Washington Wizards':'WAS',
};

let nbaStatsCache: Record<string, { offRtg: number; defRtg: number; netRtg: number; pace: number }> | null = null;
let nbaStatsCacheTime = 0;
const NBA_STATS_TTL = 6 * 60 * 60 * 1000;

async function fetchAllNBAStats(): Promise<typeof nbaStatsCache> {
  if (nbaStatsCache && Date.now() - nbaStatsCacheTime < NBA_STATS_TTL) return nbaStatsCache;
  try {
    const res = await fetch(NBA_STATS_URL, { headers: NBA_STATS_HEADERS as any, next: { revalidate: 21600 } });
    if (!res.ok) throw new Error(`NBA stats ${res.status}`);
    const data = await res.json();
    const { headers, rowSet } = data.resultSets[0];
    const idx = (h: string) => headers.indexOf(h);
    const result: Record<string, { offRtg: number; defRtg: number; netRtg: number; pace: number }> = {};
    for (const row of rowSet) {
      const name = String(row[idx('TEAM_NAME')]);
      const abbr = NBA_NAME_TO_ABBR[name];
      if (!abbr) continue;
      result[abbr] = {
        offRtg: Number(row[idx('OFF_RATING')]),
        defRtg: Number(row[idx('DEF_RATING')]),
        netRtg: Number(row[idx('NET_RATING')]),
        pace:   Number(row[idx('PACE')]),
      };
    }
    console.log(`[Model v4.1] Loaded ${Object.keys(result).length} teams from stats.nba.com`);
    nbaStatsCache = result;
    nbaStatsCacheTime = Date.now();
    return result;
  } catch (e) {
    console.error('[Model v4.1] stats.nba.com failed:', e);
    return nbaStatsCache;
  }
}

let profileCache: Record<string, { p: TeamProfile; ts: number }> = {};
const PROFILE_TTL = 3 * 60 * 60 * 1000;

async function fetchProfile(abbr: string): Promise<TeamProfile | null> {
  const hit = profileCache[abbr];
  if (hit && Date.now() - hit.ts < PROFILE_TTL) return hit.p;
  const id = ESPN_IDS[abbr];
  if (!id) { console.warn(`[Model v4.1] No ESPN ID for "${abbr}"`); return null; }
  try {
    const [nbaStats, sr, schr] = await Promise.all([
      fetchAllNBAStats(),
      fetch(ESPN_STATS(id),    { next: { revalidate: 10800 } }),
      fetch(ESPN_SCHEDULE(id), { next: { revalidate: 10800 } }),
    ]);
    if (!sr.ok) throw new Error(`ESPN stats ${sr.status}`);
    const sd = await sr.json();
    const cats: any[] = sd.results?.stats?.categories ?? [];
    const g = (cat: string, stat: string): number => {
      const c = cats.find((x: any) => x.name === cat);
      const s = c?.stats?.find((x: any) => x.name === stat);
      return parseFloat(s?.displayValue ?? '0') || 0;
    };
    const avgPts   = g('offensive', 'avgPoints');
    const fgPct    = g('offensive', 'fieldGoalPct');
    const threePct = g('offensive', 'threePointFieldGoalPct') || g('offensive', 'threePointPct');
    const ftPct    = g('offensive', 'freeThrowPct');
    const avgAst   = g('offensive', 'avgAssists');
    const avgTov   = g('offensive', 'avgTurnovers');
    const avgFGA   = g('offensive', 'avgFieldGoalsAttempted');
    const avg3PA   = g('offensive', 'avgThreePointFieldGoalsAttempted');
    const avgFTA   = g('offensive', 'avgFreeThrowsAttempted');
    const avgBlk   = g('defensive', 'avgBlocks');
    const avgStl   = g('defensive', 'avgSteals');
    const threeRate = avgFGA > 0 ? avg3PA / avgFGA : 0.38;
    const nba    = nbaStats?.[abbr];
    const offRtg = nba?.offRtg ?? 115.8;
    const defRtg = nba?.defRtg ?? 115.8;
    const netRtg = nba?.netRtg ?? 0;
    const pace   = nba?.pace   ?? 98.5;
    let wins = 0, losses = 0, record = '0-0';
    let last10Wins = 0, homeWins = 0, homeLosses = 0, awayWins = 0, awayLosses = 0;
    let lastGameDate = '';
    if (schr.ok) {
      const schd = await schr.json();
      const recItems = schd.team?.record?.items ?? [];
      const overall = recItems.find((r: any) => r.type === 'total') ?? recItems[0];
      if (overall?.summary) {
        record = overall.summary;
        const parts = record.split('-');
        wins = parseInt(parts[0]) || 0;
        losses = parseInt(parts[1]) || 0;
      }
      const events: any[] = schd.events ?? [];
      const done = events.filter((e: any) => e.competitions?.[0]?.status?.type?.completed);
      if (done.length) lastGameDate = done[done.length - 1]?.date ?? '';
      done.forEach((e: any, i: number) => {
        const comp = e.competitions[0];
        const homeC = comp.competitors.find((c: any) => c.homeAway === 'home');
        const awayC = comp.competitors.find((c: any) => c.homeAway === 'away');
        const isHome = homeC?.team?.id === id || homeC?.team?.abbreviation === abbr;
        const us  = isHome ? homeC : awayC;
        const won = us?.winner === true;
        if (isHome) { won ? homeWins++ : homeLosses++; } else { won ? awayWins++ : awayLosses++; }
        if (i >= done.length - 10 && won) last10Wins++;
      });
    }
    const gp = wins + losses || 74;
    const winPct = wins / gp;
    const estPts        = offRtg * pace / 100;
    const estPtsAllowed = defRtg * pace / 100;
    const exp = 13.91;
    const pythWinPct = estPts > 0 && estPtsAllowed > 0
      ? Math.pow(estPts, exp) / (Math.pow(estPts, exp) + Math.pow(estPtsAllowed, exp))
      : winPct;
    const profile: TeamProfile = {
      id, abbreviation: abbr, record, wins, losses, winPct,
      offRtg, defRtg, netRtg, pace,
      avgPts, fgPct, threePct, threeRate, ftPct, avgAst, avgTov, avgBlk, avgStl,
      pythWinPct, last10Wins, homeWins, homeLosses, awayWins, awayLosses, lastGameDate,
    };
    console.log(`[Model v4.1] ${abbr}: ${record} | ORTG:${offRtg.toFixed(1)} DRTG:${defRtg.toFixed(1)} NET:${netRtg.toFixed(1)} PACE:${pace.toFixed(1)} pts:${avgPts.toFixed(1)} L10:${last10Wins}-${10 - last10Wins}`);
    profileCache[abbr] = { p: profile, ts: Date.now() };
    return profile;
  } catch (e) {
    console.error(`[Model v4.1] Failed ${abbr}:`, e);
    return null;
  }
}

function restDays(d: string): number {
  if (!d) return 2;
  return Math.max(0, Math.floor((Date.now() - new Date(d).getTime()) / 86400000));
}

function restAdj(days: number): number {
  if (days === 0) return -3.5;
  if (days === 1) return -0.8;
  if (days >= 4)  return +1.2;
  return 0;
}

function normalRandom(mean: number, sd: number): number {
  const u1 = Math.random(), u2 = Math.random();
  return mean + Math.sqrt(-2 * Math.log(Math.max(u1, 1e-10))) * Math.cos(2 * Math.PI * u2) * sd;
}

function monteCarlo(homeExp: number, awayExp: number, vegasSpread?: number, vegasTotal?: number, n = 10000) {
  let hw = 0;
  const tots: number[] = [], hs: number[] = [], as_: number[] = [];
  // SD of 10.0 matches real NBA game-to-game score variance
  const SD = 10.0;
  for (let i = 0; i < n; i++) {
    const h = Math.round(normalRandom(homeExp, SD));
    const a = Math.round(normalRandom(awayExp, SD));
    hs.push(h); as_.push(a); tots.push(h + a);
    if (h > a) hw++;
  }
  const avg = (arr: number[]) => arr.reduce((s, x) => s + x, 0) / arr.length;
  const covers = vegasSpread !== undefined ? hs.filter((_, i) => (hs[i] - as_[i]) > -vegasSpread).length : hw;
  const overs  = vegasTotal  !== undefined ? tots.filter(t => t > vegasTotal).length : tots.filter(t => t > avg(tots)).length;
  const buckets: Record<number, number> = {};
  tots.forEach(t => { const b = Math.floor(t / 8) * 8; buckets[b] = (buckets[b] || 0) + 1; });
  return {
    homeWinPct:     Number(((hw / n) * 100).toFixed(1)),
    avgHome:        Number(avg(hs).toFixed(1)),
    avgAway:        Number(avg(as_).toFixed(1)),
    avgTotal:       Number(avg(tots).toFixed(1)),
    spreadCoverPct: Number(((covers / n) * 100).toFixed(1)),
    overPct:        Number(((overs / n) * 100).toFixed(1)),
    distribution:   Object.entries(buckets)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([b, c]) => ({ range: `${b}-${Number(b) + 7}`, pct: Number(((c / n) * 100).toFixed(1)) }))
      .slice(0, 14),
  };
}

function winProbToML(p: number): number {
  return p >= 0.5 ? -Math.round((p / (1 - p)) * 100) : Math.round(((1 - p) / p) * 100);
}

function compute(
  home: TeamProfile,
  away: TeamProfile,
  vegasHomeML?: number,
  vegasAwayML?: number,
  vegasSpread?: number,
  vegasTotal?: number,
) {
  //  v4.1 SCORE PROJECTION -- additive opponent-adjusted (industry standard) 
  //
  // Formula: expected_pts = (team_ORTG + opp_DRTG) / 2  x  (avg_pace / 100)
  //
  // This is the FiveThirtyEight / Dunks & Threes standard. It naturally
  // regresses to league average (ORTG  DRTG  115.8) and cannot compound
  // small rating differences into unrealistic spreads like a multiplicative
  // formula does.
  //
  // Example -- ATL (ORTG 115.2, DRTG 118.1) @ ORL (ORTG 112.4, DRTG 111.8):
  //   avgPace  = (100.8 + 96.8) / 2 = 98.8
  //   ORL base = (112.4 + 118.1) / 2 x 0.988 = 113.9 pts
  //   ATL base = (115.2 + 111.8) / 2 x 0.988 = 112.1 pts
  //   spread   = ORL -1.8  |  total = ~226   <- realistic

  const avgPace   = (home.pace + away.pace) / 2;
  const paceFactor = avgPace / 100;
  const homeBase  = ((home.offRtg + away.defRtg) / 2) * paceFactor;
  const awayBase  = ((away.offRtg + home.defRtg) / 2) * paceFactor;

  //  Situational adjustments -- individually capped to prevent stacking 
  const HOME_COURT = 3.2;
  const homeRestDays_ = restDays(home.lastGameDate);
  const awayRestDays_ = restDays(away.lastGameDate);
  const homeRest = restAdj(homeRestDays_);
  const awayRest = restAdj(awayRestDays_);
  // Recent form: max +/-3 pts
  const homeFormAdj = Math.max(-3, Math.min(3, (home.last10Wins - 5) * 0.5));
  const awayFormAdj = Math.max(-3, Math.min(3, (away.last10Wins - 5) * 0.5));
  // Home/away splits: max +/-2 pts
  const homeAtHomeGP  = (home.homeWins + home.homeLosses) || 1;
  const awayOnRoadGP  = (away.awayWins + away.awayLosses) || 1;
  const homeAtHomePct = home.homeWins / homeAtHomeGP;
  const awayOnRoadPct = away.awayWins / awayOnRoadGP;
  const homeSplit = Math.max(-2, Math.min(2, (homeAtHomePct - home.winPct) * 4));
  const awaySplit = Math.max(-2, Math.min(2, (awayOnRoadPct - away.winPct) * 4));
  // Pythagorean talent signal: max +/-1.5 pts
  const homePyth = Math.max(-1.5, Math.min(1.5, (home.pythWinPct - home.winPct) * 3));
  const awayPyth = Math.max(-1.5, Math.min(1.5, (away.pythWinPct - away.winPct) * 3));

  const homeExp = homeBase + HOME_COURT + homeFormAdj + homeRest + homeSplit + homePyth;
  const awayExp = awayBase              + awayFormAdj  + awayRest + awaySplit + awayPyth;

  const sim = monteCarlo(homeExp, awayExp, vegasSpread, vegasTotal, 10000);

  const homeWinProb = Math.max(0.05, Math.min(0.95, sim.homeWinPct / 100));
  const awayWinProb = 1 - homeWinProb;
  const modelSpread = Number((awayExp - homeExp).toFixed(1));
  const modelTotal  = Number(sim.avgTotal.toFixed(1));

  let edgeHome = 0, edgeAway = 0;
  let vegHP: number | undefined, vegAP: number | undefined;
  if (vegasHomeML && vegasAwayML) {
    const rH = vegasHomeML < 0 ? Math.abs(vegasHomeML) / (Math.abs(vegasHomeML) + 100) : 100 / (vegasHomeML + 100);
    const rA = vegasAwayML < 0 ? Math.abs(vegasAwayML) / (Math.abs(vegasAwayML) + 100) : 100 / (vegasAwayML + 100);
    const v  = rH + rA;
    vegHP = rH / v; vegAP = rA / v;
    edgeHome = Number(((homeWinProb - vegHP) * 100).toFixed(1));
    edgeAway = Number(((awayWinProb - vegAP) * 100).toFixed(1));
  }

  const spreadDisc = vegasSpread !== undefined ? Number((modelSpread - vegasSpread).toFixed(1)) : null;
  const totalDisc  = vegasTotal  !== undefined ? Number((modelTotal  - vegasTotal ).toFixed(1)) : null;

  const netGap    = Math.abs(home.netRtg - away.netRtg);
  const formGap   = Math.abs(home.last10Wins - away.last10Wins);
  const restBonus = Math.abs(homeRestDays_ - awayRestDays_) >= 2 ? 4 : 0;
  const confidence = Math.min(90, Math.max(48,
    50 + netGap * 1.8 + formGap * 1.2 + Math.abs(homeExp - awayExp) * 0.5 + restBonus
  ));

  const factors: any[] = [];
  const homeFav = homeWinProb > 0.5;
  const favT = homeFav ? home : away;
  const dogT = homeFav ? away : home;

  if (netGap > 1) {
    factors.push({
      label: `Net Rating Edge -- ${favT.abbreviation}`,
      impact: netGap > 8 ? 'high' : netGap > 4 ? 'medium' : 'low',
      direction: 'positive',
      value: `${favT.abbreviation} ${favT.netRtg > 0 ? '+' : ''}${favT.netRtg.toFixed(1)} vs ${dogT.abbreviation} ${dogT.netRtg > 0 ? '+' : ''}${dogT.netRtg.toFixed(1)}`,
      description: `NBA.com net rating: ${favT.abbreviation} ${favT.netRtg > 0 ? '+' : ''}${favT.netRtg.toFixed(1)} pts/100 vs ${dogT.abbreviation} ${dogT.netRtg > 0 ? '+' : ''}${dogT.netRtg.toFixed(1)}. ORTG ${favT.offRtg.toFixed(1)} / DRTG ${favT.defRtg.toFixed(1)}.`,
    });
  }
  const ortgGap = Math.abs(home.offRtg - away.offRtg);
  if (ortgGap > 2) {
    const betterOff = home.offRtg > away.offRtg ? home : away;
    factors.push({
      label: `${betterOff.abbreviation} Offensive Efficiency`,
      impact: ortgGap > 6 ? 'medium' : 'low',
      direction: (betterOff === home) === homeFav ? 'positive' : 'negative',
      value: `${betterOff.offRtg.toFixed(1)} ORTG (${(betterOff === home ? away : home).offRtg.toFixed(1)} opp)`,
      description: `${betterOff.abbreviation} scores ${betterOff.offRtg.toFixed(1)} pts per 100 possessions -- ${ortgGap.toFixed(1)} better than opponent.`,
    });
  }
  const drtgGap = Math.abs(home.defRtg - away.defRtg);
  if (drtgGap > 2) {
    const betterDef = home.defRtg < away.defRtg ? home : away;
    factors.push({
      label: `${betterDef.abbreviation} Defensive Rating`,
      impact: drtgGap > 5 ? 'medium' : 'low',
      direction: (betterDef === home) === homeFav ? 'positive' : 'negative',
      value: `${betterDef.defRtg.toFixed(1)} DRTG (allows ${drtgGap.toFixed(1)} fewer)`,
      description: `${betterDef.abbreviation} allows ${betterDef.defRtg.toFixed(1)} pts/100 -- ${(betterDef === home ? away : home).defRtg.toFixed(1)} for opponent.`,
    });
  }
  if (formGap >= 2) {
    const betF = home.last10Wins > away.last10Wins ? home : away;
    const worF = betF === home ? away : home;
    factors.push({
      label: `${betF.abbreviation} Recent Form`,
      impact: formGap >= 5 ? 'high' : formGap >= 3 ? 'medium' : 'low',
      direction: (betF === home) === homeFav ? 'positive' : 'negative',
      value: `L10: ${betF.last10Wins}-${10 - betF.last10Wins} vs ${worF.last10Wins}-${10 - worF.last10Wins}`,
      description: `${betF.abbreviation} ${betF.last10Wins}-${10 - betF.last10Wins} L10 vs ${worF.abbreviation} ${worF.last10Wins}-${10 - worF.last10Wins}.`,
    });
  }
  if (Math.abs(homeRestDays_ - awayRestDays_) >= 2) {
    const mR = homeRestDays_ > awayRestDays_ ? home : away;
    const lR = mR === home ? away : home;
    const lD = mR === home ? awayRestDays_ : homeRestDays_;
    factors.push({
      label: lD === 0 ? `${lR.abbreviation} Back-to-Back` : `Rest Edge -- ${mR.abbreviation}`,
      impact: 'medium',
      direction: (mR === home) === homeFav ? 'positive' : 'negative',
      value: lD === 0 ? 'B2B -3.5pts' : `+${Math.abs(homeRestDays_ - awayRestDays_)}d rest`,
      description: lD === 0
        ? `${lR.abbreviation} on 2nd night of back-to-back (-3.5pt disadvantage).`
        : `${mR.abbreviation} has ${homeRestDays_ > awayRestDays_ ? homeRestDays_ : awayRestDays_}d rest vs ${lR.abbreviation}'s ${lD}d.`,
    });
  }
  factors.push({
    label: 'Home/Away Record Splits',
    impact: 'low',
    direction: homeAtHomePct > 0.5 ? 'positive' : 'negative',
    value: `${home.abbreviation} ${home.homeWins}-${home.homeLosses} home | ${away.abbreviation} ${away.awayWins}-${away.awayLosses} road`,
    description: `${home.abbreviation} home: ${home.homeWins}-${home.homeLosses} (${Math.round(homeAtHomePct * 100)}%). ${away.abbreviation} road: ${away.awayWins}-${away.awayLosses} (${Math.round(awayOnRoadPct * 100)}%).`,
  });
  if (spreadDisc !== null && Math.abs(spreadDisc) >= 2.5) {
    const valSide = spreadDisc < 0 ? home.abbreviation : away.abbreviation;
    factors.push({
      label: `Model Disagrees with Vegas by ${Math.abs(spreadDisc).toFixed(1)} pts`,
      impact: Math.abs(spreadDisc) > 5 ? 'high' : 'medium',
      direction: 'positive',
      value: `Model: ${home.abbreviation} ${modelSpread > 0 ? '+' : ''}${modelSpread} | Vegas: ${vegasSpread}`,
      description: `Model projects a ${Math.abs(spreadDisc).toFixed(1)}-pt gap vs Vegas line -- favoring ${valSide}.`,
    });
  }

  const reasoning = [
    `Model v4.1 (10K Monte Carlo + NBA.com ratings): ${home.abbreviation} ${homeExp.toFixed(1)} -- ${away.abbreviation} ${awayExp.toFixed(1)}.`,
    `Monte Carlo win probability: ${home.abbreviation} ${Math.round(homeWinProb * 100)}% / ${away.abbreviation} ${Math.round(awayWinProb * 100)}% (10,000 iterations).`,
    `Model spread: ${home.abbreviation} ${modelSpread > 0 ? '+' : ''}${modelSpread} | Model total: ${modelTotal}.`,
    vegasSpread !== undefined ? `Vegas: ${home.abbreviation} ${vegasSpread > 0 ? '+' : ''}${vegasSpread} -- model ${Math.abs(spreadDisc ?? 0) < 1.5 ? 'aligned' : 'DISAGREES by ' + Math.abs(spreadDisc ?? 0).toFixed(1) + ' pts'}.` : '',
    `NBA.com net ratings: ${home.abbreviation} ${home.netRtg > 0 ? '+' : ''}${home.netRtg.toFixed(1)} | ${away.abbreviation} ${away.netRtg > 0 ? '+' : ''}${away.netRtg.toFixed(1)}.`,
    `Pythagorean win%: ${home.abbreviation} ${Math.round(home.pythWinPct * 100)}% / ${away.abbreviation} ${Math.round(away.pythWinPct * 100)}%.`,
    `L10: ${home.abbreviation} ${home.last10Wins}-${10 - home.last10Wins} | ${away.abbreviation} ${away.last10Wins}-${10 - away.last10Wins}.`,
    `Monte Carlo: ${sim.overPct}% over ${vegasTotal ?? modelTotal} | ${home.abbreviation} covers ${sim.spreadCoverPct}% of simulations.`,
    homeRestDays_ === 0 ? `${home.abbreviation} on back-to-back.` : awayRestDays_ === 0 ? `${away.abbreviation} on back-to-back.` : '',
  ].filter(Boolean).join(' ');

  return {
    homeWinProb, awayWinProb, modelSpread, modelTotal,
    edgeHome, edgeAway,
    confidence: Math.round(confidence),
    factors: factors.slice(0, 5),
    reasoning, spreadDisc, totalDisc,
    homeFinal: Number(homeExp.toFixed(1)),
    awayFinal: Number(awayExp.toFixed(1)),
    sim,
  };
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

  const [hp, ap] = await Promise.all([fetchProfile(homeAbbr), fetchProfile(awayAbbr)]);

  if (!hp || !ap) {
    let hwp = 0.5, awp = 0.5;
    if (vegasHomeML && vegasAwayML) {
      const rH = vegasHomeML < 0 ? Math.abs(vegasHomeML) / (Math.abs(vegasHomeML) + 100) : 100 / (vegasHomeML + 100);
      const rA = vegasAwayML < 0 ? Math.abs(vegasAwayML) / (Math.abs(vegasAwayML) + 100) : 100 / (vegasAwayML + 100);
      const v = rH + rA; hwp = rH / v; awp = rA / v;
    }
    return {
      homeProfile: hp, awayProfile: ap,
      prediction: {
        id: 'pred-fallback', modelVersion: 'v4.1',
        predictedWinner: hwp > 0.5 ? homeAbbr.toLowerCase() : awayAbbr.toLowerCase(),
        winProbHome: hwp, winProbAway: awp,
        projectedTotal: vegasTotal ?? 224, projectedSpread: vegasSpread ?? 0,
        confidenceScore: 50,
        fairOddsHome: winProbToML(hwp), fairOddsAway: winProbToML(awp),
        edgeHome: 0, edgeAway: 0,
        modelVsVegasSpread: null, modelVsVegasTotal: null,
        supportingFactors: [], riskFactors: [],
        reasoning: `Team stats unavailable -- using Vegas lines. ${!hp ? homeAbbr : ''}${!ap ? ' and ' + awayAbbr : ''} profile missing.`,
        createdAt: new Date().toISOString(),
      },
    };
  }

  if (homeInjury && homeInjury.pointsLost > 0) {
    hp.avgPts = Math.max(90, hp.avgPts - homeInjury.pointsLost);
    hp.offRtg = Math.max(90, hp.offRtg - homeInjury.pointsLost * 0.85);
    hp.netRtg = hp.offRtg - hp.defRtg;
    hp.pythWinPct = Math.pow(hp.avgPts, 13.91) / (Math.pow(hp.avgPts, 13.91) + Math.pow(hp.defRtg * hp.pace / 100, 13.91));
    console.log(`[Model v4.1] ${homeAbbr} inj -${homeInjury.pointsLost?.toFixed(0)}pts: ${homeInjury.description}`);
  }
  if (awayInjury && awayInjury.pointsLost > 0) {
    ap.avgPts = Math.max(90, ap.avgPts - awayInjury.pointsLost);
    ap.offRtg = Math.max(90, ap.offRtg - awayInjury.pointsLost * 0.85);
    ap.netRtg = ap.offRtg - ap.defRtg;
    ap.pythWinPct = Math.pow(ap.avgPts, 13.91) / (Math.pow(ap.avgPts, 13.91) + Math.pow(ap.defRtg * ap.pace / 100, 13.91));
    console.log(`[Model v4.1] ${awayAbbr} inj -${awayInjury.pointsLost?.toFixed(0)}pts: ${awayInjury.description}`);
  }

  const model = compute(hp, ap, vegasHomeML, vegasAwayML, vegasSpread, vegasTotal);

  const prediction: any = {
    id: 'pred-nba-model',
    modelVersion: 'v4.1',
    predictedWinner: model.homeWinProb > 0.5 ? homeAbbr.toLowerCase() : awayAbbr.toLowerCase(),
    winProbHome:        Number(model.homeWinProb.toFixed(3)),
    winProbAway:        Number(model.awayWinProb.toFixed(3)),
    projectedTotal:     model.modelTotal,
    projectedSpread:    model.modelSpread,
    projectedHomeScore: model.homeFinal,
    projectedAwayScore: model.awayFinal,
    confidenceScore:    model.confidence,
    fairOddsHome:       winProbToML(model.homeWinProb),
    fairOddsAway:       winProbToML(model.awayWinProb),
    edgeHome:           model.edgeHome,
    edgeAway:           model.edgeAway,
    modelVsVegasSpread: model.spreadDisc,
    modelVsVegasTotal:  model.totalDisc,
    monteCarlo:         model.sim,
    supportingFactors:  model.factors,
    riskFactors:        [],
    reasoning:          model.reasoning,
    createdAt:          new Date().toISOString(),
    homeNBAStats: { offRtg: hp.offRtg, defRtg: hp.defRtg, netRtg: hp.netRtg, pace: hp.pace },
    awayNBAStats: { offRtg: ap.offRtg, defRtg: ap.defRtg, netRtg: ap.netRtg, pace: ap.pace },
  };

  if (homeInjury && homeInjury.pointsLost >= 4) prediction.supportingFactors.unshift({
    label: `Warning ${homeAbbr} Injuries`,
    impact: homeInjury.pointsLost >= 8 ? 'high' : 'medium',
    direction: 'negative',
    value: `-${homeInjury.pointsLost?.toFixed(0)} PPG`,
    description: homeInjury.description,
  });
  if (awayInjury && awayInjury.pointsLost >= 4) prediction.supportingFactors.unshift({
    label: `Warning ${awayAbbr} Injuries`,
    impact: awayInjury.pointsLost >= 8 ? 'high' : 'medium',
    direction: 'negative',
    value: `-${awayInjury.pointsLost?.toFixed(0)} PPG`,
    description: awayInjury.description,
  });

  prediction.supportingFactors = prediction.supportingFactors.slice(0, 5);
  return { prediction, homeProfile: hp, awayProfile: ap };
        }
