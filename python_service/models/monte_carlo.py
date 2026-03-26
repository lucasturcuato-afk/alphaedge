# python_service/models/monte_carlo.py
"""
Monte Carlo simulation engine for AlphaEdge.

Game simulation: models each game as a draw from team strength distributions,
accounting for pace, home advantage, rest, and injury-adjusted ratings.

Prop simulation: models player stat lines using a mixture of normal and
negative binomial distributions, with recency-weighted inputs.
"""

import numpy as np
from scipy import stats
from typing import Optional, Dict, List, Any
import math


# ── Constants ─────────────────────────────────────────────────────────────────

HOME_ADVANTAGE_PTS = 3.1        # NBA historical home advantage in points
HOME_ADVANTAGE_NCAA = 4.8       # Higher in college
REST_PENALTY_PER_DAY = 0.4      # Rating impact per day rest differential
INJURY_IMPACT_STAR = 6.0        # Points impact of losing a star player
INJURY_IMPACT_STARTER = 3.5
INJURY_IMPACT_BENCH = 1.2

NBA_STDDEV_FACTOR = 0.087       # Score variance as fraction of mean
MLB_POISSON_FACTOR = 0.94       # MLB runs follow near-Poisson distribution


# ── Utility ────────────────────────────────────────────────────────────────────

def prob_to_american(prob: float) -> int:
    """Convert win probability to American odds."""
    prob = max(0.001, min(0.999, prob))
    if prob >= 0.5:
        return round(-(prob / (1 - prob)) * 100)
    return round(((1 - prob) / prob) * 100)


def vig_remove(over_odds: int, under_odds: int) -> tuple[float, float]:
    """Remove vig to get true probabilities from book odds."""
    def imp(o):
        if o > 0:
            return 100 / (o + 100)
        return abs(o) / (abs(o) + 100)
    
    raw_over = imp(over_odds)
    raw_under = imp(under_odds)
    total = raw_over + raw_under
    return raw_over / total, raw_under / total


def build_score_distribution(scores: np.ndarray, bucket_size: float = 10) -> List[Dict]:
    """Build histogram buckets from simulation scores."""
    min_val = float(np.floor(scores.min() / bucket_size) * bucket_size)
    max_val = float(np.ceil(scores.max() / bucket_size) * bucket_size)
    buckets = []
    b = min_val
    while b < max_val:
        count = int(np.sum((scores >= b) & (scores < b + bucket_size)))
        buckets.append({
            "range": f"{int(b)}-{int(b + bucket_size - 1)}",
            "count": count,
            "pct": round(count / len(scores) * 100, 2),
        })
        b += bucket_size
    return buckets


# ── Game Simulation ───────────────────────────────────────────────────────────

def _apply_rest_adjustment(base_rtg: float, rest_days: int) -> float:
    """Penalize teams on short rest (back-to-back), reward extra rest."""
    if rest_days == 0:
        return base_rtg - 2.8      # back-to-back penalty
    if rest_days == 1:
        return base_rtg - 0.6
    if rest_days >= 4:
        return base_rtg + 0.8     # well-rested bonus
    return base_rtg


def _pace_adjusted_score(off_rtg: float, def_rtg: float, pace: float) -> float:
    """
    Expected score = blend of offensive efficiency vs opponent defense,
    scaled by actual pace of play.
    """
    # League average: 110 off_rtg, 110 def_rtg, 100 pace
    eff = (off_rtg + (220 - def_rtg)) / 2
    return eff * (pace / 100)


