"""Tests for enhanced aggregator processor."""

import json
import os
import tempfile
import pytest

from scrapers.base import PlayerProjection
from scrapers.fantasypros import ADPData
from processors.risk_calculator import RiskProfile
from processors.schedule_analyzer import ScheduleScore
from processors.aggregator import (
    EnhancedPlayer,
    weighted_average,
    aggregate_projections,
    export_to_json,
    SOURCE_WEIGHTS,
)


class TestWeightedAverage:
    """Tests for weighted_average function."""

    def test_single_value(self):
        """Single value returns that value."""
        result = weighted_average([(100.0, 1.0)])
        assert result == 100.0

    def test_equal_weights(self):
        """Equal weights give simple average."""
        result = weighted_average([(100.0, 1.0), (200.0, 1.0)])
        assert result == 150.0

    def test_different_weights(self):
        """Different weights applied correctly."""
        result = weighted_average([(100.0, 2.0), (200.0, 1.0)])
        # (100*2 + 200*1) / 3 = 400/3 = 133.33
        assert abs(result - 133.33) < 0.01

    def test_empty_list_returns_zero(self):
        """Empty list returns 0."""
        assert weighted_average([]) == 0.0

    def test_zero_weights_ignored(self):
        """Zero weights are ignored."""
        result = weighted_average([(100.0, 1.0), (999.0, 0.0)])
        assert result == 100.0


class TestAggregateProjections:
    """Tests for aggregate_projections function."""

    def create_projection(self, key: str, name: str, pos: str, team: str, **stats) -> PlayerProjection:
        """Helper to create a projection."""
        return PlayerProjection(key=key, name=name, pos=pos, team=team, **stats)

    def create_adp(self, key: str, name: str, pos: str, team: str) -> ADPData:
        """Helper to create ADP data."""
        return ADPData(
            key=key, name=name, pos=pos, team=team,
            bye=10, std=25.0, half_ppr=20.0, ppr=15.0
        )

    def test_aggregates_multiple_sources(self):
        """Combines projections from multiple sources."""
        projections = {
            "ESPN": [self.create_projection("joe-mixon-rb-cin", "Joe Mixon", "RB", "CIN", rush_yds=1000)],
            "CBS": [self.create_projection("joe-mixon-rb-cin", "Joe Mixon", "RB", "CIN", rush_yds=1100)],
        }
        adp = [self.create_adp("joe-mixon-rb-cin", "Joe Mixon", "RB", "CIN")]

        result = aggregate_projections(projections, adp)

        assert len(result) == 1
        player = result[0]
        assert player.name == "Joe Mixon"
        # Should be weighted average of 1000 (ESPN, 1.0) and 1100 (CBS, 0.9)
        # (1000*1.0 + 1100*0.9) / 1.9 = 1990/1.9 = 1047.37
        assert 1040 < player.rush_yds < 1060

    def test_skips_players_without_adp(self):
        """Players without ADP data are skipped."""
        projections = {
            "ESPN": [self.create_projection("unknown-player", "Unknown", "RB", "FA", rush_yds=500)],
        }
        adp = []  # No ADP data

        result = aggregate_projections(projections, adp)
        assert len(result) == 0

    def test_applies_risk_profile(self):
        """Risk profile is applied when provided."""
        projections = {
            "ESPN": [self.create_projection("player-1", "Player 1", "RB", "KC", rush_yds=1000)],
        }
        adp = [self.create_adp("player-1", "Player 1", "RB", "KC")]
        risk = {
            "player-1": RiskProfile(
                injury_score=45,
                consistency_score=0.75,
                floor=150.0,
                ceiling=280.0,
                weekly_variance=8.5,
                games_played_history=(16, 15, 17),
                current_status="healthy",
                age=26,
            )
        }

        result = aggregate_projections(projections, adp, risk_profiles=risk)

        player = result[0]
        assert player.injury_score == 45
        assert player.consistency_score == 0.75
        assert player.floor == 150.0
        assert player.ceiling == 280.0

    def test_applies_schedule_score(self):
        """Schedule score is applied when provided."""
        projections = {
            "ESPN": [self.create_projection("player-1", "Player 1", "WR", "KC", rec_yds=1200)],
        }
        adp = [self.create_adp("player-1", "Player 1", "WR", "KC")]
        schedules = {
            "KC": ScheduleScore(
                team="KC",
                sos_overall=-0.3,
                sos_playoffs=-0.5,
                weekly_matchups=[2] * 17,
                bye_week=10,
                dome_games=4,
            )
        }

        result = aggregate_projections(projections, adp, schedule_scores=schedules)

        player = result[0]
        assert player.sos_overall == -0.3
        assert player.sos_playoffs == -0.5
        assert player.schedule_adjustment != 0

    def test_sorted_by_adp(self):
        """Results sorted by standard ADP."""
        projections = {
            "ESPN": [
                self.create_projection("player-late", "Late Pick", "WR", "KC"),
                self.create_projection("player-early", "Early Pick", "RB", "SF"),
            ],
        }
        adp = [
            ADPData("player-late", "Late Pick", "WR", "KC", 10, 100.0, 95.0, 90.0),
            ADPData("player-early", "Early Pick", "RB", "SF", 6, 5.0, 4.0, 3.0),
        ]

        result = aggregate_projections(projections, adp)

        assert result[0].name == "Early Pick"
        assert result[1].name == "Late Pick"

    def test_uses_source_weights(self):
        """FantasyPros weighted higher than NFL."""
        # This test verifies weighting is applied correctly
        assert SOURCE_WEIGHTS["FantasyPros"] > SOURCE_WEIGHTS["NFL"]
        assert SOURCE_WEIGHTS["ESPN"] > SOURCE_WEIGHTS["CBS"]


class TestExportToJson:
    """Tests for export_to_json function."""

    def test_exports_players_to_file(self):
        """Exports player list to JSON file."""
        players = [
            EnhancedPlayer(
                key="test-player",
                name="Test Player",
                pos="RB",
                team="KC",
                bye=10,
                adp_std=25.0,
                adp_half_ppr=20.0,
                adp_ppr=15.0,
                rush_yds=1000.0,
            ),
        ]

        with tempfile.TemporaryDirectory() as tmpdir:
            filepath = os.path.join(tmpdir, "test.json")
            export_to_json(players, filepath)

            with open(filepath, "r") as f:
                data = json.load(f)

            assert len(data) == 1
            assert data[0]["name"] == "Test Player"
            assert data[0]["rush_yds"] == 1000.0

    def test_exports_empty_list(self):
        """Handles empty player list."""
        with tempfile.TemporaryDirectory() as tmpdir:
            filepath = os.path.join(tmpdir, "empty.json")
            export_to_json([], filepath)

            with open(filepath, "r") as f:
                data = json.load(f)

            assert data == []


class TestEnhancedPlayer:
    """Tests for EnhancedPlayer dataclass."""

    def test_default_values(self):
        """Default values are set correctly."""
        player = EnhancedPlayer(
            key="test",
            name="Test",
            pos="RB",
            team="KC",
            bye=10,
            adp_std=25.0,
            adp_half_ppr=20.0,
            adp_ppr=15.0,
        )

        assert player.pass_yds == 0.0
        assert player.injury_score == 30
        assert player.consistency_score == 0.5
        assert player.target_share is None
