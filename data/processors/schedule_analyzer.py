"""Schedule analyzer for strength of schedule calculations."""

from dataclasses import dataclass
from typing import Optional


@dataclass
class ScheduleScore:
    """Schedule analysis score for a team."""
    team: str
    sos_overall: float  # -1 to 1 (negative = easy, positive = hard)
    sos_playoffs: float  # -1 to 1 for weeks 14-17
    weekly_matchups: list[int]  # 1-5 rating per week
    bye_week: int
    dome_games: int

    def get_schedule_adjustment(self) -> float:
        """Get VOR adjustment based on schedule strength.

        Returns:
            float: Adjustment from -15 to +15 points.
        """
        # Combine overall and playoff SOS, weighted toward playoffs
        combined = (self.sos_overall * 0.4) + (self.sos_playoffs * 0.6)
        # Invert: harder schedule = negative, easier = positive
        adjustment = -combined * 15
        return round(adjustment, 1)


# Week weights for SOS calculation (playoffs weighted more)
WEEK_WEIGHTS = {
    1: 0.8, 2: 0.8, 3: 0.8, 4: 0.8,
    5: 1.0, 6: 1.0, 7: 1.0, 8: 1.0, 9: 1.0,
    10: 1.0, 11: 1.0, 12: 1.0, 13: 1.0,
    14: 1.5, 15: 1.5, 16: 1.5, 17: 1.5,
}


def matchup_rating(def_rank: int, is_dome: bool = False) -> int:
    """Rate a matchup from 1 (easy) to 5 (hard).

    Args:
        def_rank: Opponent's defensive rank (1=best, 32=worst).
        is_dome: Whether the game is in a dome (favorable for passing).

    Returns:
        int: Rating from 1-5.
    """
    # Convert rank to rating (1-32 → 5-1)
    if def_rank <= 6:
        rating = 5  # Elite defense
    elif def_rank <= 12:
        rating = 4  # Good defense
    elif def_rank <= 20:
        rating = 3  # Average defense
    elif def_rank <= 26:
        rating = 2  # Below average defense
    else:
        rating = 1  # Poor defense (easy matchup)

    # Dome games slightly easier for offense
    if is_dome and rating > 1:
        rating -= 1

    return rating


def calculate_sos(weekly_matchups: list[int], weights: Optional[dict[int, float]] = None) -> float:
    """Calculate overall strength of schedule.

    Args:
        weekly_matchups: List of matchup ratings (1-5) for each week.
        weights: Optional week weights (defaults to WEEK_WEIGHTS).

    Returns:
        float: SOS from -1 (easiest) to 1 (hardest).
    """
    if not weekly_matchups:
        return 0.0

    weights = weights or WEEK_WEIGHTS

    weighted_sum = 0.0
    total_weight = 0.0

    for week, rating in enumerate(weekly_matchups, 1):
        weight = weights.get(week, 1.0)
        # Convert 1-5 rating to -1 to 1 scale
        # 1 (easy) → -1, 3 (average) → 0, 5 (hard) → 1
        normalized = (rating - 3) / 2
        weighted_sum += normalized * weight
        total_weight += weight

    if total_weight == 0:
        return 0.0

    sos = weighted_sum / total_weight
    return round(max(-1.0, min(1.0, sos)), 3)


def calculate_playoff_sos(weekly_matchups: list[int]) -> float:
    """Calculate strength of schedule for playoff weeks (14-17).

    Args:
        weekly_matchups: List of matchup ratings for full season.

    Returns:
        float: Playoff SOS from -1 to 1.
    """
    if len(weekly_matchups) < 17:
        return 0.0

    playoff_weeks = weekly_matchups[13:17]  # Weeks 14-17 (0-indexed)
    if not playoff_weeks:
        return 0.0

    # Simple average for playoff weeks
    avg = sum(playoff_weeks) / len(playoff_weeks)
    # Convert to -1 to 1 scale
    sos = (avg - 3) / 2
    return round(max(-1.0, min(1.0, sos)), 3)


def create_schedule_score(
    team: str,
    weekly_matchups: list[int],
    bye_week: int,
    dome_games: int = 0,
) -> ScheduleScore:
    """Create a complete schedule score for a team.

    Args:
        team: Team abbreviation.
        weekly_matchups: List of matchup ratings (1-5) per week.
        bye_week: Team's bye week.
        dome_games: Number of games in dome stadiums.

    Returns:
        ScheduleScore: Complete schedule analysis.
    """
    sos_overall = calculate_sos(weekly_matchups)
    sos_playoffs = calculate_playoff_sos(weekly_matchups)

    return ScheduleScore(
        team=team,
        sos_overall=sos_overall,
        sos_playoffs=sos_playoffs,
        weekly_matchups=weekly_matchups,
        bye_week=bye_week,
        dome_games=dome_games,
    )