def run_game_simulation(
    game_id: str,
    home_off_rtg: float,
    home_def_rtg: float,
    away_off_rtg: float,
    away_def_rtg: float,
    pace: float,
    home_rest: int = 1,
    away_rest: int = 1,
    iterations: int = 10000,
    sport: str = "NBA",
    # MLB extras
    home_era: Optional[float] = None,
    away_era: Optional[float] = None,
    wind_speed: Optional[float] = None,
) -> Dict[str, Any]:
    """
    Run Monte Carlo simulation for a game.
    
    NBA/NCAAMB: Normal distribution around pace-adjusted expected scores.
    MLB: Poisson distribution around run expectancy from pitcher ERA + lineup quality.
    """
    np.random.seed(None)  # fresh seed each run
    
    if sport == "MLB":
        return _run_mlb_simulation(
            game_id=game_id,
            home_off_rtg=home_off_rtg,
            away_off_rtg=away_off_rtg,
            home_era=home_era or 4.20,
            away_era=away_era or 4.20,
            wind_speed=wind_speed or 0,
            iterations=iterations,
        )
    
    # ── Basketball simulation ──────────────────────────────────────────────────
    ha = HOME_ADVANTAGE_PTS if sport == "NBA" else HOME_ADVANTAGE_NCAA
    stddev_factor = NBA_STDDEV_FACTOR

    # Adjust for rest
    adj_home_off = _apply_rest_adjustment(home_off_rtg, home_rest)
    adj_away_off = _apply_rest_adjustment(away_off_rtg, away_rest)
    adj_home_def = home_def_rtg  # defense less affected by rest
    adj_away_def = away_def_rtg

    # Expected scores
    home_expected = _pace_adjusted_score(adj_home_off, adj_away_def, pace) + ha
    away_expected = _pace_adjusted_score(adj_away_off, adj_home_def, pace)

    # Simulate
    home_stddev = home_expected * stddev_factor
    away_stddev = away_expected * stddev_factor

    home_scores = np.random.normal(home_expected, home_stddev, iterations)
    away_scores = np.random.normal(away_expected, away_stddev, iterations)
    
    # Apply small correlation (games are not independent — pace affects both)
    correlation = 0.25
    noise = np.random.normal(0, pace * 0.03, iterations)
    home_scores += noise * correlation
    away_scores += noise * correlation

    home_scores = np.maximum(home_scores, 60)
    away_scores = np.maximum(away_scores, 60)

    # Statistics
    home_wins = np.sum(home_scores > away_scores)
    totals = home_scores + away_scores
    avg_total = float(np.mean(totals))

    # Percentiles
    def ptile(arr, p):
        return int(np.percentile(arr, p))

    return {
        "game_id": game_id,
        "iterations": iterations,
        "home_win_pct": round(float(home_wins) / iterations * 100, 2),
        "away_win_pct": round((iterations - float(home_wins)) / iterations * 100, 2),
        "avg_total": round(avg_total, 2),
        "avg_home_score": round(float(np.mean(home_scores)), 2),
        "avg_away_score": round(float(np.mean(away_scores)), 2),
        "spread_cover_pct": round(float(np.mean(home_scores - away_scores > 0)) * 100, 2),
        "distribution": build_score_distribution(totals),
        "percentiles": {
            "p10": {"home": ptile(home_scores, 10), "away": ptile(away_scores, 10)},
            "p25": {"home": ptile(home_scores, 25), "away": ptile(away_scores, 25)},
            "p50": {"home": ptile(home_scores, 50), "away": ptile(away_scores, 50)},
            "p75": {"home": ptile(home_scores, 75), "away": ptile(away_scores, 75)},
            "p90": {"home": ptile(home_scores, 90), "away": ptile(away_scores, 90)},
        },
        "model_inputs": {
            "home_expected": round(home_expected, 2),
            "away_expected": round(away_expected, 2),
            "home_rest_adj": round(adj_home_off - home_off_rtg, 2),
            "away_rest_adj": round(adj_away_off - away_off_rtg, 2),
            "home_advantage": ha,
        }
    }


