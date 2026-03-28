// src/lib/api/injuries.ts
// Fetches real NBA injury report from ESPN. No API key needed.
// Used to: (1) filter props for injured players, (2) adjust team predictions.

export interface InjuredPlayer {
  name: string;
  teamAbbr: string;
  status: 'Out' | 'Doubtful' | 'Questionable';
  detail: string;
  impact: 'star' | 'starter' | 'bench'; // estimated impact
}

export interface TeamInjuryImpact {
  teamAbbr: string;
  injuredPlayers: InjuredPlayer[];
  pointsLost: number;   // estimated pts per game lost
  description: string;  // human-readable summary
}

// Players whose absence meaningfully affects team win probability
// Impact thresholds: star = >20ppg or franchise player, starter = 10-20ppg
const STAR_PLAYERS = new Set([
  'giannis antetokounmpo','anthony edwards','cade cunningham','ja morant',
  'trae young','victor wembanyama','damian lillard','stephen curry',
  'kevin durant','devin booker','luka doncic','nikola jokic','jayson tatum',
  'tyrese haliburton','franz wagner','tyrese maxey','kyrie irving',
  'domantas sabonis','jaren jackson jr','anthony davis','jimmy butler',
]);

const STARTER_PLAYERS = new Set([
  'jaden mcdaniels','al horford','daniel gafford','jaden ivey',
  'isaiah stewart','anfernee simons','michael porter jr','zach collins',
  'fred vanvleet','marcus smart','kelly oubre jr','dillon brooks',
  'keegan murray','immanuel quickley','lauri markkanen','walker kessler',
  'russell westbrook','kyle kuzma','de\'andre hunter','zach lavine',
  'jusuf nurkic','brandon clarke','santi aldama',
]);

function getImpact(name: string): 'star' | 'starter' | 'bench' {
  const n = name.toLowerCase();
  if (STAR_PLAYERS.has(n)) return 'star';
  if (STARTER_PLAYERS.has(n)) return 'starter';
  return 'bench';
}

// Points lost estimate based on player impact
function pointsLostForPlayer(impact: 'star' | 'starter' | 'bench'): number {
  if (impact === 'star') return 8;      // star out = ~8 pts/game lost
  if (impact === 'starter') return 4;   // starter out = ~4 pts/game lost
  return 1.5;                           // bench = ~1.5 pts
}

let cachedInjuries: InjuredPlayer[] | null = null;
let cacheTime = 0;
const CACHE_TTL = 30 * 60 * 1000; // 30 min — injuries change during day

export async function fetchInjuryReport(): Promise<InjuredPlayer[]> {
  if (cachedInjuries && Date.now() - cacheTime < CACHE_TTL) {
    return cachedInjuries;
  }
  try {
    const res = await fetch(
      'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/injuries',
      { next: { revalidate: 1800 } }
    );
    if (!res.ok) throw new Error(`ESPN injuries ${res.status}`);
    const data = await res.json();

    const injured: InjuredPlayer[] = [];
    const teams = data.injuries ?? [];

    teams.forEach((t: any) => {
      const teamAbbr = t.team?.abbreviation ?? '';
      t.injuries?.forEach((p: any) => {
        const status = p.status;
        if (!['Out','Doubtful','Questionable'].includes(status)) return;
        const name = p.athlete?.displayName ?? '';
        const impact = getImpact(name);
        injured.push({
          name,
          teamAbbr,
          status,
          detail: p.details?.detail ?? p.details?.type ?? 'Injury',
          impact,
        });
      });
    });

    console.log(`[Injuries] ${injured.length} players on report (${injured.filter(p=>p.status==='Out').length} Out)`);
    cachedInjuries = injured;
    cacheTime = Date.now();
    return injured;
  } catch (e) {
    console.error('[Injuries] fetch error:', e);
    return cachedInjuries ?? [];
  }
}

// Get injury impact for a specific team
export function getTeamInjuryImpact(
  injuries: InjuredPlayer[],
  teamAbbr: string
): TeamInjuryImpact {
  // Match by team abbreviation — ESPN sometimes uses different abbrs
  const ABBR_MAP: Record<string,string> = { SA:'SAS', NO:'NOP', GS:'GSW', NY:'NYK', UTAH:'UTA' };
  const normalized = ABBR_MAP[teamAbbr] ?? teamAbbr;

  const teamInjuries = injuries.filter(p => {
    const pAbbr = ABBR_MAP[p.teamAbbr] ?? p.teamAbbr;
    return pAbbr === normalized || p.teamAbbr === teamAbbr;
  }).filter(p => p.status === 'Out' || p.status === 'Doubtful');

  const pointsLost = teamInjuries.reduce((sum, p) => sum + pointsLostForPlayer(p.impact), 0);

  const stars = teamInjuries.filter(p => p.impact === 'star');
  const starters = teamInjuries.filter(p => p.impact === 'starter');

  let description = '';
  if (stars.length > 0) {
    description = `${stars.map(p=>p.name).join(', ')} OUT — significant impact.`;
  } else if (starters.length > 0) {
    description = `${starters.map(p=>p.name).join(', ')} OUT — moderate impact.`;
  } else if (teamInjuries.length > 0) {
    description = `${teamInjuries.length} role player(s) out — minor impact.`;
  } else {
    description = 'Healthy — no significant injuries.';
  }

  return { teamAbbr, injuredPlayers: teamInjuries, pointsLost, description };
}

// Check if a specific player is injured
export function isPlayerInjured(injuries: InjuredPlayer[], playerName: string): boolean {
  const n = playerName.toLowerCase();
  return injuries.some(p =>
    p.name.toLowerCase() === n ||
    p.name.toLowerCase().includes(n) ||
    n.includes(p.name.toLowerCase().split(' ').pop() ?? '')
  );
}
