# python_service/models/feature_engine.py
"""
Feature engineering for AlphaEdge prediction models.

Converts raw stats + context signals into normalized feature vectors
suitable for model inference and explainability output.
"""

from typing import Dict, Any, Optional, List
import math


# ── League normalization constants ─────────────────────────────────────────────
LEAGUE_AVERAGES = {
    "NBA": {
        "off_rtg": 113.5,
        "def_rtg": 113.5,
        "pace": 99.2,
        "home_advantage": 3.1,
    },
    "NCAAMB": {
        "off_rtg": 106.0,
        "def_rtg": 106.0,
        "pace": 69.5,
        "home_advantage": 4.8,
    },
    "MLB": {
        "runs_per_game": 4.5,
        "era_avg": 4.20,
        "ops_avg": 0.730,
    },
}


# ── Helpers ────────────────────────────────────────────────────────────────────

def _zscore(val: float, mean: float, std: float) -> float:
    """Normalize a value to z-score."""
    if std == 0:
        return 0.0
    return (val - mean) / std


def _rolling_trend(values: List[float]) -> float:
    """
    Compute simple linear trend coefficient from a list of values.
    Positive = improving, negative = declining.
    """
    if len(values) < 2:
        return 0.0
    n = len(values)
    x_mean = (n - 1) / 2
    y_mean = sum(values) / n
    num = sum((i - x_mean) * (v - y_mean) for i, v in enumerate(values))
    den = sum((i - x_mean) ** 2 for i in range(n))
    return num / den if den != 0 else 0.0


def _form_score(last5: List[float], season_avg: float) -> float:
    """
    Compare recent form to season baseline.
    Returns value in [-1, 1] range.
    """
    if not last5 or season_avg == 0:
        return 0.0
    recent_avg = sum(last5) / len(last5)
    pct_diff = (recent_avg - season_avg) / season_avg
    return max(-1.0, min(1.0, pct_diff * 2))


def _net_rtg_edge(
    home_off: float, home_def: float,
    away_off: float, away_def: float,
    sport: str = "NBA",
) -> float:
    """
    Calculate net rating edge for home team.
    Positive = home team is the stronger team on both ends.
    """
    avg = LEAGUE_AVERAGES.get(sport, LEAGUE_AVERAGES["NBA"])
    home_net = home_off - home_def
    away_net = away_off - away_def
    league_net = avg["off_rtg"] - avg["def_rtg"]  # usually 0
    return (home_net - away_net) - league_net


# ── Game Feature Builder ───────────────────────────────────────────────────────