def _run_mlb_simulation(
    game_id: str,
    home_off_rtg: float,
    away_off_rtg: float,
    home_era: float,
    away_era: float,
    wind_speed: float,
    iterations: int,
) -> Dict[str, Any]:
    """
    MLB game simulation using Poisson run distributions.
    ERA and offense quality determine expected runs per game.
    """
    # League average ERA ~4.20, runs ~4.5 per game
    LEAGUE_AVG_ERA = 4.20
    LEAGUE_AVG_RUNS = 4.5

    # Home team scores against away pitcher (away_era)
    home_run_exp = (LEAGUE_AVG_ERA / away_era) * LEAGUE_AVG_RUNS
    away_run_exp = (LEAGUE_AVG_ERA / home_era) * LEAGUE_AVG_RUNS

    # Adjust for offense quality (off_rtg as relative to 100)
    home_run_exp *= (home_off_rtg / 100)
    away_run_exp *= (away_off_rtg / 100)

    # Wind effect on run total (blowing out +, blowing in -)
    wind_adj = wind_speed * 0.015  # ~1.5% per mph
    home_run_exp *= (1 + wind_adj)
    away_run_exp *= (1 + wind_adj)

    # Home advantage
    home_run_exp *= 1.04

    # Simulate with Poisson
    home_scores = np.random.poisson(home_run_exp, iterations).astype(float)
    away_scores = np.random.poisson(away_run_exp, iterations).astype(float)
    totals = home_scores + away_scores

    home_wins = np.sum(home_scores > away_scores)
    # For ties (rare but possible), split evenly
    ties = np.sum(home_scores == away_scores)

    def ptile(arr, p):
        return int(np.percentile(arr, p))

    return {
        "game_id": game_id,
        "iterations": iterations,
        "home_win_pct": round((float(home_wins) + float(ties) * 0.5) / iterations * 100, 2),
        "away_win_pct": round((iterations - float(home_wins) - float(ties) * 0.5) / iterations * 100, 2),
        "avg_total": round(float(np.mean(totals)), 2),
        "avg_home_score": round(float(np.mean(home_scores)), 2),
        "avg_away_score": round(float(np.mean(away_scores)), 2),
        "spread_cover_pct": round(float(np.mean(home_scores - away_scores > 1.5)) * 100, 2),
        "distribution": build_score_distribution(totals, bucket_size=2),
        "percentiles": {
            "p10": {"home": ptile(home_scores, 10), "away": ptile(away_scores, 10)},
            "p25": {"home": ptile(home_scores, 25), "away": ptile(away_scores, 25)},
            "p50": {"home": ptile(home_scores, 50), "away": ptile(away_scores, 50)},
            "p75": {"home": ptile(home_scores, 75), "away": ptile(away_scores, 75)},
            "p90": {"home": ptile(home_scores, 90), "away": ptile(away_scores, 90)},
        },
        "model_inputs": {
            "home_run_expected": round(home_run_exp, 3),
            "away_run_expected": round(away_run_exp, 3),
            "wind_adjustment": round(wind_adj, 4),
        }
    }


# ── Prop Simulation ────────────────────────────────────────────────────────────

def _build_prop_mean(
    season_avg: float,
    last5_avg: float,
    last10_avg: float,
    recency_weight: float = 0.45,
) -> float:
    """
    Weighted average of season and recent averages.
    Recency (last 5) weighted most heavily, balanced by season baseline.
    """
    w_season = 1 - recency_weight
    w_last5 = recency_weight * 0.65
    w_last10 = recency_weight * 0.35
    return season_avg * w_season + last5_avg * w_last5 + last10_avg * w_last10


def _opp_rank_adjustment(rank: Optional[int], prop_type: str) -> float:
    """
    Adjustment factor based on opponent's defensive rank vs. prop type.
    rank=1 is toughest defense, rank=30 is easiest.
    """
    if rank is None:
        return 1.0
    # Linear scale: rank 1 = -12%, rank 30 = +12%
    pct_adj = (rank - 15.5) / 15.5 * 0.12
    return 1.0 + pct_adj


