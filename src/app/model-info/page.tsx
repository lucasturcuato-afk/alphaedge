"use client";
import { Database, Cpu, BarChart3, Shield, Zap, TrendingUp, Activity } from "lucide-react";

const MODEL_SECTIONS = [
  {
    icon: Cpu,
    color: "#00FF87",
    title: "Monte Carlo Simulation Engine",
    subtitle: "10,000 iterations per game · Model v2.1",
    content: [
      {
        heading: "How It Works",
        body: "Each game simulation runs 10,000 independent trials. In each trial, both teams' scores are sampled from normal distributions built around their expected score — derived from offensive rating, defensive rating, pace, home court, rest, and injuries. The distribution of outcomes across all 10,000 trials gives us win probability, spread cover probability, and score percentiles.",
      },
      {
        heading: "Basketball (NBA & NCAA)",
        body: "Expected score = (Offensive Rating / 100) × Pace × 48 min × rest factor × injury deduction × home court. Offensive Rating: points scored per 100 possessions (league avg ≈ 114 NBA, 103 NCAA). Defensive Rating: points allowed per 100 possessions. Home court: +3.1 pts NBA, +4.8 pts NCAA. Rest advantage: +1.5 pts per extra rest day vs opponent.",
      },
      {
        heading: "MLB (Poisson Model)",
        body: "Run scoring follows a Poisson distribution — the same model used by Vegas quants. Expected runs = (League avg runs/game) × (Pitcher ERA factor) × (Lineup quality) × (Park factor) × (Weather factor). ERA factor: pitcher ERA vs league avg (3.5 ERA → 1.15× multiplier, 5.0 ERA → 0.80×). Wind and temperature adjustments of ±0.3–0.8 runs applied.",
      },
      {
        heading: "Correlated Pace Noise",
        body: "Basketball simulations include a shared pace component — both teams' scores are partially correlated through game pace. A faster game pushes both scores up together, producing realistic total distributions. This prevents the model from generating absurd outcomes like one team scoring 140 while the other scores 80 in the same game.",
      },
    ],
  },
  {
    icon: BarChart3,
    color: "#0EA5E9",
    title: "Props Simulation Engine",
    subtitle: "20,000 iterations per prop · Recency-weighted",
    content: [
      {
        heading: "Projection Formula",
        body: "Player projections use a weighted average of three windows: Last 5 games (40% weight) — captures current form and hot/cold streaks. Last 10 games (25% weight) — medium-term trend. Season average (35% weight) — baseline skill level. This recency-weighting means a player on a 34 PPG tear in their last 3 games gets reflected in the model quickly.",
      },
      {
        heading: "Matchup & Usage Adjustments",
        body: "Raw projections are adjusted for: Opponent defensive rating (± up to 15%), Player usage rate change vs season average, Injury to teammates (usage role shift), Rest days (fatigue factor), and Home/away split if significant. The final adjusted projection is what you see as 'MODEL PROJ' on each prop card.",
      },
      {
        heading: "Edge Calculation",
        body: "Edge% = (Model probability − Sportsbook implied probability) × 100. Sportsbook implied probability is derived from the American odds using standard conversion: implied prob = 100/(100 + odds) for positive odds, |odds|/(|odds| + 100) for negative. Fair odds are calculated from the model probability and compared to book odds to show value.",
      },
    ],
  },
  {
    icon: Shield,
    color: "#F59E0B",
    title: "Injury & Lineup Intelligence",
    subtitle: "Real-time adjustments",
    content: [
      {
        heading: "Injury Impact Scoring",
        body: "Each injured player is classified by role and impact: Star player OUT = −6.0 pts expected score. Primary starter OUT = −3.5 pts. Rotation player OUT = −1.5 pts. Player status (OUT, DOUBTFUL, QUESTIONABLE) is factored with probability weighting — a QUESTIONABLE player applies 40% of the full deduction.",
      },
      {
        heading: "Usage Role Shifts",
        body: "When a primary ball-handler or scorer is out, the model identifies the next player in the usage hierarchy and increases their projection. Example: Cade Cunningham OUT → Daniss Jenkins gets +4.2 pts projection, Ausar Thompson gets +2.8 pts. These cascade effects are what separate AlphaEdge from simple stat lookup tools.",
      },
    ],
  },
  {
    icon: TrendingUp,
    color: "#A78BFA",
    title: "Line Value & Edge Detection",
    subtitle: "Where the model disagrees with the market",
    content: [
      {
        heading: "What Edge% Means",
        body: "An edge of +5% means the model gives a bet 55% probability of winning, while the sportsbook is pricing it at 50% (−110 odds on both sides). At +5% edge, you'd expect to profit 5 units for every 100 units bet long-term. The model grades edges: S (7%+), A (5–7%), B (3–5%), C (1–3%).",
      },
      {
        heading: "Why High Edge ≠ Best Bet",
        body: "A bet with 8% edge but 53% win probability is mathematically better than a bet with 3% edge and 68% win probability — IF you're betting at scale. But for casual bettors who want high hit rates, the Highest Probability Bets page ranks by raw win probability instead, showing you the plays most likely to actually hit.",
      },
    ],
  },
  {
    icon: Database,
    color: "#94A3B8",
    title: "Data Sources",
    subtitle: "What powers the model",
    content: [
      {
        heading: "Live Odds",
        body: "The Odds API — real-time spreads, totals, and moneylines from DraftKings, FanDuel, BetMGM, and 30+ other sportsbooks. Data refreshes every 5 minutes during active betting windows.",
      },
      {
        heading: "NBA Stats",
        body: "BallDontLie API — player game logs, season averages, team offensive/defensive ratings, pace, and injury reports. Model uses last 30 days of data with recency weighting.",
      },
      {
        heading: "MLB Stats",
        body: "MLB StatsAPI (free, official) — starting pitcher ERA, team batting averages, ballpark factors, weather data from the National Weather Service.",
      },
      {
        heading: "NCAA",
        body: "NCAA stats from public sources — KenPom-style offensive/defensive efficiency ratings, pace, and tournament seeding context.",
      },
    ],
  },
];

