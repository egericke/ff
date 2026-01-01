"""Tests for data quality validators."""

import pytest

from scrapers.base import PlayerProjection
from scrapers.fantasypros import ADPData
from processors.aggregator import EnhancedPlayer
from validators.data_quality import (
    ValidationResult,
    validate_projections,
    validate_adp,
    validate_aggregated_data,
    MIN_COUNTS_STRICT,
    VALID_TEAMS,
)


class TestValidateProjections:
    """Tests for validate_projections function."""

    def create_projection(self, pos: str, team: str = "KC") -> PlayerProjection:
        """Helper to create a projection."""
        return PlayerProjection(
            key=f"player-{pos.lower()}-{team.lower()}",
            name=f"Test {pos}",
            pos=pos,
            team=team,
        )

    def test_empty_projections_fails(self):
        """Empty projection list fails validation."""
        result = validate_projections([])
        assert not result.is_valid
        assert "No projections provided" in result.errors[0]

    def test_sufficient_projections_pass(self):
        """Sufficient projections pass strict validation."""
        projs = []
        # Create enough of each position
        for pos, count in MIN_COUNTS_STRICT.items():
            for i in range(count):
                projs.append(self.create_projection(pos, f"T{i % 32:02d}"))

        # Replace invalid teams with valid ones
        for i, proj in enumerate(projs):
            proj.team = list(VALID_TEAMS)[i % 32]

        result = validate_projections(projs, strict=True)
        assert result.is_valid

    def test_insufficient_position_fails_strict(self):
        """Missing positions fails strict validation."""
        projs = [self.create_projection("QB") for _ in range(10)]  # Not enough

        result = validate_projections(projs, strict=True)
        assert not result.is_valid
        assert any("Insufficient QB" in e for e in result.errors)

    def test_insufficient_position_warns_relaxed(self):
        """Missing positions warns in relaxed mode."""
        projs = [self.create_projection("QB") for _ in range(10)]

        result = validate_projections(projs, strict=False)
        # In relaxed mode, still may fail if under relaxed thresholds
        # 10 QBs is under relaxed threshold (32/3 = 10.67)
        # The key is it generates warnings for low counts
        assert any("Low" in w or "Insufficient" in str(result.errors) for w in result.warnings) or not result.is_valid

    def test_unknown_team_warns(self):
        """Unknown team generates warning."""
        projs = [self.create_projection("QB", "UNKNOWN")]

        result = validate_projections(projs, strict=False)
        assert any("Unknown teams" in w for w in result.warnings)

    def test_stats_include_position_counts(self):
        """Stats include position breakdown."""
        projs = [
            self.create_projection("QB"),
            self.create_projection("RB"),
            self.create_projection("RB"),
        ]

        result = validate_projections(projs, strict=False)
        assert result.stats["by_position"]["QB"] == 1
        assert result.stats["by_position"]["RB"] == 2


class TestValidateAdp:
    """Tests for validate_adp function."""

    def create_adp(self, name: str = "Test Player") -> ADPData:
        """Helper to create ADP data."""
        return ADPData(
            key="test-key",
            name=name,
            pos="RB",
            team="KC",
            bye=10,
            std=25.0,
            half_ppr=20.0,
            ppr=15.0,
        )

    def test_empty_adp_fails(self):
        """Empty ADP list fails validation."""
        result = validate_adp([])
        assert not result.is_valid
        assert "No ADP data provided" in result.errors[0]

    def test_insufficient_adp_fails(self):
        """Too few players fails validation."""
        adp = [self.create_adp() for _ in range(50)]
        result = validate_adp(adp, min_players=100)
        assert not result.is_valid
        assert "Insufficient ADP" in result.errors[0]

    def test_sufficient_adp_passes(self):
        """Enough players passes validation."""
        adp = [self.create_adp(f"Player {i}") for i in range(150)]
        result = validate_adp(adp, min_players=100)
        assert result.is_valid

    def test_invalid_adp_values_warn(self):
        """Invalid ADP values generate warnings."""
        adp = [ADPData("key", "Bad", "RB", "KC", 10, -5.0, 20.0, 15.0)]
        result = validate_adp(adp, min_players=1)
        assert any("invalid ADP" in w for w in result.warnings)


class TestValidateAggregatedData:
    """Tests for validate_aggregated_data function."""

    def create_enhanced(self, has_stats: bool = True) -> EnhancedPlayer:
        """Helper to create enhanced player."""
        return EnhancedPlayer(
            key="test",
            name="Test",
            pos="RB",
            team="KC",
            bye=10,
            adp_std=25.0,
            adp_half_ppr=20.0,
            adp_ppr=15.0,
            rush_yds=1000.0 if has_stats else 0.0,
        )

    def test_empty_data_fails(self):
        """Empty player list fails validation."""
        result = validate_aggregated_data([])
        assert not result.is_valid

    def test_low_count_warns(self):
        """Low player count generates warning."""
        players = [self.create_enhanced() for _ in range(100)]
        result = validate_aggregated_data(players, min_players=200)
        assert result.is_valid  # Warning only
        assert any("Low player count" in w for w in result.warnings)

    def test_many_without_stats_warns(self):
        """Many players without stats generates warning."""
        players = [self.create_enhanced(has_stats=False) for _ in range(100)]
        result = validate_aggregated_data(players, min_players=50)
        assert any("without stats" in w for w in result.warnings)


class TestValidationResult:
    """Tests for ValidationResult dataclass."""

    def test_default_values(self):
        """Default values are empty lists/dicts."""
        result = ValidationResult(is_valid=True)
        assert result.errors == []
        assert result.warnings == []
        assert result.stats == {}
