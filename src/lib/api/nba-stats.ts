// src/lib/api/nba-stats.ts
// Fetches real NBA team stats from stats.nba.com (free, no API key required).
// Must be called server-side only (CORS blocks browser requests).

export interface NBATeamStats {
  teamId: number;
  teamName: string;
  abbreviation: string;
  gamesPlayed: number;
  wins: number;
  losses: number;
  offRating: number;   // Points scored per 100 possessions
  defRating: number;   // Points allowed per 100 possessions
  netRating: number;   // offRating - defRating
  pace: number;        // Possessions per 48 minutes
  efgPct: number;      // Effective FG%
  tovPct: number;      // Turnover %
  orbPct: number;      // Offensive rebound %
  ftRate: number;      // Free throw rate
}

interface NBAStatsResponse {
  resultSets: Array<{
    headers: string[];
    rowSet: Array<Array<string | number>>;
  }>;
}

let cachedStats: NBATeamStats[] | null = null;
let cacheTime = 0;
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours

export async function getNBATeamStats(): Promise<NBATeamStats[]> {
  // Return cached stats if fresh
  if (cachedStats && Date.now() - cacheTime < CACHE_TTL) {
    return cachedStats;
  }

  const url = [
    'https://stats.nba.com/stats/leaguedashteamstats',
    '?MeasureType=Advanced&PerMode=PerGame&Season=2024-25',
    '&SeasonType=Regular+Season&LeagueID=00&LastNGames=0',
    '&Month=0&OpponentTeamID=0&PaceAdjust=N&Period=0',
    '&PORound=0&TeamID=0&DateFrom=&DateTo=',
  ].join('');

  try {
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        'Origin': 'https://www.nba.com',
        'Referer': 'https://www.nba.com/',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'x-nba-stats-origin': 'stats',
        'x-nba-stats-token': 'true',
      },
      next: { revalidate: 21600 }, // cache 6 hours
    });

    if (!res.ok) {
      console.error('[NBAStats] HTTP error:', res.status);
      return [];
    }

    const data: NBAStatsResponse = await res.json();
    const { headers, rowSet } = data.resultSets[0];

    const idx = (h: string) => headers.indexOf(h);

    const stats: NBATeamStats[] = rowSet.map((row) => ({
      teamId: Number(row[idx('TEAM_ID')]),
      teamName: String(row[idx('TEAM_NAME')]),
      abbreviation: String(row[idx('TEAM_NAME')]).substring(0, 3).toUpperCase(), // fallback
      gamesPlayed: Number(row[idx('GP')]),
      wins: Number(row[idx('W')]),
      losses: Number(row[idx('L')]),
      offRating: Number(row[idx('OFF_RATING')]),
      defRating: Number(row[idx('DEF_RATING')]),
      netRating: Number(row[idx('NET_RATING')]),
      pace: Number(row[idx('PACE')]),
      efgPct: Number(row[idx('EFG_PCT')]),
      tovPct: Number(row[idx('TM_TOV_PCT')]),
      orbPct: Number(row[idx('OREB_PCT')]),
      ftRate: Number(row[idx('FTA_RATE')]),
    }));

    // Map proper abbreviations
    const abbrevMap: Record<string, string> = {
      'Atlanta Hawks': 'ATL', 'Boston Celtics': 'BOS', 'Brooklyn Nets': 'BKN',
      'Charlotte Hornets': 'CHA', 'Chicago Bulls': 'CHI', 'Cleveland Cavaliers': 'CLE',
      'Dallas Mavericks': 'DAL', 'Denver Nuggets': 'DEN', 'Detroit Pistons': 'DET',
      'Golden State Warriors': 'GSW', 'Houston Rockets': 'HOU', 'Indiana Pacers': 'IND',
      'LA Clippers': 'LAC', 'Los Angeles Lakers': 'LAL', 'Memphis Grizzlies': 'MEM',
      'Miami Heat': 'MIA', 'Milwaukee Bucks': 'MIL', 'Minnesota Timberwolves': 'MIN',
      'New Orleans Pelicans': 'NOP', 'New York Knicks': 'NYK', 'Oklahoma City Thunder': 'OKC',
      'Orlando Magic': 'ORL', 'Philadelphia 76ers': 'PHI', 'Phoenix Suns': 'PHX',
      'Portland Trail Blazers': 'POR', 'Sacramento Kings': 'SAC', 'San Antonio Spurs': 'SAS',
      'Toronto Raptors': 'TOR', 'Utah Jazz': 'UTA', 'Washington Wizards': 'WAS',
    };

    stats.forEach((s) => {
      if (abbrevMap[s.teamName]) s.abbreviation = abbrevMap[s.teamName];
    });

    console.log(`[NBAStats] Fetched ${stats.length} teams. League avg ORTG: ${(stats.reduce((a,b) => a + b.offRating, 0) / stats.length).toFixed(1)}`);

    cachedStats = stats;
    cacheTime = Date.now();
    return stats;
  } catch (e) {
    console.error('[NBAStats] Fetch error:', e);
    return [];
  }
}

// Find a team's stats by abbreviation or name
export function findTeamStats(
  allStats: NBATeamStats[],
  abbreviation: string,
  fullName: string
): NBATeamStats | null {
  // Try exact abbreviation match first
  let match = allStats.find((s) => s.abbreviation === abbreviation);
  if (match) return match;

  // Try last word of team name (e.g. "Celtics", "Lakers")
  const lastWord = fullName.split(' ').pop()?.toLowerCase() ?? '';
  match = allStats.find((s) => s.teamName.toLowerCase().endsWith(lastWord));
  if (match) return match;

  // Try partial name match
  match = allStats.find((s) =>
    s.teamName.toLowerCase().includes(fullName.toLowerCase()) ||
    fullName.toLowerCase().includes(s.teamName.toLowerCase().split(' ').pop() ?? '')
  );

  return match ?? null;
}