def build_game_features(
    home_stats: Dict[str, Any],
    away_stats: Dict[str, Any],
    news_signals: Dict[str, Any],
    sentiment: Dict[str, float],
    sport: str = "NBA",
) -> Dict[str, Any]:
    """
    Build a comprehensive feature dictionary for game-level prediction.
    All features are documented and explainable.
    """
    avg = LEAGUE_AVERAGES.get(sport, LEAGUE_AVERAGES["NBA"])

    # ── Efficiency features ────────────────────────────────────────────────────
    home_off = home_stats.get("offensive_rating", avg["off_rtg"])
    home_def = home_stats.get("defensive_rating", avg["def_rtg"])
    away_off = away_stats.get("offensive_rating", avg["off_rtg"])
    away_def = away_stats.get("defensive_rating", avg["def_rtg"])
    pace = home_stats.get("pace", avg.get("pace", 100))

    net_edge = _net_rtg_edge(home_off, home_def, away_off, away_def, sport)

    # ── Rest & travel ──────────────────────────────────────────────────────────
    home_rest = home_stats.get("rest_days", 1)
    away_rest = away_stats.get("rest_days", 1)
    rest_diff = home_rest - away_rest  # positive = home better rested

    # Back-to-back penalty
    home_b2b = 1 if home_rest == 0 else 0
    away_b2b = 1 if away_rest == 0 else 0

    # ── Form ───────────────────────────────────────────────────────────────────
    home_last5 = home_stats.get("last5_net_rtg", [])
    away_last5 = away_stats.get("last5_net_rtg", [])
    home_trend = _rolling_trend(home_last5) if home_last5 else 0.0
    away_trend = _rolling_trend(away_last5) if away_last5 else 0.0

    # ── Injuries ───────────────────────────────────────────────────────────────
    home_injuries = home_stats.get("injuries", [])
    away_injuries = away_stats.get("injuries", [])
    home_inj_impact = home_stats.get("injury_point_impact", 0.0)
    away_inj_impact = away_stats.get("injury_point_impact", 0.0)

    # ── Sentiment & news ───────────────────────────────────────────────────────
    home_sentiment = sentiment.get("home", 0.0)
    away_sentiment = sentiment.get("away", 0.0)
    injury_flag = news_signals.get("injury_concern", False)
    momentum_flag = news_signals.get("momentum", None)

    # ── ATS / totals history ────────────────────────────────────────────────────
    home_ats_pct = home_stats.get("ats_pct_season", 0.5)
    away_ats_pct = away_stats.get("ats_pct_season", 0.5)
    home_over_pct = home_stats.get("over_pct_season", 0.5)
    away_over_pct = away_stats.get("over_pct_season", 0.5)

    features = {
        # Efficiency
        "net_rtg_edge": round(net_edge, 3),
        "home_off_rtg_vs_avg": round(home_off - avg["off_rtg"], 3),
        "home_def_rtg_vs_avg": round(avg["def_rtg"] - home_def, 3),  # inverted: higher = better
        "away_off_rtg_vs_avg": round(away_off - avg["off_rtg"], 3),
        "away_def_rtg_vs_avg": round(avg["def_rtg"] - away_def, 3),
        "pace_vs_avg": round(pace - avg.get("pace", 100), 3),

        # Rest
        "rest_differential": rest_diff,
        "home_back_to_back": home_b2b,
        "away_back_to_back": away_b2b,

        # Form
        "home_trend": round(home_trend, 4),
        "away_trend": round(away_trend, 4),
        "form_edge": round(home_trend - away_trend, 4),

        # Injuries
        "home_injury_point_impact": round(home_inj_impact, 2),
        "away_injury_point_impact": round(away_inj_impact, 2),
        "injury_net_impact": round(away_inj_impact - home_inj_impact, 2),

        # Sentiment
        "home_sentiment": round(home_sentiment, 3),
        "away_sentiment": round(away_sentiment, 3),
        "sentiment_edge": round(home_sentiment - away_sentiment, 3),

        # Betting history
        "home_ats_pct": home_ats_pct,
        "away_ats_pct": away_ats_pct,
        "home_over_pct": home_over_pct,
        "away_over_pct": away_over_pct,

        # Meta
        "sport": sport,
        "home_advantage": avg.get("home_advantage", 3.1),
    }

    return features


# ── Prop Feature Builder ───────────────────────────────────────────────────────

