// src/app/api/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import { MOCK_PLAYERS } from "@/lib/mock-data/players";
import { MOCK_GAMES } from "@/lib/mock-data/games";
import { MOCK_PROPS } from "@/lib/mock-data/props";
import type { SearchResult } from "@/lib/types";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.toLowerCase() ?? "";

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [], total: 0, query: q });
  }

  const results: SearchResult[] = [];

  // Players
  MOCK_PLAYERS.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.team.name.toLowerCase().includes(q) ||
      p.team.abbreviation.toLowerCase().includes(q)
  ).forEach((p) => {
    results.push({
      type: "player",
      id: p.id,
      label: p.name,
      sublabel: `${p.team.abbreviation} · ${p.position}`,
      sport: p.sport,
      href: `/player/${p.id}`,
    });
  });

  // Games
  MOCK_GAMES.filter(
    (g) =>
      g.homeTeam.name.toLowerCase().includes(q) ||
      g.awayTeam.name.toLowerCase().includes(q) ||
      g.homeTeam.abbreviation.toLowerCase().includes(q) ||
      g.awayTeam.abbreviation.toLowerCase().includes(q)
  ).forEach((g) => {
    results.push({
      type: "game",
      id: g.id,
      label: `${g.awayTeam.abbreviation} @ ${g.homeTeam.abbreviation}`,
      sublabel: g.sport,
      sport: g.sport,
      href: `/game/${g.id}`,
    });
  });

  // Props
  MOCK_PROPS.filter(
    (p) =>
      p.player.name.toLowerCase().includes(q) ||
      p.propType.toLowerCase().includes(q)
  ).forEach((p) => {
    results.push({
      type: "prop",
      id: p.id,
      label: `${p.player.name} — ${p.propType.replace(/_/g, " ")} ${p.line}`,
      sublabel: `${p.edge.toFixed(1)}% edge · ${p.sportsbook}`,
      sport: p.player.sport,
      href: `/player/${p.player.id}`,
    });
  });

  return NextResponse.json({
    results: results.slice(0, 20),
    total: results.length,
    query: q,
  });
}
