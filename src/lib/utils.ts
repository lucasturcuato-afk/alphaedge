// src/lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import type { EdgeRating } from "./types";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/** Convert American odds to implied probability */
export function americanToImplied(odds: number): number {
  if (odds > 0) return 100 / (odds + 100);
  return Math.abs(odds) / (Math.abs(odds) + 100);
}

/** Convert probability to American odds */
export function probToAmerican(prob: number): number {
  if (prob >= 0.5) {
    return Math.round(-(prob / (1 - prob)) * 100);
  }
  return Math.round(((1 - prob) / prob) * 100);
}

/** Convert American odds to decimal */
export function americanToDecimal(odds: number): number {
  if (odds > 0) return odds / 100 + 1;
  return 100 / Math.abs(odds) + 1;
}

/** Calculate edge between fair probability and book implied probability */
export function calcEdge(fairProb: number, bookOdds: number): number {
  const implied = americanToImplied(bookOdds);
  return (fairProb - implied) * 100; // percentage points
}

/** Format American odds for display */
export function formatOdds(odds: number): string {
  return odds > 0 ? `+${odds}` : `${odds}`;
}

/** Format spread for display */
export function formatSpread(spread: number): string {
  if (spread === 0) return "PK";
  return spread > 0 ? `+${spread.toFixed(1)}` : `${spread.toFixed(1)}`;
}

/** Grade an edge value */
export function gradeEdge(edge: number): EdgeRating {
  if (edge >= 8)
    return { value: edge, grade: "S", label: "Elite Edge", color: "#00FF87" };
  if (edge >= 5)
    return { value: edge, grade: "A", label: "Strong Edge", color: "#00FF87" };
  if (edge >= 3)
    return {
      value: edge,
      grade: "B",
      label: "Moderate Edge",
      color: "#F59E0B",
    };
  if (edge >= 1)
    return { value: edge, grade: "C", label: "Thin Edge", color: "#F59E0B" };
  return { value: edge, grade: "D", label: "No Edge", color: "#FF3B5C" };
}

/** Format a date/time for display */
export function formatGameTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/Los_Angeles",
  });
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/** Confidence score color */
export function confColor(score: number): string {
  if (score >= 75) return "#00FF87";
  if (score >= 60) return "#F59E0B";
  return "#FF3B5C";
}

/** Sentiment color */
export function sentimentColor(sentiment: string): string {
  if (["positive", "usage_up", "public_hype"].includes(sentiment))
    return "#00FF87";
  if (["negative", "usage_down", "injury_concern"].includes(sentiment))
    return "#FF3B5C";
  if (sentiment === "contrarian") return "#A855F7";
  return "#7B8FA6";
}

/** Abbreviate large numbers */
export function abbrev(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return `${n}`;
}

/** Clamp a value between min and max */
export function clamp(val: number, min: number, max: number): number {
  return Math.min(Math.max(val, min), max);
}
