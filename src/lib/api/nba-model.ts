// src/lib/api/nba-model.ts
// Independent NBA prediction model — builds win probability from team stats,
// NOT from Vegas lines. Edge is the gap between our model and Vegas.

export interface TeamProfile {
  id: string;
  name: string;
  abbreviation: string;
  record: string;
  wins: number;
  losses: number;
  winPct: number;
  // Offensive stats
  avgPts: number;
  fgPct: number;
  threePct: number;
  ftPct: number;
  avgAst: number;
  avgTov: number;
  // Defensive stats
  avgReb: number;
  avgBlk: number;
  avgStl: number;
  // Composite
  offEfficiency: number;   // pts per possession proxy
  defEfficiency: number;   // pts allowed per possession proxy (lower = better)
  netEfficiency: number;   // offEff - defEff
  pace: number;            // possessions per game proxy
  // Recent form
  last10Wins: number;
  homeWins: number;
  homeLosses: number;
  awayWins: number;
  awayLosses: number;
}

export interface ModelPrediction {
  modelWinProbHome: number;  // Our model's independent win probability
  modelWinProbAway: number;
  modelSpread: number;       // Our projected point spread (negative = home favored)
  modelTotal: number;        // Our projected game total
  vegasWinProbHome?: number; // Vegas implied probability (for comparison)
  vegasWinProbAway?: number;
  edgeHome: number;          // Our prob minus Vegas prob (positive = value on home)
  edgeAway: number;
  confidence: number;
  keyFactors: Array<{
    label: string;
    impact: 'high'|'medium'|'low';
    direction: 'positive'|'negative';
    value: string;
    description: string;
  }>;
  reasoning: string;
}

// ESPN team stats endpoint
const ESPN_TEAM_STATS = (teamId: string) =>
  `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/${teamId}/statistics`;

// ESPN team schedule for recent form
const ESPN_TEAM_SCHEDULE = (teamId: string) =>
  `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/${teamId}/schedule?seasontype=2&limit=20`;

// ESPN team ID map (abbreviation -> ESPN team ID)
const ESPN_TEAM_IDS: Record<string, string> = {
  ATL:'1', BOS:'2', BKN:'17', CHA:'30', CHI:'4', CLE:'5', DAL:'6', DEN:'7',
  DET:'8', GSW:'9', HOU:'10', IND:'11', LAC:'12', LAL:'13', MEM:'29', MIA:'14',
  MIL:'15', MIN:'16', NOP:'3', NYK:'18', OKC:'25', ORL:'19', PHI:'20', PHX:'21',
  POR:'22', SAC:'23', SAS:'24', TOR:'28', UTA:'26', WAS:'27',
};

// League averages for normalization (2025-26 season)
const LEAGUE_AVG = {
  pts: 115.8,
  fgPct: 47.2,
  threePct: 36.8,
  ftPct: 78.2,
  ast: 26.1,
  tov: 13.8,
  reb: 43.2,
  pace: 99.4,
};

let teamProfileCache: Record<string, { profile: TeamProfile; ts: number }> = {};
const CACHE_TTL = 3 * 60 * 60 * 1000; // 3 hours

