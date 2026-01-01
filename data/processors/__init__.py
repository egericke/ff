"""Data processors for Fantasy Football pipeline."""

from processors.risk_calculator import (
    RiskProfile,
    calculate_injury_score,
    calculate_consistency_score,
    calculate_floor_ceiling,
    create_risk_profile,
)
from processors.schedule_analyzer import (
    ScheduleScore,
    matchup_rating,
    calculate_sos,
    calculate_playoff_sos,
    create_schedule_score,
)
from processors.aggregator import (
    EnhancedPlayer,
    weighted_average,
    aggregate_projections,
    export_to_json,
)

__all__ = [
    # Risk Calculator
    "RiskProfile",
    "calculate_injury_score",
    "calculate_consistency_score",
    "calculate_floor_ceiling",
    "create_risk_profile",
    # Schedule Analyzer
    "ScheduleScore",
    "matchup_rating",
    "calculate_sos",
    "calculate_playoff_sos",
    "create_schedule_score",
    # Aggregator
    "EnhancedPlayer",
    "weighted_average",
    "aggregate_projections",
    "export_to_json",
]
