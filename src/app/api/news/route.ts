// src/app/api/news/route.ts
import { NextRequest, NextResponse } from "next/server";
import { MOCK_NEWS } from "@/lib/mock-data/news";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const sport = searchParams.get("sport");

  let news = MOCK_NEWS;
  if (sport && sport !== "ALL") {
    news = news.filter((n) => n.sport === sport);
  }

  return NextResponse.json({
    news,
    total: news.length,
    meta: {
      dataSource: "mock",
      timestamp: new Date().toISOString(),
    },
  });
}