async function fetchTeamProfile(abbr: string): Promise<TeamProfile | null> {
  const cached = teamProfileCache[abbr];
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.profile;

  const teamId = ESPN_TEAM_IDS[abbr];
  if (!teamId) { console.warn(`[Model] No ESPN ID for ${abbr}`); return null; }

  try {
    const [statsRes, schedRes] = await Promise.all([
      fetch(ESPN_TEAM_STATS(teamId), { next: { revalidate: 10800 } }),
      fetch(ESPN_TEAM_SCHEDULE(teamId), { next: { revalidate: 10800 } }),
    ]);

    if (!statsRes.ok) throw new Error(`Stats ${statsRes.status}`);
    const statsData = await statsRes.json();

    // Parse ESPN stats categories
    const cats = statsData.results?.stats?.categories ?? [];
    const getStat = (catName: string, statName: string): number => {
      const cat = cats.find((c: any) => c.name === catName);
      const stat = cat?.stats?.find((s: any) => s.name === statName);
      return parseFloat(stat?.displayValue ?? '0') || 0;
    };

    const avgPts = getStat('offensive', 'avgPoints');
    const fgPct = getStat('offensive', 'fieldGoalPct');
    const threePct = getStat('offensive', 'threePointFieldGoalPct') || getStat('offensive', 'threePointPct');
    const ftPct = getStat('offensive', 'freeThrowPct');
    const avgAst = getStat('offensive', 'avgAssists');
    const avgTov = getStat('offensive', 'avgTurnovers');
    const avgReb = getStat('general', 'avgRebounds');
    const avgBlk = getStat('defensive', 'avgBlocks');
    const avgStl = getStat('defensive', 'avgSteals');

    // Estimate pace from available data (shots + FTs + TOs = possessions proxy)
    const fga = getStat('offensive', 'avgFieldGoalsAttempted');
    const fta = getStat('offensive', 'avgFreeThrowsAttempted');
    const pace = fga + avgTov + (fta * 0.44);

    // Offensive efficiency = pts per possession
    const offEff = pace > 0 ? (avgPts / pace) * 100 : 108;

    // Parse schedule for recent form and home/away splits
    let last10Wins = 0, homeWins = 0, homeLosses = 0, awayWins = 0, awayLosses = 0;
    let record = '0-0', wins = 0, losses = 0;

    if (schedRes.ok) {
      const schedData = await schedRes.json();
      const events = schedData.events ?? [];

      // Get season record from first event's team info
      const teamSection = schedData.team;
      if (teamSection?.record?.items) {
        const overall = teamSection.record.items.find((r: any) => r.type === 'total');
        if (overall?.summary) {
          record = overall.summary;
          const parts = record.split('-');
          wins = parseInt(parts[0]) || 0;
          losses = parseInt(parts[1]) || 0;
        }
      }

      // Parse recent results
      const completed = events.filter((e: any) =>
        e.competitions?.[0]?.status?.type?.completed
      ).slice(-20);

      completed.forEach((event: any, i: number) => {
        const comp = event.competitions[0];
        const homeTeam = comp.competitors.find((c: any) => c.homeAway === 'home');
        const awayTeam = comp.competitors.find((c: any) => c.homeAway === 'away');
        const isHome = homeTeam?.team?.abbreviation === abbr;
        const ourTeam = isHome ? homeTeam : awayTeam;
        const won = ourTeam?.winner === true;

        if (isHome) { won ? homeWins++ : homeLosses++; }
        else { won ? awayWins++ : awayLosses++; }
        if (i >= completed.length - 10) { if (won) last10Wins++; }
      });
    }

    const totalGames = wins + losses || 74;
    const winPct = wins / totalGames;

    // Defensive efficiency proxy: league_avg_pts / (our_def_adj)
    // Teams that steal and block more allow fewer points
    const defBonus = (avgStl - 7.5) * 0.4 + (avgBlk - 4.5) * 0.3;
    const defEff = 115.8 - defBonus - (winPct - 0.5) * 8;

    const profile: TeamProfile = {
      id: teamId, name: abbr, abbreviation: abbr, record,
      wins, losses, winPct,
      avgPts, fgPct, threePct, ftPct, avgAst, avgTov, avgReb, avgBlk, avgStl,
      offEfficiency: offEff,
      defEfficiency: Math.max(100, Math.min(125, defEff)),
      netEfficiency: offEff - defEff,
      pace,
      last10Wins, homeWins, homeLosses, awayWins, awayLosses,
    };

    teamProfileCache[abbr] = { profile, ts: Date.now() };
    console.log(`[Model] ${abbr}: ${wins}W-${losses}L | OFF:${offEff.toFixed(1)} DEF:${defEff.toFixed(1)} NET:${(offEff-defEff).toFixed(1)} L10:${last10Wins}-${10-last10Wins}`);
    return profile;
  } catch (e) {
    console.error(`[Model] Failed to fetch ${abbr}:`, e);
    return null;
  }
}