def run_prop_simulation(
    player_id: str,
    prop_type: str,
    season_avg: float,
    last5_avg: float,
    last10_avg: float,
    book_line: float,
    usage_rate: Optional[float] = None,
    opponent_rank: Optional[int] = None,
    home_away: str = "home",
    rest_days: int = 1,
    player_status: str = "active",
    iterations: int = 10000,
) -> Dict[str, Any]:
    """
    Monte Carlo simulation for a player prop.
    Uses a normal distribution centered on weighted projection,
    with adjustments for matchup, rest, home/away, and player status.
    """
    np.random.seed(None)

    # Base projection
    proj_mean = _build_prop_mean(season_avg, last5_avg, last10_avg)

    # Opponent adjustment
    opp_adj = _opp_rank_adjustment(opponent_rank, prop_type)
    proj_mean *= opp_adj

    # Home/away split (small effect)
    if home_away == "away":
        proj_mean *= 0.97

    # Rest adjustment
    if rest_days == 0:
        proj_mean *= 0.94  # back-to-back
    elif rest_days >= 3:
        proj_mean *= 1.02

    # Injury status adjustment
    if player_status == "questionable":
        proj_mean *= 0.88  # expect fewer minutes
    elif player_status == "day-to-day":
        proj_mean *= 0.82

    # Standard deviation: depends on prop type
    # Points: higher variance; assists: medium; rebounds: lower
    stddev_map = {
        "points": 0.28,
        "rebounds": 0.32,
        "assists": 0.35,
        "hits": 0.55,
        "home_runs": 0.75,
        "strikeouts": 0.30,
    }
    stddev_factor = stddev_map.get(prop_type, 0.30)
    stddev = max(1.0, proj_mean * stddev_factor)

    # For discrete counting stats (hits, HRs) use negative binomial
    if prop_type in ("hits", "home_runs", "strikeouts"):
        # NegBinomial: mean = proj_mean, var > mean
        r = proj_mean ** 2 / (stddev ** 2 - proj_mean) if stddev ** 2 > proj_mean else 5
        r = max(r, 0.5)
        p_nb = r / (r + proj_mean)
        samples = np.random.negative_binomial(max(r, 0.1), min(p_nb, 0.99), iterations).astype(float)
    else:
        samples = np.random.normal(proj_mean, stddev, iterations)
        samples = np.maximum(samples, 0)

    # Calculate over/under probabilities
    over_prob = float(np.mean(samples > book_line))
    under_prob = 1.0 - over_prob

    # Fair odds (American)
    fair_over = prob_to_american(over_prob)
    fair_under = prob_to_american(under_prob)

    # Confidence score: based on sample consistency and matchup clarity
    # Higher confidence when projection is far from line, or matchup is clear
    proj_diff = abs(proj_mean - book_line) / max(book_line, 1)
    base_conf = min(50 + proj_diff * 200, 90)
    opp_conf_boost = (abs((opponent_rank or 15) - 15) / 15) * 15 if opponent_rank else 0
    confidence = min(round(base_conf + opp_conf_boost), 92)

    # Edge calculation (vs -110 standard odds)
    standard_implied = 100 / (110 + 100)  # ~0.524
    edge_over = (over_prob - standard_implied) * 100
    edge_under = (under_prob - standard_implied) * 100
    best_edge = edge_over if over_prob > 0.5 else edge_under

    return {
        "player_id": player_id,
        "prop_type": prop_type,
        "iterations": iterations,
        "projected_value": round(proj_mean, 2),
        "over_probability": round(over_prob, 4),
        "under_probability": round(under_prob, 4),
        "fair_odds_over": fair_over,
        "fair_odds_under": fair_under,
        "edge": round(best_edge, 2),
        "confidence_score": confidence,
        "model_inputs": {
            "season_avg": season_avg,
            "last5_avg": last5_avg,
            "last10_avg": last10_avg,
            "weighted_projection": round(proj_mean, 2),
            "opp_rank_adj": round(opp_adj, 4),
            "home_away_adj": 0.97 if home_away == "away" else 1.0,
            "rest_adj": 0.94 if rest_days == 0 else (1.02 if rest_days >= 3 else 1.0),
            "status_adj": 0.88 if player_status == "questionable" else (0.82 if player_status == "day-to-day" else 1.0),
            "stddev_used": round(stddev, 3),
        },
        "distribution_summary": {
            "p10": round(float(np.percentile(samples, 10)), 1),
            "p25": round(float(np.percentile(samples, 25)), 1),
            "p50": round(float(np.percentile(samples, 50)), 1),
            "p75": round(float(np.percentile(samples, 75)), 1),
            "p90": round(float(np.percentile(samples, 90)), 1),
        }
    }
