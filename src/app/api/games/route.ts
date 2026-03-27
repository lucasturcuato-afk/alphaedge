// src/app/api/games/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getTodayAllGames } from "@/lib/api/aggregator";

export const revalidate = 300;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sport = searchParams.get("sport");
  const status = searchParams.get("status");

  try {
    let games = await getTodayAllGames();

    if (sport && sport !== "ALL") games = games.filter((g) => g.sport === sport);
    if (status) games = games.filter((g) => g.status === status);

    const isLive = process.env.BALLDONTLIE_API_KEY || process.env.THE_ODDS_API_KEY;

    return NextResponse.json({
      games,
      total: games.length,
      meta: {
        dataSource: isLive ? "live" : "mock",
        modelVersion: "v2.1",
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error("[API/games] Error:", err);
    const { MOCK_GAMES } = await import("@/lib/mock-data/games");
    const today = new Date().toISOString().slice(0, 10);
    let games = MOCK_GAMES.map(g => ({ ...g, gameTime: today + g.gameTime.slice(10) }));
    if (sport && sport !== "ALL") games = games.filter((g) => g.sport === sport);
    if (status) games = games.filter((g) => g.status === status);
    return NextResponse.json({
      games,
      total: games.length,
      meta: { dataSource: "mock_fallback", timestamp: new Date().toISOString() },
    });
  }
}