// Core prediction engine — fully independent of Vegas
function computePrediction(
  home: TeamProfile,
  away: TeamProfile,
  vegasHomeML?: number,
  vegasAwayML?: number,
  vegasSpread?: number,
  vegasTotal?: number,
): ModelPrediction {

  // ── STEP 1: Project each team's score ────────────────────────────────────
  // Expected score = opponent's average allowed, adjusted for our offense
  // Using efficiency differential as the primary driver

  // Home team expected score:
  // Start with our offensive rating, adjust for away team's defense
  const homeOffAdj = home.offEfficiency / 100;         // our points per poss
  const awayDefAdj = away.defEfficiency / LEAGUE_AVG.pts;  // their def quality
  const homeExpectedPts = home.avgPts * (1 / awayDefAdj) * 0.7 + home.avgPts * 0.3;

  // Away team expected score:
  const awayOffAdj = away.offEfficiency / 100;
  const homeDefAdj = home.defEfficiency / LEAGUE_AVG.pts;
  const awayExpectedPts = away.avgPts * (1 / homeDefAdj) * 0.7 + away.avgPts * 0.3;

  // ── STEP 2: Apply adjustments ─────────────────────────────────────────────

  // Home court advantage: +3.1 pts (well-established NBA constant)
  const HOME_COURT = 3.1;

  // Recent form adjustment (L10 record vs expected)
  const homeFormAdj = (home.last10Wins - 5) * 0.4;   // each win above .500 = +0.4 pts
  const awayFormAdj = (away.last10Wins - 5) * 0.4;

  // Shooting efficiency adjustment
  const homeShootAdj = (home.fgPct - LEAGUE_AVG.fgPct) * 0.3;
  const awayShootAdj = (away.fgPct - LEAGUE_AVG.fgPct) * 0.3;

  // 3-point adjustment (threes worth extra 0.5 per make)
  const home3ptAdj = (home.threePct - LEAGUE_AVG.threePct) * 0.15;
  const away3ptAdj = (away.threePct - LEAGUE_AVG.threePct) * 0.15;

  // Turnover adjustment (each extra TO ≈ -1 pt)
  const homeTovAdj = (LEAGUE_AVG.tov - home.avgTov) * 0.8;
  const awayTovAdj = (LEAGUE_AVG.tov - away.avgTov) * 0.8;

  // Home/away split adjustment
  const homeGames = home.homeWins + home.homeLosses || 1;
  const awayGames = away.awayWins + away.awayLosses || 1;
  const homeAtHomeWinPct = home.homeWins / homeGames;
  const awayOnRoadWinPct = away.awayWins / awayGames;
  const homeSplitAdj = (homeAtHomeWinPct - home.winPct) * 5;   // how much better they are at home
  const awaySplitAdj = (awayOnRoadWinPct - away.winPct) * 5;   // how much worse/better on road

  // Final projected scores
  const homeFinal = homeExpectedPts + HOME_COURT + homeFormAdj + homeShootAdj + home3ptAdj + homeTovAdj + homeSplitAdj;
  const awayFinal = awayExpectedPts - homeFormAdj * 0.3 + awayFormAdj + awayShootAdj + away3ptAdj + awayTovAdj + awaySplitAdj;

  // ── STEP 3: Win probability from score distribution ───────────────────────
  // In NBA, the std deviation of score differences is ~11 points
  // Use cumulative normal distribution to get win probability
  const scoreDiff = homeFinal - awayFinal;
  const SCORE_STDDEV = 11.5;  // historical NBA game std dev

  // P(home wins) from normal distribution
  const z = scoreDiff / SCORE_STDDEV;
  // Approximate cumulative normal distribution
  const homeWinProb = 1 / (1 + Math.exp(-1.7 * z));  // logistic approximation

  const modelWinProbHome = Math.max(0.05, Math.min(0.95, homeWinProb));
  const modelWinProbAway = 1 - modelWinProbHome;
  const modelSpread = -(scoreDiff);  // negative = home favored (standard convention)
  const modelTotal = homeFinal + awayFinal;

  // ── STEP 4: Calculate edge vs Vegas ──────────────────────────────────────
  let vegasWinProbHome: number | undefined;
  let vegasWinProbAway: number | undefined;
  let edgeHome = 0, edgeAway = 0;

  if (vegasHomeML && vegasAwayML) {
    const rawHome = vegasHomeML < 0 ? Math.abs(vegasHomeML)/(Math.abs(vegasHomeML)+100) : 100/(vegasHomeML+100);
    const rawAway = vegasAwayML < 0 ? Math.abs(vegasAwayML)/(Math.abs(vegasAwayML)+100) : 100/(vegasAwayML+100);
    const vig = rawHome + rawAway;
    vegasWinProbHome = rawHome / vig;
    vegasWinProbAway = rawAway / vig;

    // Edge = our model prob MINUS Vegas implied prob
    // Positive = we think team is more likely to win than Vegas does = value
    edgeHome = Number(((modelWinProbHome - vegasWinProbHome) * 100).toFixed(1));
    edgeAway = Number(((modelWinProbAway - vegasWinProbAway) * 100).toFixed(1));
  }

  // ── STEP 5: Spread discrepancy ────────────────────────────────────────────
  const spreadDiscrepancy = vegasSpread !== undefined ? modelSpread - vegasSpread : null;
  const totalDiscrepancy = vegasTotal !== undefined ? modelTotal - vegasTotal : null;

  // ── STEP 6: Confidence ────────────────────────────────────────────────────
  // Confidence is higher when: net efficiency gap is large, L10 strongly favors one side,
  // and our model agrees directionally with Vegas but sees different magnitude
  const netGap = Math.abs(home.netEfficiency - away.netEfficiency);
  const formGap = Math.abs(home.last10Wins - away.last10Wins);
  const confidence = Math.min(88, Math.max(48,
    50 + netGap * 1.5 + formGap * 1.2 + Math.abs(scoreDiff) * 0.8
  ));

  // ── STEP 7: Key factors ───────────────────────────────────────────────────
  const factors: ModelPrediction['keyFactors'] = [];
  const homeFavored = modelWinProbHome > 0.5;
  const favTeam = homeFavored ? home : away;
  const dogTeam = homeFavored ? away : home;

  // Net efficiency factor
  if (netGap > 2) {
    factors.push({
      label: `${favTeam.abbreviation} Efficiency Edge`,
      impact: netGap > 8 ? 'high' : netGap > 4 ? 'medium' : 'low',
      direction: 'positive',
      value: `OFF ${favTeam.offEfficiency.toFixed(1)} | DEF ${favTeam.defEfficiency.toFixed(1)}`,
      description: `${favTeam.name} model net efficiency: ${favTeam.netEfficiency.toFixed(1)} vs ${dogTeam.name}: ${dogTeam.netEfficiency.toFixed(1)}. Gap of ${netGap.toFixed(1)} points per 100 possessions.`,
    });
  }

  // Recent form factor
  if (formGap >= 2) {
    const betterForm = home.last10Wins > away.last10Wins ? home : away;
    factors.push({
      label: `${betterForm.abbreviation} Recent Form`,
      impact: formGap >= 4 ? 'high' : 'medium',
      direction: (betterForm === home) === homeFavored ? 'positive' : 'negative',
      value: `L10: ${betterForm.last10Wins}-${10-betterForm.last10Wins}`,
      description: `${betterForm.name} is ${betterForm.last10Wins}-${10-betterForm.last10Wins} in their last 10 games vs ${(betterForm===home?away:home).name}'s ${(betterForm===home?away:home).last10Wins}-${10-(betterForm===home?away:home).last10Wins}.`,
    });
  }

  // Shooting efficiency
  const shootGap = Math.abs(home.fgPct - away.fgPct);
  if (shootGap > 2) {
    const betterShoot = home.fgPct > away.fgPct ? home : away;
    factors.push({
      label: `${betterShoot.abbreviation} Shooting Advantage`,
      impact: shootGap > 4 ? 'medium' : 'low',
      direction: (betterShoot === home) === homeFavored ? 'positive' : 'negative',
      value: `${betterShoot.fgPct.toFixed(1)}% FG`,
      description: `${betterShoot.name} shoots ${betterShoot.fgPct.toFixed(1)}% from the field vs ${(betterShoot===home?away:home).name}'s ${(betterShoot===home?away:home).fgPct.toFixed(1)}%. Better efficiency = more points per possession.`,
    });
  }

  // Home/away split
  const homeAtHomeWinPct2 = home.homeWins / (home.homeWins + home.homeLosses || 1);
  const awayOnRoadWinPct2 = away.awayWins / (away.awayWins + away.awayLosses || 1);
  factors.push({
    label: 'Home/Away Splits',
    impact: 'low',
    direction: homeAtHomeWinPct2 > awayOnRoadWinPct2 ? 'positive' : 'negative',
    value: `${home.abbreviation} ${home.homeWins}-${home.homeLosses} home | ${away.abbreviation} ${away.awayWins}-${away.awayLosses} road`,
    description: `${home.name} is ${home.homeWins}-${home.homeLosses} at home (${Math.round(homeAtHomeWinPct2*100)}%). ${away.name} is ${away.awayWins}-${away.awayLosses} on the road (${Math.round(awayOnRoadWinPct2*100)}%).`,
  });

  // Model vs Vegas discrepancy — this is the key insight
  if (spreadDiscrepancy !== null && Math.abs(spreadDiscrepancy) >= 2) {
    const side = spreadDiscrepancy < 0 ? home.abbreviation : away.abbreviation;
    factors.push({
      label: `Model-Vegas Spread Discrepancy`,
      impact: Math.abs(spreadDiscrepancy) > 5 ? 'high' : 'medium',
      direction: 'positive',
      value: `Model: ${modelSpread.toFixed(1)} | Vegas: ${vegasSpread?.toFixed(1)}`,
      description: `Model projects ${Math.abs(spreadDiscrepancy).toFixed(1)}-point discrepancy vs Vegas line. Model favors ${side} by ${Math.abs(spreadDiscrepancy).toFixed(1)} more than market. This is potential betting value.`,
    });
  }

  // Build reasoning
  const favProb = Math.round(Math.max(modelWinProbHome, modelWinProbAway) * 100);
  const reasoning = [
    `Model projects ${home.name} ${homeFinal.toFixed(1)} - ${away.name} ${awayFinal.toFixed(1)}.`,
    `Win probability: ${home.abbreviation} ${Math.round(modelWinProbHome*100)}% / ${away.abbreviation} ${Math.round(modelWinProbAway*100)}%.`,
    `Model spread: ${home.abbreviation} ${modelSpread > 0 ? '+' : ''}${modelSpread.toFixed(1)} | Projected total: ${modelTotal.toFixed(1)}.`,
    vegasSpread !== undefined ? `Vegas has ${home.abbreviation} at ${vegasSpread > 0 ? '+' : ''}${vegasSpread} — model ${spreadDiscrepancy !== null && spreadDiscrepancy < 0 ? 'agrees and sees MORE value' : spreadDiscrepancy !== null && Math.abs(spreadDiscrepancy) > 2 ? `DISAGREES by ${Math.abs(spreadDiscrepancy).toFixed(1)} pts` : 'is roughly aligned'}.` : '',
    `Key drivers: ${home.abbreviation} net eff ${home.netEfficiency.toFixed(1)}, L10 ${home.last10Wins}-${10-home.last10Wins}; ${away.abbreviation} net eff ${away.netEfficiency.toFixed(1)}, L10 ${away.last10Wins}-${10-away.last10Wins}.`,
  ].filter(Boolean).join(' ');

  return {
    modelWinProbHome,
    modelWinProbAway,
    modelSpread: Number(modelSpread.toFixed(1)),
    modelTotal: Number(modelTotal.toFixed(1)),
    vegasWinProbHome,
    vegasWinProbAway,
    edgeHome,
    edgeAway,
    confidence: Math.round(confidence),
    keyFactors: factors.slice(0, 5),
    reasoning,
  };
}

