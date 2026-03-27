import { NextResponse } from "next/server";
export async function GET() {
  const oddsKey = process.env.THE_ODDS_API_KEY;
  const bdlKey = process.env.BALLDONTLIE_API_KEY;
  let oddsResult = "untested";
  try {
    const r = await fetch(`https://api.the-odds-api.com/v4/sports/basketball_nba/odds?apiKey=${oddsKey}&regions=us&markets=h2h&oddsFormat=american`, { signal: AbortSignal.timeout(8000) });
    const data = await r.json();
    oddsResult = r.ok ? `OK - ${Array.isArray(data) ? data.length : 0} games` : `ERROR ${r.status}: ${JSON.stringify(data).slice(0,150)}`;
  } catch (e: any) { oddsResult = `THREW: ${e.message}`; }
  let bdlResult = "untested";
  try {
    const today = new Date().toISOString().split("T")[0];
    const r = await fetch(`https://api.balldontlie.io/v1/games?dates[]=${today}&per_page=10`, { headers: { Authorization: bdlKey! }, signal: AbortSignal.timeout(8000) });
    const data = await r.json();
    bdlResult = r.ok ? `OK - ${data.data?.length ?? 0} games` : `ERROR ${r.status}: ${JSON.stringify(data).slice(0,150)}`;
  } catch (e: any) { bdlResult = `THREW: ${e.message}`; }
  return NextResponse.json({ HAS_ODDS: !!oddsKey, HAS_BDL: !!bdlKey, oddsApiTest: oddsResult, bdlApiTest: bdlResult, date: new Date().toISOString() });
}
