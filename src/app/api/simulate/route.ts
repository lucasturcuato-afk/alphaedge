// src/app/api/simulate/route.ts
/**
 * Simulation endpoint.
 * In production: proxies to the Python FastAPI model service.
 * In MVP: returns mock Monte Carlo simulation using JS math.
 */
import { NextRequest, NextResponse } from "next/server";
import { MOCK_GAMES } from "@/lib/mock-data/games";
import type { SimulationResult } from "@/lib/types";

function normalRandom(mean: number, stddev: number): number {
  // Box-Muller transform
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z * stddev;
}

function runSimulation(
  homeOffRtg: number,
  homeDefRtg: number,
  awayOffRtg: number,
  awayDefRtg: number,
  pace: number,
  iterations: number = 10000
): SimulationResult {
  const homeScores: number[] = [];
  const awayScores: number[] = [];

  for (let i = 0; i < iterations; i++) {
    // Expected score = (team offense + opp defense) / 2 * pace / 100
    const homeExpected = ((homeOffRtg + (200 - awayDefRtg)) / 2) * (pace / 100);
    const awayExpected = ((awayOffRtg + (200 - homeDefRtg)) / 2) * (pace / 100);

    // Add variance
    const homeScore = Math.max(60, normalRandom(homeExpected, homeExpected * 0.08));
    const awayScore = Math.max(60, normalRandom(awayExpected, awayExpected * 0.08));

    homeScores.push(Math.round(homeScore));
    awayScores.push(Math.round(awayScore));
  }

  const homeWins = homeScores.filter((h, i) => h > awayScores[i]).length;
  const totals = homeScores.map((h, i) => h + awayScores[i]);
  const avgTotal = totals.reduce((a, b) => a + b, 0) / iterations;
  const avgHome = homeScores.reduce((a, b) => a + b, 0) / iterations;
  const avgAway = awayScores.reduce((a, b) => a + b, 0) / iterations;

  // Distribution buckets
  const bucketSize = 10;
  const minTotal = Math.floor(Math.min(...totals) / bucketSize) * bucketSize;
  const maxTotal = Math.ceil(Math.max(...totals) / bucketSize) * bucketSize;
  const distribution: SimulationResult["distribution"] = [];

  for (let b = minTotal; b < maxTotal; b += bucketSize) {
    const count = totals.filter((t) => t >= b && t < b + bucketSize).length;
    distribution.push({
      range: `${b}-${b + bucketSize - 1}`,
      count,
      pct: (count / iterations) * 100,
    });
  }

  // Percentiles
  const sortedHome = [...homeScores].sort((a, b) => a - b);
  const sortedAway = [...awayScores].sort((a, b) => a - b);
  const pct = (arr: number[], p: number) => arr[Math.floor((p / 100) * arr.length)];

  return {
    gameId: "simulated",
    iterations,
    homeWinPct: (homeWins / iterations) * 100,
    awayWinPct: ((iterations - homeWins) / iterations) * 100,
    avgTotal,
    avgHomeScore: avgHome,
    avgAwayScore: avgAway,
    spreadCoverPct: 0, // requires spread input
    distribution,
    percentiles: {
      p10: { home: pct(sortedHome, 10), away: pct(sortedAway, 10) },
      p25: { home: pct(sortedHome, 25), away: pct(sortedAway, 25) },
      p50: { home: pct(sortedHome, 50), away: pct(sortedAway, 50) },
      p75: { home: pct(sortedHome, 75), away: pct(sortedAway, 75) },
      p90: { home: pct(sortedHome, 90), away: pct(sortedAway, 90) },
    },
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { gameId, iterations = 10000 } = body;

    // Try to find pre-computed sim
    const game = MOCK_GAMES.find((g) => g.id === gameId);
    if (game?.simulation) {
      return NextResponse.json({
        simulation: game.simulation,
        cached: true,
      });
    }

    // Run a fresh simulation with default NBA-like ratings
    const result = runSimulation(112, 108, 110, 110, 100, iterations);
    result.gameId = gameId;

    return NextResponse.json({
      simulation: result,
      cached: false,
    });
  } catch (err) {
    return NextResponse.json({ error: "Simulation failed" }, { status: 500 });
  }
}
