"""Tests for risk calculator processor."""

import pytest
from processors.risk_calculator import (
    RiskProfile,
    calculate_injury_score,
    calculate_consistency_score,
    calculate_floor_ceiling,
    create_risk_profile,
    AGE_THRESHOLDS,
    POSITION_RISK,
    STATUS_RISK,
)


class TestCalculateInjuryScore:
    """Tests for calculate_injury_score function."""

    def test_perfect_health_low_risk_position(self):
        """Player with full games and low-risk position has low score."""
        score = calculate_injury_score(
            games_played=(17, 17, 17),
            age=25,
            position="K",
            current_status="healthy",
        )
        # Low position risk (0.1 * 20 = 2), no missed games, no age risk
        assert score < 15

    def test_injury_prone_player(self):
        """Player missing many games has high score."""
        score = calculate_injury_score(
            games_played=(8, 10, 12),
            age=28,
            position="RB",
            current_status="healthy",
        )
        # Missed ~21 games (41% missed), high position risk (0.7), 1 year over threshold
        # Should be elevated but calculation yields around 37
        assert score > 30

    def test_old_rb_high_risk(self):
        """Old RB exceeding age threshold has elevated score."""
        score = calculate_injury_score(
            games_played=(17, 17, 17),
            age=30,
            position="RB",
            current_status="healthy",
        )
        # RB threshold is 27, so 3 years over = 9 age points
        # Plus position risk of 0.7 * 20 = 14
        assert score > 20

    def test_current_injury_adds_risk(self):
        """Player on IR has elevated score."""
        healthy = calculate_injury_score(
            games_played=(17, 17, 17),
            age=25,
            position="WR",
            current_status="healthy",
        )
        on_ir = calculate_injury_score(
            games_played=(17, 17, 17),
            age=25,
            position="WR",
            current_status="ir",
        )
        assert on_ir > healthy
        assert on_ir - healthy >= 10  # IR adds significant risk

    def test_score_capped_at_100(self):
        """Score never exceeds 100."""
        score = calculate_injury_score(
            games_played=(0, 0, 0),  # Worst possible
            age=40,
            position="RB",
            current_status="ir",
        )
        # Max score: 50 (missed games) + 14 (RB position) + 15 (13 years over 27) + 12 (IR)
        # Calculation yields ~91 which is fine - point is it doesn't exceed 100
        assert score <= 100
        assert score >= 80  # Should be high

    def test_score_never_negative(self):
        """Score is never negative."""
        score = calculate_injury_score(
            games_played=(17, 17, 17),
            age=22,
            position="K",
            current_status="healthy",
        )
        assert score >= 0


class TestCalculateConsistencyScore:
    """Tests for calculate_consistency_score function."""

    def test_perfectly_consistent_player(self):
        """Player scoring same every week has consistency of 1.0."""
        weekly = [15.0] * 17
        score = calculate_consistency_score(weekly, 17)
        assert score == 1.0

    def test_highly_variable_player(self):
        """Player with huge variance has low consistency."""
        weekly = [5.0, 30.0, 5.0, 30.0, 5.0, 30.0]
        score = calculate_consistency_score(weekly, 6)
        assert score < 0.5

    def test_no_games_played(self):
        """Player with no games returns default."""
        score = calculate_consistency_score([], 0)
        assert score == 0.5

    def test_ignores_zero_weeks(self):
        """Zero-point weeks (not played) are filtered out."""
        weekly = [15.0, 0.0, 15.0, 0.0, 15.0]
        score = calculate_consistency_score(weekly, 3)
        assert score == 1.0  # Only the 15-point weeks count


class TestCalculateFloorCeiling:
    """Tests for calculate_floor_ceiling function."""

    def test_consistent_player_narrow_range(self):
        """Consistent player has narrow floor-ceiling range."""
        floor, ceiling = calculate_floor_ceiling(
            projected_points=200.0,
            consistency_score=0.9,
            injury_score=10,
        )
        range_pct = (ceiling - floor) / 200.0
        assert range_pct < 0.4  # Less than 40% range

    def test_inconsistent_player_wide_range(self):
        """Inconsistent player has wide floor-ceiling range."""
        floor, ceiling = calculate_floor_ceiling(
            projected_points=200.0,
            consistency_score=0.3,
            injury_score=10,
        )
        range_pct = (ceiling - floor) / 200.0
        assert range_pct > 0.3  # More than 30% range

    def test_injury_risk_reduces_ceiling(self):
        """High injury risk reduces ceiling."""
        _, ceiling_healthy = calculate_floor_ceiling(200.0, 0.8, 10)
        _, ceiling_injured = calculate_floor_ceiling(200.0, 0.8, 80)
        assert ceiling_injured < ceiling_healthy

    def test_zero_projection_returns_zeros(self):
        """Zero projection returns zero floor and ceiling."""
        floor, ceiling = calculate_floor_ceiling(0.0, 0.8, 20)
        assert floor == 0.0
        assert ceiling == 0.0


class TestCreateRiskProfile:
    """Tests for create_risk_profile function."""

    def test_creates_complete_profile(self):
        """Creates RiskProfile with all fields populated."""
        profile = create_risk_profile(
            games_played=(16, 17, 15),
            age=26,
            position="WR",
            current_status="healthy",
            weekly_points=[12.0, 15.0, 8.0, 20.0, 14.0],
            projected_points=220.0,
        )

        assert isinstance(profile, RiskProfile)
        assert 0 <= profile.injury_score <= 100
        assert 0 <= profile.consistency_score <= 1
        assert profile.floor < profile.ceiling
        assert profile.games_played_history == (16, 17, 15)
        assert profile.current_status == "healthy"
        assert profile.age == 26

    def test_weekly_variance_calculated(self):
        """Weekly variance is calculated from historical data."""
        profile = create_risk_profile(
            games_played=(17, 17, 17),
            age=25,
            position="RB",
            current_status="healthy",
            weekly_points=[10.0, 12.0, 8.0, 15.0, 11.0],
            projected_points=200.0,
        )
        assert profile.weekly_variance > 0

    def test_default_variance_when_no_history(self):
        """Default variance used when no weekly data."""
        profile = create_risk_profile(
            games_played=(17, 17, 17),
            age=25,
            position="RB",
            current_status="healthy",
            weekly_points=[],
            projected_points=200.0,
        )
        # Default is 30% of projection
        assert profile.weekly_variance == 60.0
