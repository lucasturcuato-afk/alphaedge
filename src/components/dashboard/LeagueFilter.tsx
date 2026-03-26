// src/components/dashboard/LeagueFilter.tsx
"use client";
import { cn } from "@/lib/utils";

type Sport = "ALL" | "NBA" | "NCAAMB" | "MLB";

interface LeagueFilterProps {
  active: Sport;
  onChange: (sport: Sport) => void;
  counts?: Record<string, number>;
}

const SPORTS: { id: Sport; label: string; color: string }[] = [
  { id: "ALL", label: "All Sports", color: "#00FF87" },
  { id: "NBA", label: "NBA", color: "#C8A96E" },
  { id: "NCAAMB", label: "NCAA Men's", color: "#4B9CD3" },
  { id: "MLB", label: "MLB", color: "#E8002D" },
];

export function LeagueFilter({ active, onChange, counts }: LeagueFilterProps) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {SPORTS.map((sport) => {
        const isActive = active === sport.id;
        const count = counts?.[sport.id];
        return (
          <button
            key={sport.id}
            onClick={() => onChange(sport.id)}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-all border",
              isActive
                ? "border-current text-current"
                : "border-bg-border text-text-muted hover:text-text-secondary hover:border-bg-hover"
            )}
            style={
              isActive
                ? {
                    color: sport.color,
                    background: `${sport.color}12`,
                    borderColor: `${sport.color}40`,
                  }
                : undefined
            }
          >
            {sport.label}
            {count !== undefined && (
              <span
                className={cn(
                  "ml-1.5 text-[9px] px-1 rounded",
                  isActive ? "bg-current/20" : "bg-bg-border"
                )}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
