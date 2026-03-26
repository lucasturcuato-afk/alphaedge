// src/components/layout/Sidebar.tsx
"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  TrendingUp,
  Activity,
  Target,
  Search,
  Newspaper,
  BarChart3,
  Trophy,
  Database,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "High Prob Bets", href: "/high-prob", icon: TrendingUp },
  { label: "Best Edges", href: "/best-bets", icon: Trophy },
  { label: "Props Hub", href: "/props", icon: Target },
  { label: "Search", href: "/search", icon: Search },
];

const LEAGUE_ITEMS = [
  { label: "NBA", href: "/props?sport=NBA", color: "#C8A96E" },
  { label: "NCAAMB", href: "/props?sport=NCAAMB", color: "#4B9CD3" },
  { label: "MLB", href: "/props?sport=MLB", color: "#E8002D" },
];

const TOOL_ITEMS = [
  { label: "News Feed", href: "/news", icon: Newspaper },
  { label: "Simulations", href: "/simulations", icon: Activity },
  { label: "Line History", href: "/line-history", icon: TrendingUp },
  { label: "Backtesting", href: "/backtesting", icon: BarChart3 },
  { label: "Model Info", href: "/model-info", icon: Database },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-14 h-[calc(100vh-56px)] w-56 border-r border-bg-border bg-bg-primary hidden lg:flex flex-col overflow-y-auto z-40">
      <div className="p-3 flex-1">
        {/* Main Nav */}
        <nav className="space-y-0.5 mb-5">
          {NAV_ITEMS.map(({ label, href, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-all",
                  active
                    ? "bg-accent-green/10 text-accent-green border border-accent-green/20"
                    : "text-text-secondary hover:text-text-primary hover:bg-bg-tertiary"
                )}
              >
                <Icon size={14} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Leagues */}
        <div className="mb-5">
          <p className="text-[9px] font-mono uppercase tracking-widest text-text-muted px-3 mb-2">
            Leagues
          </p>
          <div className="space-y-0.5">
            {LEAGUE_ITEMS.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-md text-xs text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-all"
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: item.color }}
                />
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Tools */}
        <div className="mb-5">
          <p className="text-[9px] font-mono uppercase tracking-widest text-text-muted px-3 mb-2">
            Tools
          </p>
          <div className="space-y-0.5">
            {TOOL_ITEMS.map(({ label, href, icon: Icon }) => (
              <Link
                key={label}
                href={href}
                className="flex items-center gap-2.5 px-3 py-1.5 rounded-md text-xs text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-all"
              >
                <Icon size={13} />
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Model Status */}
      <div className="p-3 border-t border-bg-border">
        <div className="card p-2.5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-mono text-text-muted">
              MODEL STATUS
            </span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-accent-green live-indicator" />
              <span className="text-[9px] text-accent-green font-mono">
                LIVE
              </span>
            </span>
          </div>
          <p className="text-[10px] text-text-secondary">
            v2.1 — 10K sim iterations
          </p>
          <div className="mt-1.5 flex gap-2">
            <div>
              <p className="text-[9px] text-text-muted">Today ROI</p>
              <p className="text-xs font-mono text-accent-green font-semibold">
                +3.2%
              </p>
            </div>
            <div>
              <p className="text-[9px] text-text-muted">Season</p>
              <p className="text-xs font-mono text-accent-green font-semibold">
                +8.7%
              </p>
            </div>
          </div>
        </div>

        <Link
          href="#"
          className="mt-2 flex items-center gap-2 px-3 py-1.5 text-xs text-text-muted hover:text-text-secondary transition-colors"
        >
          <Settings size={12} />
          Settings
        </Link>
      </div>
    </aside>
  );
}
