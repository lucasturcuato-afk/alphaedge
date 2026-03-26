// src/hooks/useGames.ts
"use client";
import { useState, useEffect, useCallback } from "react";
import type { Game } from "@/lib/types";

interface UseGamesResult {
  games: Game[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  dataSource: "live" | "mock" | null;
  refresh: () => void;
}

export function useGames(sport: string = "ALL"): UseGamesResult {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [dataSource, setDataSource] = useState<"live" | "mock" | null>(null);

  const fetchGames = useCallback(async () => {
    try {
      const params = sport !== "ALL" ? `?sport=${sport}` : "";
      const res = await fetch(`/api/games${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setGames(data.games ?? []);
      setDataSource(data.meta?.dataSource ?? null);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch games");
    } finally {
      setLoading(false);
    }
  }, [sport]);

  useEffect(() => {
    setLoading(true);
    fetchGames();
    const interval = setInterval(fetchGames, 60_000);
    return () => clearInterval(interval);
  }, [fetchGames]);

  return { games, loading, error, lastUpdated, dataSource, refresh: fetchGames };
}
