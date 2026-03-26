# AlphaEdge — Sports Betting Intelligence Platform

> Bloomberg Terminal × Modern Sports Analytics × AI Research Assistant

A production-grade sports prediction platform supporting NBA, NCAA Men's Basketball, and MLB. Combines quantitative modeling, Monte Carlo simulations, news/sentiment NLP, and sportsbook line comparison into a premium decision-support dashboard.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│              Next.js 14 Frontend (App Router)            │
│   Dashboard │ Search │ Game │ Player │ Props │ Best Bets │
└──────────────────────┬──────────────────────────────────┘
                       │ REST API
┌──────────────────────▼──────────────────────────────────┐
│           Next.js API Routes (BFF Layer)                 │
│      /api/games │ /api/props │ /api/search │ /api/simulate│
└──┬─────────────────┬──────────────────┬─────────────────┘
   │                 │                  │
┌──▼──────┐   ┌──────▼──────┐   ┌──────▼──────┐
│  Stats  │   │  Odds API   │   │ News/Social │
│  APIs   │   │  Adapters   │   │  Ingestion  │
└──┬──────┘   └──────┬──────┘   └──────┬──────┘
   │                 │                  │
┌──▼─────────────────▼──────────────────▼──────┐
│         PostgreSQL + Prisma ORM               │
└──────────────────┬────────────────────────────┘
                   │
            ┌──────▼────────┐
            │ Python FastAPI │  ← Monte Carlo Engine
            │  Model Service │  ← Feature Engineering
            │   :8000        │  ← NLP Signal Extraction
            └───────────────┘
```

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Charts | Recharts |
| Backend | Next.js API Routes |
| Database | PostgreSQL + Prisma |
| Model Service | Python 3.11, FastAPI, NumPy, SciPy |
| Cache | Redis |
| Deployment | Vercel (FE) + Railway/Render (Python) |

---

## Phase 4 — Local Setup

### Prerequisites

- Node.js 18+
- Python 3.11+
- PostgreSQL 15+
- Redis (optional for MVP)

### 1. Clone and install dependencies

```bash
git clone <your-repo>
cd alphaedge
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env.local
# Edit .env.local with your database URL and API keys
```

### 3. Set up the database

```bash
# Start PostgreSQL and create DB
createdb alphaedge

# Push Prisma schema
npm run db:push

# (Optional) Open Prisma Studio
npm run db:studio
```

### 4. Start the Next.js development server

```bash
npm run dev
# App runs at http://localhost:3000
```

### 5. Set up the Python model service

```bash
cd python_service
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py
# Service runs at http://localhost:8000
# API docs at http://localhost:8000/docs
```

---

## Pages & Routes

| Route | Description |
|-------|-------------|
| `/` | Dashboard — today's games, top edges, news |
| `/game/[id]` | Game detail — matchup, sim, lines, props, news |
| `/player/[id]` | Player detail — props, trends, splits, news |
| `/props` | Props hub — filterable table/grid with all props |
| `/best-bets` | Top model edges for games and props |
| `/search?q=` | Universal search — players, teams, games, props |

---

## API Endpoints

### Next.js BFF

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/games` | Get games (filter: sport, status) |
| GET | `/api/props` | Get props (filter: sport, propType, minEdge) |
| GET | `/api/search` | Search players/games/props |
| POST | `/api/simulate` | Run/retrieve game simulation |

### Python Model Service (port 8000)

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/health` | Service health check |
| POST | `/simulate/game` | Monte Carlo game simulation |
| POST | `/simulate/prop` | Monte Carlo prop simulation |
| POST | `/features/game` | Build game feature vector |
| GET | `/model/info` | Model metadata and calibration stats |

---

## Phase 5 — Connecting Real APIs

The app is structured so real data sources plug in as adapters with minimal rewrites.

### Real-time Odds (The Odds API)
```typescript
// Replace mock lines in src/lib/mock-data/games.ts with:
const res = await fetch(`https://api.the-odds-api.com/v4/sports/basketball_nba/odds?apiKey=${key}&regions=us&markets=h2h,spreads,totals`);
const odds = await res.json();
```

### NBA Stats (BallDontLie — free)
```typescript
const res = await fetch(`https://api.balldontlie.io/v1/players?search=${name}`, {
  headers: { Authorization: process.env.BALLDONTLIE_API_KEY }
});
```

### MLB Stats (MLB StatsAPI — free/public)
```typescript
const res = await fetch(`https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${date}`);
```

### Reddit Sentiment (PRAW)
```python
# python_service/ingestion/reddit.py
import praw
reddit = praw.Reddit(client_id=CLIENT_ID, client_secret=SECRET, user_agent="AlphaEdge/1.0")
sub = reddit.subreddit("sportsbook+nba+baseball")
posts = sub.search(f"{player_name} props", limit=25, time_filter="day")
```

### Background Jobs (Refresh Schedule)
```typescript
// Using node-cron in a Next.js API route or separate worker:
cron.schedule("*/15 * * * *", refreshOdds);    // every 15 min
cron.schedule("0 * * * *", refreshStats);      // hourly
cron.schedule("*/5 * * * *", refreshInjuries); // every 5 min
```

---

## Model Approach

### Game Prediction
1. Collect: offensive/defensive ratings, pace, rest, injuries, home/away
2. Feature engineer: net rating edge, rest differential, form scores, injury impact
3. Simulate: 10K Monte Carlo iterations with correlated score draws
4. Output: win probability, projected total/spread, fair odds, confidence

### Prop Prediction  
1. Collect: season avg, last 5/10 game averages, usage rate, opponent rank
2. Recency-weight: 40% last-5, 25% last-10, 35% season
3. Adjust: opponent matchup (±12%), home/away (±3%), rest (±6-8%), status
4. Simulate: 10K iterations with normal/negative-binomial distributions
5. Output: over/under probability, fair odds, edge %, confidence score

### Edge Calculation
```
Edge = (Model Probability − Book Implied Probability) × 100
Book Implied = |odds| / (|odds| + 100) for favorites
              = 100 / (odds + 100) for underdogs
```

---

## Confidence Score Rubric

| Score | Grade | Meaning |
|-------|-------|---------|
| 80-100 | S | Very strong signal — clear matchup + recent form alignment |
| 70-79 | A | Strong — multiple factors aligning |
| 60-69 | B | Moderate — solid lean, some uncertainty |
| 50-59 | C | Thin — marginal edge, high variance |
| <50 | D | No clear edge |

---

## Legal & Compliance Notes

- AlphaEdge is a **decision-support research tool**, not a betting service
- Users are responsible for understanding gambling laws in their jurisdiction
- The app does not place bets, handle funds, or store betting history
- Social/news data is analyzed in aggregate — no PII stored
- Odds data must comply with terms of service of data providers
- Consider geofencing if monetizing in regulated jurisdictions

---

## Roadmap (Phase 5+)

- [ ] Live score/game tracking integration
- [ ] Real-time line movement alerts
- [ ] Historical backtesting dashboard
- [ ] User prop tracker (save picks, track results)
- [ ] Automated closing-line value (CLV) analysis
- [ ] NFL and NCAAFB support
- [ ] Mobile app (React Native)
- [ ] Webhook alerts for sharp line movement
- [ ] Calibration dashboard (Brier score tracking)
- [ ] Multi-sportsbook arbitrage detector