def build_prop_features(
    season_avg: float,
    last5_avg: float,
    last10_avg: float,
    last5_values: Optional[List[float]] = None,
    prop_type: str = "points",
    book_line: float = 0,
    usage_rate: Optional[float] = None,
    opponent_rank: Optional[int] = None,
    home_away: str = "home",
    rest_days: int = 1,
    player_status: str = "active",
    minutes_expected: Optional[float] = None,
    season_minutes_avg: Optional[float] = None,
) -> Dict[str, Any]:
    """
    Build a comprehensive feature dict for a player prop prediction.
    """
    # Recency-weighted projection
    w_season = 0.35
    w_l10 = 0.25
    w_l5 = 0.40
    weighted_proj = season_avg * w_season + last10_avg * w_l10 + last5_avg * w_l5

    # Form
    form_score = _form_score(last5_values or [], season_avg)
    trend = _rolling_trend(last5_values or []) if last5_values else 0.0

    # Line distance
    proj_vs_line = weighted_proj - book_line
    line_pct_diff = proj_vs_line / max(book_line, 0.1)

    # Opponent
    opp_adj = (opponent_rank or 15 - 15) / 15 if opponent_rank else 0.0  # -1 to +1

    # Minutes efficiency
    min_adj = 1.0
    if minutes_expected and season_minutes_avg and season_minutes_avg > 0:
        min_adj = minutes_expected / season_minutes_avg

    # Status penalty
    status_adj = {
        "active": 1.0,
        "questionable": 0.88,
        "day-to-day": 0.82,
        "out": 0.0,
    }.get(player_status, 1.0)

    features = {
        "prop_type": prop_type,
        "season_avg": season_avg,
        "last5_avg": last5_avg,
        "last10_avg": last10_avg,
        "weighted_projection": round(weighted_proj, 3),
        "form_score": round(form_score, 4),
        "trend_coefficient": round(trend, 5),
        "proj_vs_line": round(proj_vs_line, 3),
        "proj_pct_vs_line": round(line_pct_diff, 4),
        "book_line": book_line,
        "opponent_rank_percentile": round((31 - (opponent_rank or 15)) / 30, 4),
        "opponent_adjustment": round(opp_adj, 4),
        "home_away": 1.0 if home_away == "home" else 0.0,
        "rest_days": rest_days,
        "rest_b2b": 1 if rest_days == 0 else 0,
        "usage_rate": usage_rate or 0,
        "minutes_adjustment": round(min_adj, 4),
        "status_adjustment": status_adj,
        "player_status": player_status,
    }

    return features


# ── Explainability ─────────────────────────────────────────────────────────────

def explain_prop_prediction(
    features: Dict[str, Any],
    projected_value: float,
    book_line: float,
    over_prob: float,
) -> List[Dict[str, Any]]:
    """
    Generate human-readable factor explanations from a feature dict.
    Returns sorted list of factors by impact magnitude.
    """
    factors = []

    # Trend
    if abs(features.get("form_score", 0)) > 0.1:
        form = features["form_score"]
        direction = "positive" if form > 0 else "negative"
        impact = "high" if abs(form) > 0.2 else "medium"
        factors.append({
            "label": "Recent Form",
            "impact": impact,
            "direction": direction,
            "value": f"{'+' if form > 0 else ''}{form*100:.1f}% vs season avg",
            "description": f"Player is {'above' if form > 0 else 'below'} their season average by {abs(form)*100:.0f}% over the last 5 games",
        })

    # Opponent
    if features.get("opponent_rank_percentile", 0.5) != 0.5:
        opp_pct = features["opponent_rank_percentile"]
        direction = "negative" if opp_pct > 0.6 else "positive"  # harder defense = negative
        factors.append({
            "label": "Matchup Quality",
            "impact": "high" if abs(opp_pct - 0.5) > 0.3 else "medium",
            "direction": direction,
            "description": f"Opponent ranks in {'top' if opp_pct > 0.6 else 'bottom'} third defensively vs this position",
        })

    # Rest
    if features.get("rest_b2b", 0) == 1:
        factors.append({
            "label": "Back-to-Back",
            "impact": "medium",
            "direction": "negative",
            "value": "0 rest days",
            "description": "Player is on a back-to-back — historically reduces output by 6-8%",
        })

    # Status
    if features.get("player_status", "active") != "active":
        factors.append({
            "label": "Player Status",
            "impact": "high",
            "direction": "negative",
            "value": features["player_status"].upper(),
            "description": "Player is not at full health — expected minute reduction",
        })

    # Projection vs line
    proj_diff = features.get("proj_pct_vs_line", 0)
    if abs(proj_diff) > 0.08:
        direction = "positive" if proj_diff > 0 else "negative"
        factors.append({
            "label": "Projection vs Line",
            "impact": "high" if abs(proj_diff) > 0.15 else "medium",
            "direction": direction,
            "value": f"{projected_value:.1f} proj vs {book_line} line",
            "description": f"Model projects {abs(proj_diff)*100:.0f}% {'above' if proj_diff > 0 else 'below'} the book line",
        })

    # Sort by impact
    impact_order = {"high": 0, "medium": 1, "low": 2}
    factors.sort(key=lambda x: impact_order.get(x["impact"], 2))

    return factors