// Log5 win probability formula (Bill James)
// P(A beats B) = (A_win% × (1 - B_win%)) / (A_win% × (1-B_win%) + B_win% × (1-A_win%))
export function log5WinProb(homeStats: NBATeamStats, awayStats: NBATeamStats): number {
  // Convert net rating to win% using logistic function
  // Every 3.0 net rating points ≈ 10% win probability difference
  const homeWinPct = 0.5 + (homeStats.netRating - awayStats.netRating) / 30;
  const clamped = Math.max(0.25, Math.min(0.85, homeWinPct));

  // Add home court advantage (~3% boost)
  return Math.max(0.25, Math.min(0.82, clamped + 0.03));
}

// Project game total using pace and efficiency
export function projectTotal(homeStats: NBATeamStats, awayStats: NBATeamStats): number {
  const avgPace = (homeStats.pace + awayStats.pace) / 2;
  // Each possession = (homeORTG + awayORTG) / 2 / 100 points
  const ptsPerPossession = (homeStats.offRating + awayStats.offRating) / 2 / 100;
  // Total points = pace × ptsPerPossession × 2 (both teams) × 48/40 (NBA pace is per 48)
  const projected = avgPace * ptsPerPossession * 2;
  return Math.round(projected * 2) / 2; // Round to nearest 0.5
}

// Project spread using net rating differential
export function projectSpread(homeStats: NBATeamStats, awayStats: NBATeamStats): number {
  // ~3 net rating points = ~1 point spread, + 3 for home court
  const raw = (awayStats.netRating - homeStats.netRating) / 3 - 3;
  return Math.round(raw * 2) / 2; // Round to nearest 0.5 (home spread, negative = favorite)
}

// Generate real supporting factors from stats
export function buildSupportingFactors(
  homeStats: NBATeamStats,
  awayStats: NBATeamStats,
  homeWinProb: number
): Array<{ label: string; impact: 'high' | 'medium' | 'low'; direction: 'positive' | 'negative'; value: string; description: string }> {
  const factors = [];
  const homeFavored = homeWinProb > 0.5;

  // Net rating factor
  const netDiff = Math.abs(homeStats.netRating - awayStats.netRating);
  if (netDiff > 4) {
    const betterTeam = homeStats.netRating > awayStats.netRating ? homeStats : awayStats;
    factors.push({
      label: `${betterTeam.teamName} Net Rating Edge`,
      impact: netDiff > 8 ? 'high' as const : 'medium' as const,
      direction: (betterTeam === homeStats) === homeFavored ? 'positive' as const : 'negative' as const,
      value: `+${betterTeam.netRating.toFixed(1)} NRtg`,
      description: `${betterTeam.teamName} has a ${netDiff.toFixed(1)}-point net rating edge this season (${betterTeam.wins}W-${betterTeam.losses}L)`,
    });
  }

  // Offensive edge
  const offDiff = homeStats.offRating - awayStats.offRating;
  if (Math.abs(offDiff) > 3) {
    const betterOff = offDiff > 0 ? homeStats : awayStats;
    factors.push({
      label: `${betterOff.teamName} Offensive Efficiency`,
      impact: 'medium' as const,
      direction: (betterOff === homeStats) === homeFavored ? 'positive' as const : 'negative' as const,
      value: `${betterOff.offRating.toFixed(1)} ORTG`,
      description: `${betterOff.teamName} ranks among top offenses at ${betterOff.offRating.toFixed(1)} points per 100 possessions`,
    });
  }

  // Defensive edge
  const defDiff = awayStats.defRating - homeStats.defRating;
  if (Math.abs(defDiff) > 3) {
    const betterDef = defDiff > 0 ? homeStats : awayStats;
    factors.push({
      label: `${betterDef.teamName} Defensive Efficiency`,
      impact: 'medium' as const,
      direction: (betterDef === homeStats) === homeFavored ? 'positive' as const : 'negative' as const,
      value: `${betterDef.defRating.toFixed(1)} DRTG`,
      description: `${betterDef.teamName} allows only ${betterDef.defRating.toFixed(1)} points per 100 possessions — top defensive unit`,
    });
  }

  // Pace factor for totals
  const avgPace = (homeStats.pace + awayStats.pace) / 2;
  if (avgPace > 100) {
    factors.push({
      label: 'High Pace Matchup',
      impact: 'low' as const,
      direction: 'positive' as const,
      value: `${avgPace.toFixed(1)} avg pace`,
      description: `Both teams play at above-average pace (${homeStats.teamName}: ${homeStats.pace.toFixed(1)}, ${awayStats.teamName}: ${awayStats.pace.toFixed(1)}) — look for OVER`,
    });
  } else if (avgPace < 97) {
    factors.push({
      label: 'Slow Pace Matchup',
      impact: 'low' as const,
      direction: 'negative' as const,
      value: `${avgPace.toFixed(1)} avg pace`,
      description: `Slow pace matchup (${homeStats.teamName}: ${homeStats.pace.toFixed(1)}, ${awayStats.teamName}: ${awayStats.pace.toFixed(1)}) — lean UNDER`,
    });
  }

  // Home court always noted
  factors.push({
    label: 'Home Court Advantage',
    impact: 'low' as const,
    direction: 'positive' as const,
    value: `${homeStats.teamName}`,
    description: `${homeStats.teamName} playing at home — historically worth ~3 points in the NBA`,
  });

  return factors.slice(0, 4);
}