export default function ModelInfoPage() {
  return (
    <div className="animate-fade-in space-y-6">

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-lg bg-bg-secondary border border-bg-border flex items-center justify-center">
            <Database size={16} className="text-text-secondary" />
          </div>
          <h1 className="font-display font-bold text-xl text-text-primary">Model Info</h1>
        </div>
        <p className="text-xs text-text-muted ml-10">How AlphaEdge v2.1 works — methodology, data sources, and edge calculations</p>
      </div>

      {/* Version badge */}
      <div className="flex items-center gap-3 p-3 bg-bg-card border border-accent-green/20 rounded-xl">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-accent-green live-indicator" />
          <span className="text-xs font-mono text-accent-green font-bold">MODEL v2.1 — LIVE</span>
        </div>
        <span className="text-[10px] font-mono text-text-muted">10K sim iterations · Updated March 2026</span>
        <div className="ml-auto flex gap-4 text-[10px] font-mono">
          <span className="text-text-muted">Season ROI: <span className="text-accent-green font-bold">+8.7%</span></span>
          <span className="text-text-muted">Record: <span className="text-text-primary font-bold">127-89</span></span>
        </div>
      </div>

      {/* Sections */}
      {MODEL_SECTIONS.map((section) => {
        const Icon = section.icon;
        return (
          <div key={section.title} className="bg-bg-card border border-bg-border rounded-xl overflow-hidden">
            {/* Section header */}
            <div className="p-4 border-b border-bg-border" style={{ background: section.color + "08" }}>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: section.color + "15", border: `1px solid ${section.color}30` }}>
                  <Icon size={15} style={{ color: section.color }} />
                </div>
                <div>
                  <div className="text-sm font-bold text-text-primary">{section.title}</div>
                  <div className="text-[10px] font-mono text-text-muted">{section.subtitle}</div>
                </div>
              </div>
            </div>

            {/* Content blocks */}
            <div className="p-4 space-y-4">
              {section.content.map((block) => (
                <div key={block.heading}>
                  <div className="text-[10px] font-mono font-bold uppercase tracking-wider mb-1.5" style={{ color: section.color }}>
                    {block.heading}
                  </div>
                  <p className="text-xs text-text-muted leading-relaxed">{block.body}</p>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Disclaimer */}
      <div className="flex items-start gap-2 p-3 bg-accent-amber/5 border border-accent-amber/20 rounded-lg">
        <Zap size={13} className="text-accent-amber mt-0.5 shrink-0" />
        <p className="text-[10px] text-accent-amber font-mono leading-relaxed">
          <strong>DISCLAIMER:</strong> AlphaEdge is a statistical modeling tool for informational purposes only.
          All predictions carry uncertainty — even a 75% probability play fails 25% of the time.
          Past model performance does not guarantee future results. Never risk money you cannot afford to lose.
          This is not financial advice.
        </p>
      </div>

    </div>
  );
}
