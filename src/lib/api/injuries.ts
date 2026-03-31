// src/lib/api/injuries.ts
// ESPN injury feed: structure is {id, displayName, injuries[]}
// Player: p.athlete.displayName, p.status
// Team ID maps to abbreviation via ESPN team ID

export interface InjuredPlayer {
  name: string;
  teamAbbr: string;
  teamId: string;
  status: 'Out' | 'Doubtful' | 'Questionable' | 'Day-To-Day';
  detail: string;
  impact: 'star' | 'starter' | 'bench';
}

export interface TeamInjuryImpact {
  teamAbbr: string;
  injuredPlayers: InjuredPlayer[];
  pointsLost: number;
  description: string;
}

// ESPN team ID → abbreviation (from our earlier discovery)
const ESPN_ID_TO_ABBR: Record<string, string> = {
  '1':'ATL','2':'BOS','17':'BKN','30':'CHA','4':'CHI','5':'CLE',
  '6':'DAL','7':'DEN','8':'DET','9':'GSW','10':'HOU','11':'IND',
  '12':'LAC','13':'LAL','29':'MEM','14':'MIA','15':'MIL','16':'MIN',
  '3':'NOP','18':'NYK','25':'OKC','19':'ORL','20':'PHI','21':'PHX',
  '22':'POR','23':'SAC','24':'SAS','28':'TOR','26':'UTA','27':'WAS',
};

// Also map display name → abbreviation as fallback
const NAME_TO_ABBR: Record<string, string> = {
  'Atlanta Hawks':'ATL','Boston Celtics':'BOS','Brooklyn Nets':'BKN',
  'Charlotte Hornets':'CHA','Chicago Bulls':'CHI','Cleveland Cavaliers':'CLE',
  'Dallas Mavericks':'DAL','Denver Nuggets':'DEN','Detroit Pistons':'DET',
  'Golden State Warriors':'GSW','Houston Rockets':'HOU','Indiana Pacers':'IND',
  'LA Clippers':'LAC','Los Angeles Clippers':'LAC','Los Angeles Lakers':'LAL',
  'Memphis Grizzlies':'MEM','Miami Heat':'MIA','Milwaukee Bucks':'MIL',
  'Minnesota Timberwolves':'MIN','New Orleans Pelicans':'NOP','New York Knicks':'NYK',
  'Oklahoma City Thunder':'OKC','Orlando Magic':'ORL','Philadelphia 76ers':'PHI',
  'Phoenix Suns':'PHX','Portland Trail Blazers':'POR','Sacramento Kings':'SAC',
  'San Antonio Spurs':'SAS','Toronto Raptors':'TOR','Utah Jazz':'UTA',
  'Washington Wizards':'WAS',
};

const STAR_PLAYERS = new Set([
  'giannis antetokounmpo','anthony edwards','cade cunningham','ja morant',
  'trae young','victor wembanyama','damian lillard','stephen curry',
  'kevin durant','devin booker','luka doncic','nikola jokic','jayson tatum',
  'tyrese haliburton','franz wagner','tyrese maxey','kyrie irving',
  'domantas sabonis','jaren jackson jr.','anthony davis','jimmy butler',
  'shai gilgeous-alexander','donovan mitchell','devin booker','lamelo ball',
  'zion williamson','paolo banchero','chet holmgren','evan mobley',
]);

const STARTER_PLAYERS = new Set([
  'jaden mcdaniels','al horford','daniel gafford','jaden ivey',
  'isaiah stewart','anfernee simons','michael porter jr.','zach collins',
  'fred vanvleet','marcus smart','kelly oubre jr.','dillon brooks',
  'keegan murray','immanuel quickley','lauri markkanen','walker kessler',
  'kyle kuzma','de\'andre hunter','zach lavine','jusuf nurkic',
  'brandon clarke','santi aldama','bobby portis','khris middleton',
  'tobias harris','duncan robinson','jalen duren','max strus',
  'jarrett allen','darius garland','desmond bane','julius randle',
]);

function getImpact(name: string): 'star' | 'starter' | 'bench' {
  const n = name.toLowerCase();
  if (STAR_PLAYERS.has(n)) return 'star';
  if (STARTER_PLAYERS.has(n)) return 'starter';
  return 'bench';
}

