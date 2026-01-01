"""Data quality validation for Fantasy Football pipeline."""

from dataclasses import dataclass, field
from typing import Any

from scrapers.base import PlayerProjection
from scrapers.fantasypros import ADPData
from processors.aggregator import EnhancedPlayer


@dataclass
class ValidationResult:
    """Result of a validation check."""
    is_valid: bool
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    stats: dict[str, Any] = field(default_factory=dict)


# Minimum player counts by position (strict mode)
MIN_COUNTS_STRICT = {
    "QB": 32,
    "RB": 64,
    "WR": 64,
    "TE": 28,
    "K": 15,
    "DST": 32,
}

# Relaxed minimum counts (for partial scrapes)
MIN_COUNTS_RELAXED = {k: v // 3 for k, v in MIN_COUNTS_STRICT.items()}

# Valid NFL teams
VALID_TEAMS = {
    "ARI", "ATL", "BAL", "BUF", "CAR", "CHI", "CIN", "CLE",
    "DAL", "DEN", "DET", "GB", "HOU", "IND", "JAX", "KC",
    "LAC", "LAR", "LV", "MIA", "MIN", "NE", "NO", "NYG",
    "NYJ", "PHI", "PIT", "SEA", "SF", "TB", "TEN", "WAS",
}


def validate_projections(
    projections: list[PlayerProjection],
    strict: bool = True,
) -> ValidationResult:
    """Validate a list of player projections.

    Args:
        projections: List of projections to validate.
        strict: Use strict minimum counts if True.

    Returns:
        ValidationResult: Validation result with errors and warnings.
    """
    errors = []
    warnings = []
    stats: dict[str, Any] = {"total": len(projections), "by_position": {}}

    if not projections:
        errors.append("No projections provided")
        return ValidationResult(False, errors, warnings, stats)

    # Count by position
    position_counts: dict[str, int] = {}
    invalid_teams: set[str] = set()
    invalid_positions: set[str] = set()

    for proj in projections:
        pos = proj.pos
        position_counts[pos] = position_counts.get(pos, 0) + 1

        # Check for valid team
        if proj.team not in VALID_TEAMS:
            invalid_teams.add(proj.team)

        # Check for valid position
        if pos not in MIN_COUNTS_STRICT:
            invalid_positions.add(pos)

    stats["by_position"] = position_counts

    # Check minimum counts
    min_counts = MIN_COUNTS_STRICT if strict else MIN_COUNTS_RELAXED
    for pos, min_count in min_counts.items():
        actual = position_counts.get(pos, 0)
        if actual < min_count:
            if strict:
                errors.append(f"Insufficient {pos}: {actual} < {min_count}")
            else:
                warnings.append(f"Low {pos} count: {actual} < {min_count}")

    # Check for invalid teams
    if invalid_teams:
        warnings.append(f"Unknown teams: {', '.join(sorted(invalid_teams))}")

    # Check for invalid positions
    if invalid_positions:
        warnings.append(f"Unknown positions: {', '.join(sorted(invalid_positions))}")

    is_valid = len(errors) == 0
    return ValidationResult(is_valid, errors, warnings, stats)


def validate_adp(
    adp_data: list[ADPData],
    min_players: int = 100,
) -> ValidationResult:
    """Validate ADP data.

    Args:
        adp_data: List of ADP data to validate.
        min_players: Minimum number of players required.

    Returns:
        ValidationResult: Validation result.
    """
    errors = []
    warnings = []
    stats: dict[str, Any] = {"total": len(adp_data)}

    if not adp_data:
        errors.append("No ADP data provided")
        return ValidationResult(False, errors, warnings, stats)

    if len(adp_data) < min_players:
        errors.append(f"Insufficient ADP data: {len(adp_data)} < {min_players}")

    # Check for reasonable ADP values
    invalid_adp = []
    for adp in adp_data:
        if adp.std <= 0 or adp.std > 500:
            invalid_adp.append(adp.name)
        if adp.half_ppr <= 0 or adp.half_ppr > 500:
            invalid_adp.append(adp.name)
        if adp.ppr <= 0 or adp.ppr > 500:
            invalid_adp.append(adp.name)

    if invalid_adp:
        unique = list(set(invalid_adp))[:5]
        warnings.append(f"Players with invalid ADP: {', '.join(unique)}")

    # Count by position
    position_counts: dict[str, int] = {}
    for adp in adp_data:
        pos = adp.pos
        position_counts[pos] = position_counts.get(pos, 0) + 1
    stats["by_position"] = position_counts

    is_valid = len(errors) == 0
    return ValidationResult(is_valid, errors, warnings, stats)


def validate_aggregated_data(
    players: list[EnhancedPlayer],
    min_players: int = 200,
) -> ValidationResult:
    """Validate aggregated player data.

    Args:
        players: List of enhanced players to validate.
        min_players: Minimum number of players required.

    Returns:
        ValidationResult: Validation result.
    """
    errors = []
    warnings = []
    stats: dict[str, Any] = {"total": len(players)}

    if not players:
        errors.append("No aggregated player data")
        return ValidationResult(False, errors, warnings, stats)

    if len(players) < min_players:
        warnings.append(f"Low player count: {len(players)} < {min_players}")

    # Count by position
    position_counts: dict[str, int] = {}
    for player in players:
        pos = player.pos
        position_counts[pos] = position_counts.get(pos, 0) + 1
    stats["by_position"] = position_counts

    # Check for players with projections
    players_with_stats = 0
    for player in players:
        has_stats = (
            player.pass_yds > 0 or
            player.rush_yds > 0 or
            player.rec_yds > 0 or
            player.dst_sacks > 0 or
            player.kick_xp > 0
        )
        if has_stats:
            players_with_stats += 1

    stats["players_with_stats"] = players_with_stats
    if players_with_stats < len(players) * 0.9:
        warnings.append(
            f"Many players without stats: {len(players) - players_with_stats}"
        )

    is_valid = len(errors) == 0
    return ValidationResult(is_valid, errors, warnings, stats)
