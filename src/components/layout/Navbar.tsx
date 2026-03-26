// src/components/layout/Navbar.tsx
"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Zap, Bell, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const TICKER_ITEMS = [
  { label: "BOS -6.5 vs NYK", edge: "+1.8% edge AWY", positive: true },
  { label: "Jokić AST OVER 8.5", edge: "+8.9% edge", positive: true },
  { label: "Tatum PTS UNDER 27.5", edge: "+7.2% edge", positive: true },
  { label: "DEN-GSW OVER 228.5", edge: "+2.1% edge", positive: true },
  { label: "Judge HITS OVER 0.5", edge: "+6.1% edge", positive: true },
  { label: "Brunson PTS UNDER 26.5", edge: "+9.3% edge", positive: true },
  { label: "Cooper Flagg PTS OVER 18.5", edge: "+7.8% edge", positive: true },
];

export function Navbar() {
  const [search, setSearch] = useState("");
  const [time, setTime] = useState("");
  const router = useRouter();

  useEffect(() => {
    const tick = () =>
      setTime(
        new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
      );
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      router.push(`/search?q=${encodeURIComponent(search.trim())}`);
      setSearch("");
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-14 border-b border-bg-border bg-bg-primary/95 backdrop-blur-sm">
      {/* Ticker tape */}
      <div className="h-6 bg-bg-secondary border-b border-bg-border overflow-hidden flex items-center">
        <div className="flex gap-0 ticker-content whitespace-nowrap">
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
            <span key={i} className="inline-flex items-center gap-3 px-6">
              <span className="text-text-muted text-[10px] font-mono">
                {item.label}
              </span>
              <span
                className={cn(
                  "text-[10px] font-mono font-semibold",
                  item.positive ? "text-accent-green" : "text-accent-red"
                )}
              >
                {item.edge}
              </span>
              <span className="text-bg-border">|</span>
            </span>
          ))}
        </div>
      </div>

      {/* Main nav bar */}
      <div className="h-8 flex items-center gap-4 px-4">
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 font-display font-bold text-sm tracking-wide shrink-0"
        >
          <Zap size={15} className="text-accent-green" />
          <span className="text-text-primary">ALPHA</span>
          <span className="text-accent-green">EDGE</span>
        </Link>

        {/* Search */}
        <form
          onSubmit={handleSearch}
          className="flex-1 max-w-md relative group"
        >
          <Search
            size={13}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted group-focus-within:text-accent-green transition-colors"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search players, teams, games..."
            className="w-full h-7 bg-bg-secondary border border-bg-border rounded-md pl-8 pr-3 text-xs text-text-primary placeholder:text-text-muted focus:border-accent-green/40 focus:bg-bg-card transition-all"
          />
          <kbd className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-text-muted font-mono bg-bg-border px-1.5 py-0.5 rounded">
            ⌘K
          </kbd>
        </form>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Clock */}
        <span className="font-mono text-[11px] text-text-muted hidden sm:block">
          {time}
        </span>

        {/* Nav links */}
        <div className="hidden lg:flex items-center gap-1">
          {[
            { label: "Dashboard", href: "/" },
            { label: "Best Bets", href: "/best-bets" },
            { label: "Props", href: "/props" },
          ].map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-[11px] text-text-secondary hover:text-text-primary px-2.5 py-1 rounded transition-colors hover:bg-bg-tertiary font-medium"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Notification */}
        <button className="relative p-1.5 text-text-muted hover:text-text-primary transition-colors">
          <Bell size={14} />
          <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-accent-green rounded-full" />
        </button>

        {/* Profile */}
        <button className="flex items-center gap-1.5 text-[11px] text-text-secondary hover:text-text-primary transition-colors pl-2 border-l border-bg-border">
          <div className="w-5 h-5 rounded-full bg-accent-green/20 flex items-center justify-center text-accent-green text-[9px] font-bold font-mono">
            A
          </div>
          <ChevronDown size={11} />
        </button>
      </div>
    </nav>
  );
}
