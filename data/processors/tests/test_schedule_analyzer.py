"""Tests for schedule analyzer processor."""

import pytest
from processors.schedule_analyzer import (
    ScheduleScore,
    matchup_rating,
    calculate_sos,
    calculate_playoff_sos,
    create_schedule_score,
    WEEK_WEIGHTS,
)


class TestMatchupRating:
    """Tests for matchup_rating function."""

    def test_elite_defense_rated_5(self):
        """Top 6 defense rated as 5 (hardest)."""
        assert matchup_rating(1) == 5
        assert matchup_rating(6) == 5

    def test_poor_defense_rated_1(self):
        """Bottom 6 defense rated as 1 (easiest)."""
        assert matchup_rating(27) == 1
        assert matchup_rating(32) == 1

    def test_average_defense_rated_3(self):
        """Mid-range defense rated as 3."""
        assert matchup_rating(15) == 3
        assert matchup_rating(20) == 3

    def test_dome_reduces_rating(self):
        """Dome games reduce difficulty by 1."""
        regular = matchup_rating(10)
        dome = matchup_rating(10, is_dome=True)
        assert dome == regular - 1

    def test_dome_minimum_rating_is_1(self):
        """Dome can't reduce rating below 1."""
        assert matchup_rating(32, is_dome=True) == 1


class TestCalculateSos:
    """Tests for calculate_sos function."""

    def test_easy_schedule(self):
        """All easy matchups results in negative SOS."""
        weekly = [1] * 17  # All easy matchups
        sos = calculate_sos(weekly)
        assert sos < 0
        assert sos == -1.0

    def test_hard_schedule(self):
        """All hard matchups results in positive SOS."""
        weekly = [5] * 17  # All hard matchups
        sos = calculate_sos(weekly)
        assert sos > 0
        assert sos == 1.0

    def test_average_schedule(self):
        """Average matchups results in SOS near 0."""
        weekly = [3] * 17
        sos = calculate_sos(weekly)
        assert sos == 0.0

    def test_empty_schedule_returns_zero(self):
        """Empty schedule returns 0."""
        assert calculate_sos([]) == 0.0

    def test_playoff_weeks_weighted_more(self):
        """Playoff weeks have higher weight."""
        # Playoff weeks (14-17) have weight 1.5, regular season varies
        # Verify the weights are applied correctly
        assert WEEK_WEIGHTS[14] > WEEK_WEIGHTS[5]  # Playoffs weighted higher
        assert WEEK_WEIGHTS[15] == 1.5
        assert WEEK_WEIGHTS[5] == 1.0


class TestCalculatePlayoffSos:
    """Tests for calculate_playoff_sos function."""

    def test_easy_playoff_schedule(self):
        """Easy playoff matchups return negative SOS."""
        weekly = [3] * 13 + [1, 1, 1, 1]  # Easy weeks 14-17
        sos = calculate_playoff_sos(weekly)
        assert sos == -1.0

    def test_hard_playoff_schedule(self):
        """Hard playoff matchups return positive SOS."""
        weekly = [3] * 13 + [5, 5, 5, 5]  # Hard weeks 14-17
        sos = calculate_playoff_sos(weekly)
        assert sos == 1.0

    def test_short_schedule_returns_zero(self):
        """Schedule shorter than 17 weeks returns 0."""
        weekly = [3] * 10
        assert calculate_playoff_sos(weekly) == 0.0


class TestScheduleScore:
    """Tests for ScheduleScore dataclass."""

    def test_easy_schedule_positive_adjustment(self):
        """Easy schedule gives positive VOR adjustment."""
        score = ScheduleScore(
            team="KC",
            sos_overall=-0.8,
            sos_playoffs=-0.9,
            weekly_matchups=[1] * 17,
            bye_week=10,
            dome_games=4,
        )
        adj = score.get_schedule_adjustment()
        assert adj > 0
        assert adj <= 15

    def test_hard_schedule_negative_adjustment(self):
        """Hard schedule gives negative VOR adjustment."""
        score = ScheduleScore(
            team="MIA",
            sos_overall=0.7,
            sos_playoffs=0.8,
            weekly_matchups=[5] * 17,
            bye_week=11,
            dome_games=0,
        )
        adj = score.get_schedule_adjustment()
        assert adj < 0
        assert adj >= -15

    def test_neutral_schedule_no_adjustment(self):
        """Neutral schedule gives near-zero adjustment."""
        score = ScheduleScore(
            team="DAL",
            sos_overall=0.0,
            sos_playoffs=0.0,
            weekly_matchups=[3] * 17,
            bye_week=7,
            dome_games=8,
        )
        adj = score.get_schedule_adjustment()
        assert abs(adj) < 1


class TestCreateScheduleScore:
    """Tests for create_schedule_score function."""

    def test_creates_complete_score(self):
        """Creates ScheduleScore with all fields."""
        weekly = [2, 3, 4, 2, 3, 4, 2, 3, 4, 2, 3, 4, 2, 3, 4, 2, 3]
        score = create_schedule_score(
            team="KC",
            weekly_matchups=weekly,
            bye_week=10,
            dome_games=4,
        )

        assert score.team == "KC"
        assert score.bye_week == 10
        assert score.dome_games == 4
        assert len(score.weekly_matchups) == 17
        assert -1 <= score.sos_overall <= 1
        assert -1 <= score.sos_playoffs <= 1

    def test_playoff_sos_calculated(self):
        """Playoff SOS is calculated from weeks 14-17."""
        # Easy playoffs
        weekly = [3] * 13 + [1, 1, 1, 1]
        score = create_schedule_score("BUF", weekly, 7)
        assert score.sos_playoffs < 0
