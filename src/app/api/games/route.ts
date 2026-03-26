// src/app/api/games/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getTodayAllGames } from "@/lib/api/aggregator";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sport = searchParams.get("sport");
  const status = searchParams.get("status");

  const { games: allGames, dataSource } = await getTodayAllGames();

  let games = allGames;

  if (sport && sport !== "ALL") {
    games = games.filter((g) => g.sport === sport);
  }
  if (status) {
    games = games.filter((g) => g.status === status);
  }

  return NextResponse.json({
    games,
    total: games.length,
    meta: {
      dataSource,
      modelVersion: "v2.1",
      timestamp: new Date().toISOString(),
    },
  });
}