function pointsLost(impact: 'star' | 'starter' | 'bench'): number {
  return impact === 'star' ? 8 : impact === 'starter' ? 4 : 1.5;
}

let cache: InjuredPlayer[] | null = null;
let cacheTime = 0;
const TTL = 20 * 60 * 1000; // 20 min

export async function fetchInjuryReport(): Promise<InjuredPlayer[]> {
  if (cache && Date.now() - cacheTime < TTL) return cache;

  try {
    const res = await fetch(
      'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/injuries',
      { next: { revalidate: 1200 } }
    );
    if (!res.ok) throw new Error(`${res.status}`);
    const data = await res.json();

    const injured: InjuredPlayer[] = [];
    const teams: any[] = data.injuries ?? [];

    for (const teamEntry of teams) {
      // ESPN structure: {id, displayName, injuries[]}
      const teamId = String(teamEntry.id ?? '');
      const displayName = teamEntry.displayName ?? '';
      const teamAbbr = ESPN_ID_TO_ABBR[teamId] ?? NAME_TO_ABBR[displayName] ?? '';

      if (!teamAbbr) {
        console.warn(`[Injuries] Unknown team: id=${teamId} name=${displayName}`);
        continue;
      }

      for (const p of (teamEntry.injuries ?? [])) {
        const status = p.status ?? '';
        if (!['Out','Doubtful','Questionable','Day-To-Day'].includes(status)) continue;

        // Player name lives in p.athlete.displayName
        const name = p.athlete?.displayName ?? p.shortComment?.split(' ')[0] ?? 'Unknown';
        const detail = p.shortComment?.slice(0, 80) ?? status;
        const impact = getImpact(name);

        injured.push({ name, teamAbbr, teamId, status: status as any, detail, impact });
      }
    }

    const outCount = injured.filter(p => p.status === 'Out').length;
    console.log(`[Injuries] ${injured.length} on report (${outCount} Out) across ${teams.length} teams`);

    cache = injured;
    cacheTime = Date.now();
    return injured;
  } catch (e) {
    console.error('[Injuries] fetch error:', e);
    return cache ?? [];
  }
}

export function getTeamInjuryImpact(
  injuries: InjuredPlayer[],
  teamAbbr: string
): TeamInjuryImpact {
  const ABBR_NORM: Record<string,string> = { SA:'SAS', GS:'GSW', NO:'NOP', NY:'NYK' };
  const norm = ABBR_NORM[teamAbbr] ?? teamAbbr;

  // Only count Out + Doubtful as affecting projections
  const out = injuries.filter(p => {
    const pa = ABBR_NORM[p.teamAbbr] ?? p.teamAbbr;
    return pa === norm && (p.status === 'Out' || p.status === 'Doubtful');
  });

  const totalLost = out.reduce((s, p) => s + pointsLost(p.impact), 0);
  const stars = out.filter(p => p.impact === 'star');
  const starters = out.filter(p => p.impact === 'starter');

  let description = '';
  if (stars.length > 0) {
    description = `STAR${stars.length > 1 ? 'S' : ''} OUT: ${stars.map(p=>p.name).join(', ')}` +
      (starters.length ? ` + ${starters.map(p=>p.name).join(', ')}` : '') +
      ` (~${totalLost.toFixed(0)} PPG impact)`;
  } else if (starters.length > 0) {
    description = `${starters.map(p=>p.name).join(', ')} OUT (~${totalLost.toFixed(0)} PPG impact)`;
  } else if (out.length > 0) {
    description = `${out.length} role player(s) out (~${totalLost.toFixed(0)} PPG impact)`;
  } else {
    description = 'No significant injuries';
  }

  return { teamAbbr: norm, injuredPlayers: out, pointsLost: totalLost, description };
}

export function isPlayerInjured(injuries: InjuredPlayer[], playerName: string): boolean {
  const n = playerName.toLowerCase();
  return injuries.some(p =>
    p.status === 'Out' || p.status === 'Doubtful'
      ? p.name.toLowerCase() === n ||
        p.name.toLowerCase().includes(n.split(' ').pop() ?? n)
      : false
  );
}
