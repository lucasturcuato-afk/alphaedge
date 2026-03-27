import { NextResponse } from "next/server";
export async function GET() {
  return NextResponse.json({
    HAS_ODDS: !!process.env.THE_ODDS_API_KEY,
    HAS_BDL: !!process.env.BALLDONTLIE_API_KEY,
    ODDS_FIRST4: process.env.THE_ODDS_API_KEY?.slice(0,4) ?? "MISSING",
    BDL_FIRST4: process.env.BALLDONTLIE_API_KEY?.slice(0,4) ?? "MISSING",
  });
}