// Fair odds from win probability
function winProbToML(prob: number): number {
  return prob >= 0.5 ? -Math.round((prob/(1-prob))*100) : Math.round(((1-prob)/prob)*100);
}

// Main export: fetch team profiles and generate prediction
export async function buildNBAPrediction(
  homeAbbr: string,
  awayAbbr: string,
  vegasHomeML?: number,
  vegasAwayML?: number,
  vegasSpread?: number,
  vegasTotal?: number,
): Promise<{
  prediction: any;
  homeProfile: TeamProfile | null;
  awayProfile: TeamProfile | null;
}> {
  const [homeProfile, awayProfile] = await Promise.all([
    fetchTeamProfile(homeAbbr),
    fetchTeamProfile(awayAbbr),
  ]);

  if (!homeProfile || !awayProfile) {
    // Fallback if API fails — at least use Vegas lines
    console.warn(`[Model] Missing profiles for ${homeAbbr} vs ${awayAbbr}, using Vegas fallback`);
    const rawH = vegasHomeML ? (vegasHomeML < 0 ? Math.abs(vegasHomeML)/(Math.abs(vegasHomeML)+100) : 100/(vegasHomeML+100)) : 0.5;
    const rawA = vegasAwayML ? (vegasAwayML < 0 ? Math.abs(vegasAwayML)/(Math.abs(vegasAwayML)+100) : 100/(vegasAwayML+100)) : 0.5;
    const vig = rawH + rawA;
    const hp = rawH/vig, ap = rawA/vig;
    return {
      homeProfile, awayProfile,
      prediction: {
        id: `pred-nba-fallback`, modelVersion: 'v2.1',
        predictedWinner: hp > 0.5 ? homeAbbr.toLowerCase() : awayAbbr.toLowerCase(),
        winProbHome: hp, winProbAway: ap,
        projectedTotal: vegasTotal ?? 224, projectedSpread: vegasSpread ?? 0,
        confidenceScore: 52, fairOddsHome: winProbToML(hp), fairOddsAway: winProbToML(ap),
        edgeHome: 0, edgeAway: 0,
        supportingFactors: [], riskFactors: [],
        reasoning: 'Team profile unavailable — using Vegas lines as fallback.',
        createdAt: new Date().toISOString(),
      },
    };
  }

  const model = computePrediction(homeProfile, awayProfile, vegasHomeML, vegasAwayML, vegasSpread, vegasTotal);

  const prediction = {
    id: `pred-nba-model`,
    modelVersion: 'v2.1',
    predictedWinner: model.modelWinProbHome > 0.5 ? homeAbbr.toLowerCase() : awayAbbr.toLowerCase(),
    winProbHome: Number(model.modelWinProbHome.toFixed(3)),
    winProbAway: Number(model.modelWinProbAway.toFixed(3)),
    projectedTotal: model.modelTotal,
    projectedSpread: model.modelSpread,
    confidenceScore: model.confidence,
    fairOddsHome: winProbToML(model.modelWinProbHome),
    fairOddsAway: winProbToML(model.modelWinProbAway),
    edgeHome: model.edgeHome,
    edgeAway: model.edgeAway,
    modelVsVegasSpread: vegasSpread !== undefined ? Number((model.modelSpread - vegasSpread).toFixed(1)) : null,
    modelVsVegasTotal: vegasTotal !== undefined ? Number((model.modelTotal - vegasTotal).toFixed(1)) : null,
    supportingFactors: model.keyFactors,
    riskFactors: [],
    reasoning: model.reasoning,
    createdAt: new Date().toISOString(),
  };

  return { prediction, homeProfile, awayProfile };
}
