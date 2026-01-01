"""Enhanced aggregator for combining multi-source projections."""

import json
from dataclasses import asdict, dataclass, field
from typing import Any, Optional

from scrapers.base import PlayerProjection
from scrapers.fantasypros import ADPData
from processors.risk_calculator import RiskProfile
from processors.schedule_analyzer import ScheduleScore


@dataclass
class EnhancedPlayer:
    """Enhanced player data combining all sources."""
    key: str
    name: str
    pos: str
    team: str
    bye: int

    # ADP from FantasyPros
    adp_std: float
    adp_half_ppr: float
    adp_ppr: float

    # Aggregated projections
    pass_yds: float = 0.0
    pass_tds: float = 0.0
    pass_ints: float = 0.0
    rush_yds: float = 0.0
    rush_tds: float = 0.0
    receptions: float = 0.0
    rec_yds: float = 0.0
    rec_tds: float = 0.0
    fumbles: float = 0.0
    two_pts: float = 0.0

    # Kicker stats
    kick_0_19: float = 0.0
    kick_20_29: float = 0.0
    kick_30_39: float = 0.0
    kick_40_49: float = 0.0
    kick_50: float = 0.0
    kick_xp: float = 0.0

    # DST stats
    dst_sacks: float = 0.0
    dst_ints: float = 0.0
    dst_fumbles: float = 0.0
    dst_tds: float = 0.0
    dst_safeties: float = 0.0
    dst_pa_per_game: float = 0.0

    # Advanced stats
    target_share: Optional[float] = None
    snap_pct: Optional[float] = None
    red_zone_targets: Optional[float] = None
    red_zone_carries: Optional[float] = None
    air_yards: Optional[float] = None
    yards_after_contact: Optional[float] = None

    # Risk profile
    injury_score: int = 30
    consistency_score: float = 0.5
    floor: float = 0.0
    ceiling: float = 0.0
    weekly_variance: float = 0.0

    # Schedule analysis
    sos_overall: float = 0.0
    sos_playoffs: float = 0.0
    schedule_adjustment: float = 0.0


# Source reliability weights
SOURCE_WEIGHTS = {
    "FantasyPros": 1.2,
    "ESPN": 1.0,
    "CBS": 0.9,
    "NFL": 0.8,
}


def weighted_average(values: list[tuple[float, float]]) -> float:
    """Calculate weighted average of values.

    Args:
        values: List of (value, weight) tuples.

    Returns:
        float: Weighted average, or 0 if no valid values.
    """
    if not values:
        return 0.0

    total_weight = sum(w for _, w in values if w > 0)
    if total_weight == 0:
        return 0.0

    weighted_sum = sum(v * w for v, w in values if w > 0)
    return round(weighted_sum / total_weight, 2)


def aggregate_projections(
    projections_by_source: dict[str, list[PlayerProjection]],
    adp_data: list[ADPData],
    risk_profiles: Optional[dict[str, RiskProfile]] = None,
    schedule_scores: Optional[dict[str, ScheduleScore]] = None,
) -> list[EnhancedPlayer]:
    """Aggregate projections from multiple sources into enhanced players.

    Args:
        projections_by_source: Dictionary of source name -> list of projections.
        adp_data: ADP data from FantasyPros.
        risk_profiles: Optional risk profiles by player key.
        schedule_scores: Optional schedule scores by team.

    Returns:
        list[EnhancedPlayer]: Aggregated player data.
    """
    # Build ADP lookup
    adp_lookup = {adp.key: adp for adp in adp_data}

    # Group projections by player key
    player_projections: dict[str, list[tuple[str, PlayerProjection]]] = {}
    for source, projs in projections_by_source.items():
        for proj in projs:
            if proj.key not in player_projections:
                player_projections[proj.key] = []
            player_projections[proj.key].append((source, proj))

    # Aggregate each player
    enhanced_players: list[EnhancedPlayer] = []

    for key, source_projs in player_projections.items():
        # Get ADP data (skip if no ADP)
        adp = adp_lookup.get(key)
        if not adp:
            continue

        # Use first projection for basic info
        _, first_proj = source_projs[0]

        # Aggregate projection fields
        player = EnhancedPlayer(
            key=key,
            name=first_proj.name,
            pos=first_proj.pos,
            team=first_proj.team,
            bye=adp.bye,
            adp_std=adp.std,
            adp_half_ppr=adp.half_ppr,
            adp_ppr=adp.ppr,
        )

        # Aggregate each stat field
        stat_fields = [
            "pass_yds", "pass_tds", "pass_ints",
            "rush_yds", "rush_tds",
            "receptions", "rec_yds", "rec_tds",
            "fumbles", "two_pts",
            "kick_0_19", "kick_20_29", "kick_30_39", "kick_40_49", "kick_50", "kick_xp",
            "dst_sacks", "dst_ints", "dst_fumbles", "dst_tds", "dst_safeties", "dst_pa_per_game",
        ]

        for field_name in stat_fields:
            values = []
            for source, proj in source_projs:
                value = getattr(proj, field_name, 0.0)
                weight = SOURCE_WEIGHTS.get(source, 1.0)
                if value > 0:
                    values.append((value, weight))
            if values:
                setattr(player, field_name, weighted_average(values))

        # Aggregate advanced stats (take first non-None)
        advanced_fields = [
            "target_share", "snap_pct", "red_zone_targets",
            "red_zone_carries", "air_yards", "yards_after_contact",
        ]
        for field_name in advanced_fields:
            for source, proj in source_projs:
                value = getattr(proj, field_name, None)
                if value is not None:
                    setattr(player, field_name, value)
                    break

        # Apply risk profile
        if risk_profiles and key in risk_profiles:
            risk = risk_profiles[key]
            player.injury_score = risk.injury_score
            player.consistency_score = risk.consistency_score
            player.floor = risk.floor
            player.ceiling = risk.ceiling
            player.weekly_variance = risk.weekly_variance

        # Apply schedule data
        if schedule_scores and first_proj.team in schedule_scores:
            schedule = schedule_scores[first_proj.team]
            player.sos_overall = schedule.sos_overall
            player.sos_playoffs = schedule.sos_playoffs
            player.schedule_adjustment = schedule.get_schedule_adjustment()

        enhanced_players.append(player)

    # Sort by standard ADP
    enhanced_players.sort(key=lambda p: p.adp_std)

    return enhanced_players


def export_to_json(players: list[EnhancedPlayer], filepath: str) -> None:
    """Export enhanced players to JSON file.

    Args:
        players: List of enhanced player data.
        filepath: Output file path.
    """
    data = [asdict(p) for p in players]
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
