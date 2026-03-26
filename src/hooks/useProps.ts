// src/hooks/useProps.ts
"use client";
import { useState, useEffect, useCallback } from "react";
import type { Prop } from "@/lib/types";

interface UsePropsResult {
  props: Prop[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => void;
}

export function useProps(sport: string = "ALL"): UsePropsResult {
  const [props, setProps] = useState<Prop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchProps = useCallback(async () => {
    try {
      const params = sport !== "ALL" ? `?sport=${sport}` : "";
      const res = await fetch(`/api/props${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setProps(data.props ?? []);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch props");
    } finally {
      setLoading(false);
    }
  }, [sport]);

  useEffect(() => {
    setLoading(true);
    fetchProps();
    const interval = setInterval(fetchProps, 60_000);
    return () => clearInterval(interval);
  }, [fetchProps]);

  return { props, loading, error, lastUpdated, refresh: fetchProps };
}
