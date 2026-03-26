# python_service/main.py
"""
AlphaEdge Python Model Service
FastAPI service for Monte Carlo simulations, feature engineering, and ML inference.
Connect this to the Next.js API layer via HTTP.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import uvicorn

from models.monte_carlo import run_game_simulation, run_prop_simulation
from models.feature_engine import build_game_features, build_prop_features

app = FastAPI(
    title="AlphaEdge Model Service",
    description="Quantitative sports prediction and simulation engine",
    version="2.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://alphaedge.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Schemas ────────────────────────────────────────────────────────────────────

class TeamStats(BaseModel):
    offensive_rating: float = Field(..., ge=80, le=140, description="Points per 100 possessions")
    defensive_rating: float = Field(..., ge=80, le=140)
    pace: float = Field(..., ge=85, le=115, description="Possessions per 48 min")
    home_away: str = Field(..., pattern="^(home|away)$")
    rest_days: int = Field(..., ge=0, le=10)
    injuries: List[str] = Field(default_factory=list, description="List of injured player IDs")
    last5_net_rtg: Optional[float] = None

class GameSimRequest(BaseModel):
    game_id: str
    home_team: TeamStats
    away_team: TeamStats
    iterations: int = Field(default=10000, ge=1000, le=100000)
    sport: str = Field(default="NBA", pattern="^(NBA|NCAAMB|MLB)$")
    # MLB extras
    home_starter_era: Optional[float] = None
    away_starter_era: Optional[float] = None
    wind_speed: Optional[float] = None
    wind_direction: Optional[str] = None
    temperature: Optional[float] = None

class PropSimRequest(BaseModel):
    player_id: str
    prop_type: str  # points | rebounds | assists | hits | home_runs | strikeouts
    season_avg: float
    last5_avg: float
    last10_avg: float
    usage_rate: Optional[float] = None
    opponent_rank_vs_position: Optional[int] = None  # 1=best defense, 30=worst
    home_away: str = Field(default="home", pattern="^(home|away)$")
    rest_days: int = Field(default=1, ge=0, le=7)
    minutes_expected: Optional[float] = None
    player_status: str = Field(default="active")
    book_line: float
    iterations: int = Field(default=10000, ge=1000, le=50000)

class FactorRequest(BaseModel):
    game_id: str
    home_stats: Dict[str, Any]
    away_stats: Dict[str, Any]
    news_signals: Optional[Dict[str, Any]] = None
    sentiment_scores: Optional[Dict[str, float]] = None

# ── Endpoints ──────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "healthy", "model_version": "2.1.0", "service": "AlphaEdge Model Service"}


@app.post("/simulate/game")
async def simulate_game(req: GameSimRequest):
    """
    Run Monte Carlo game simulation.
    Returns win probabilities, score distributions, and percentile bands.
    """
    try:
        result = run_game_simulation(
            game_id=req.game_id,
            home_off_rtg=req.home_team.offensive_rating,
            home_def_rtg=req.home_team.defensive_rating,
            away_off_rtg=req.away_team.offensive_rating,
            away_def_rtg=req.away_team.defensive_rating,
            pace=req.home_team.pace,
            home_rest=req.home_team.rest_days,
            away_rest=req.away_team.rest_days,
            iterations=req.iterations,
            sport=req.sport,
            # MLB
            home_era=req.home_starter_era,
            away_era=req.away_starter_era,
            wind_speed=req.wind_speed,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Simulation error: {str(e)}")


@app.post("/simulate/prop")
async def simulate_prop(req: PropSimRequest):
    """
    Run Monte Carlo prop simulation.
    Returns over/under probabilities and fair odds.
    """
    try:
        result = run_prop_simulation(
            player_id=req.player_id,
            prop_type=req.prop_type,
            season_avg=req.season_avg,
            last5_avg=req.last5_avg,
            last10_avg=req.last10_avg,
            book_line=req.book_line,
            usage_rate=req.usage_rate,
            opponent_rank=req.opponent_rank_vs_position,
            home_away=req.home_away,
            rest_days=req.rest_days,
            player_status=req.player_status,
            iterations=req.iterations,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prop simulation error: {str(e)}")


@app.post("/features/game")
async def game_features(req: FactorRequest):
    """
    Build and return feature vector for a game prediction.
    Useful for explainability and model input inspection.
    """
    try:
        features = build_game_features(
            home_stats=req.home_stats,
            away_stats=req.away_stats,
            news_signals=req.news_signals or {},
            sentiment=req.sentiment_scores or {},
        )
        return {"game_id": req.game_id, "features": features}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/model/info")
async def model_info():
    return {
        "version": "2.1.0",
        "sports": ["NBA", "NCAAMB", "MLB"],
        "simulation_engine": "Monte Carlo (Normal + Poisson mixture)",
        "iterations_default": 10000,
        "features": {
            "game": [
                "offensive_rating", "defensive_rating", "pace", "rest_days",
                "home_advantage_adj", "injury_impact", "last5_net_rtg",
                "l10_ats_record", "sentiment_score", "line_movement"
            ],
            "prop": [
                "season_avg", "last5_avg", "last10_avg", "usage_rate",
                "opponent_rank_vs_position", "home_away_split",
                "rest_days", "minutes_projection", "pace_adj"
            ]
        },
        "calibration": {
            "method": "Platt scaling",
            "last_updated": "2025-01-01",
            "brier_score": 0.218,
            "log_loss": 0.641
        }
    }


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
