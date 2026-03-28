// src/app/api/props/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getTodayAllGames } from "@/lib/api/aggregator";
import { generateAllLiveProps } from "@/lib/api/live-props";

export const revalidate = 300;

export async function GET(req: NextRequest) {
  try {
    const games = await getTodayAllGames();
    const allProps = await generateAllLiveProps(games);
    const { searchParams } = new URL(req.url);
    const sport = searchParams.get("sport");
    const gameId = searchParams.get("gameId");
    let filtered = allProps;
    if (gameId) filtered = filtered.filter(p => p.gameId === gameId);
    if (sport) filtered = filtered.filter(p => p.player.sport === sport);
    return NextResponse.json({ props: filtered, total: filtered.length, source: "live" });
  } catch (err) {
    console.error("[Props API]", err);
    return NextResponse.json({ props: [], total: 0, source: "error" }, { status: 500 });
  }
}
