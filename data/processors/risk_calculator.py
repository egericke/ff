"""Risk calculator for player injury and consistency scoring."""

from dataclasses import dataclass
from typing import Optional


@dataclass
class RiskProfile:
    """Risk profile for a player."""
    injury_score: int  # 0-100, higher = more risky
    consistency_score: float  # 0-1, higher = more consistent
    floor: float
    ceiling: float
    weekly_variance: float
    games_played_history: tuple[int, int, int]  # Last 3 seasons
    current_status: str  # 'healthy', 'questionable', 'out', 'injured', 'ir'
    age: Optional[int] = None


# Age thresholds by position (when players start declining)
AGE_THRESHOLDS = {
    "QB": 35,
    "RB": 27,
    "WR": 30,
    "TE": 30,
    "K": 38,
    "DST": 99,  # DST doesn't age
}

# Position risk factors (RBs get hurt more)
POSITION_RISK = {
    "QB": 0.2,
    "RB": 0.7,
    "WR": 0.4,
    "TE": 0.5,
    "K": 0.1,
    "DST": 0.1,
}

# Injury status risk multipliers
STATUS_RISK = {
    "healthy": 0.0,
    "questionable": 0.3,
    "out": 0.5,
    "injured": 0.5,
    "ir": 0.8,
}


def calculate_injury_score(
    games_played: tuple[int, int, int],
    age: Optional[int],
    position: str,
    current_status: str,
) -> int:
    """Calculate injury risk score (0-100, higher = more risky).

    Args:
        games_played: Games played in last 3 seasons (most recent first).
        age: Player's age (optional).
        position: Player's position.
        current_status: Current injury status.

    Returns:
        int: Injury risk score from 0-100.
    """
    # Base injury score from games missed
    total_games = sum(games_played)
    max_games = 17 * 3  # 51 games over 3 seasons
    games_missed_pct = 1 - (total_games / max_games) if max_games > 0 else 0
    base_score = games_missed_pct * 50  # Up to 50 points from missed games

    # Position risk adjustment (0-20 points)
    pos_risk = POSITION_RISK.get(position, 0.3)
    pos_score = pos_risk * 20

    # Age risk adjustment (0-15 points)
    age_score = 0
    if age is not None:
        threshold = AGE_THRESHOLDS.get(position, 30)
        if age > threshold:
            years_over = age - threshold
            age_score = min(years_over * 3, 15)

    # Current status adjustment (0-15 points)
    status_score = STATUS_RISK.get(current_status.lower(), 0.0) * 15

    # Total score capped at 100
    total = int(base_score + pos_score + age_score + status_score)
    return min(max(total, 0), 100)


def calculate_consistency_score(
    weekly_points: list[float],
    games_played: int,
) -> float:
    """Calculate consistency score (0-1, higher = more consistent).

    Args:
        weekly_points: List of weekly point totals.
        games_played: Number of games actually played.

    Returns:
        float: Consistency score from 0-1.
    """
    if games_played == 0 or len(weekly_points) == 0:
        return 0.5  # Default for unknown

    # Filter out zeros (games not played)
    active_weeks = [p for p in weekly_points if p > 0]
    if len(active_weeks) < 2:
        return 0.5

    # Calculate coefficient of variation
    mean = sum(active_weeks) / len(active_weeks)
    if mean == 0:
        return 0.5

    variance = sum((x - mean) ** 2 for x in active_weeks) / len(active_weeks)
    std_dev = variance ** 0.5
    cv = std_dev / mean

    # Convert CV to consistency score (lower CV = higher consistency)
    # CV of 0 = perfect consistency (1.0)
    # CV of 1.0 = low consistency (0.0)
    consistency = max(0.0, min(1.0, 1.0 - cv))
    return round(consistency, 3)


def calculate_floor_ceiling(
    projected_points: float,
    consistency_score: float,
    injury_score: int,
) -> tuple[float, float]:
    """Calculate floor and ceiling projections.

    Args:
        projected_points: Season projection in points.
        consistency_score: Player's consistency (0-1).
        injury_score: Player's injury risk (0-100).

    Returns:
        tuple[float, float]: (floor, ceiling) projections.
    """
    if projected_points <= 0:
        return (0.0, 0.0)

    # Variance factor based on consistency (inconsistent = wider range)
    variance_factor = 0.1 + (1 - consistency_score) * 0.25

    # Injury risk reduces upside
    injury_factor = 1 - (injury_score / 100) * 0.2

    ceiling = projected_points * (1 + variance_factor) * injury_factor
    floor = projected_points * (1 - variance_factor)

    return (round(floor, 1), round(ceiling, 1))


def create_risk_profile(
    games_played: tuple[int, int, int],
    age: Optional[int],
    position: str,
    current_status: str,
    weekly_points: list[float],
    projected_points: float,
) -> RiskProfile:
    """Create a complete risk profile for a player.

    Args:
        games_played: Games played in last 3 seasons.
        age: Player's age.
        position: Player's position.
        current_status: Current injury status.
        weekly_points: Historical weekly point totals.
        projected_points: Season projection.

    Returns:
        RiskProfile: Complete risk assessment.
    """
    injury_score = calculate_injury_score(
        games_played, age, position, current_status
    )

    total_games = sum(games_played)
    consistency_score = calculate_consistency_score(weekly_points, total_games)

    floor, ceiling = calculate_floor_ceiling(
        projected_points, consistency_score, injury_score
    )

    # Calculate weekly variance
    active_weeks = [p for p in weekly_points if p > 0]
    if len(active_weeks) >= 2:
        mean = sum(active_weeks) / len(active_weeks)
        variance = sum((x - mean) ** 2 for x in active_weeks) / len(active_weeks)
        weekly_variance = round(variance ** 0.5, 2)
    else:
        weekly_variance = projected_points * 0.3  # Default 30% variance

    return RiskProfile(
        injury_score=injury_score,
        consistency_score=consistency_score,
        floor=floor,
        ceiling=ceiling,
        weekly_variance=weekly_variance,
        games_played_history=games_played,
        current_status=current_status,
        age=age,
    )
