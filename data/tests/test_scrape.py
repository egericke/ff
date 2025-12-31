"""Tests for scrape.py validation function."""

import sys
from unittest.mock import MagicMock

import pytest
import pandas as pd

# Mock selenium and webdriver_manager before importing scrape
mock_webdriver = MagicMock()
mock_service = MagicMock()
mock_chromedriver_manager = MagicMock()

sys.modules['selenium'] = MagicMock()
sys.modules['selenium.webdriver'] = mock_webdriver
sys.modules['selenium.webdriver.common'] = MagicMock()
sys.modules['selenium.webdriver.common.action_chains'] = MagicMock()
sys.modules['selenium.webdriver.common.by'] = MagicMock()
sys.modules['selenium.webdriver.common.keys'] = MagicMock()
sys.modules['selenium.webdriver.chrome'] = MagicMock()
sys.modules['selenium.webdriver.chrome.service'] = mock_service
sys.modules['webdriver_manager'] = MagicMock()
sys.modules['webdriver_manager.chrome'] = mock_chromedriver_manager


class TestValidateFunction:
    """Test the validate function from scrape.py."""

    def create_valid_df(self):
        """Create a DataFrame that passes strict validation."""
        players = []

        # Add enough players for each position to pass strict validation
        # pos_counts = {"QB": 32, "RB": 64, "WR": 64, "TE": 28, "DST": 32, "K": 15}
        positions = [
            ("QB", 32),
            ("RB", 64),
            ("WR", 64),
            ("TE", 28),
            ("DST", 32),
            ("K", 15),
        ]

        teams = ["ARI", "ATL", "BAL", "BUF", "CAR", "CHI", "CIN", "CLE",
                 "DAL", "DEN", "DET", "GB", "HOU", "IND", "JAX", "KC",
                 "LV", "MIA", "MIN", "NE", "NO", "NYG", "NYJ", "PHI",
                 "PIT", "LAC", "SF", "SEA", "LAR", "TB", "TEN", "WSH"]

        for pos, count in positions:
            for i in range(count):
                team = teams[i % len(teams)]
                players.append({
                    "name": f"Player{pos}{i}",
                    "pos": pos,
                    "team": team,
                })

        return pd.DataFrame(players)

    def test_valid_dataframe_passes_strict_validation(self):
        """A DataFrame with sufficient players at each position passes strict validation."""
        from scrape import validate

        df = self.create_valid_df()
        # Should not raise any exception
        validate(df, strict=True)

    def test_valid_dataframe_passes_non_strict_validation(self):
        """A DataFrame with sufficient players at each position passes non-strict validation."""
        from scrape import validate

        df = self.create_valid_df()
        # Should not raise any exception
        validate(df, strict=False)

    def test_insufficient_qbs_fails_strict_validation(self):
        """Validation fails when there are insufficient QBs in strict mode."""
        from scrape import validate

        df = self.create_valid_df()
        # Remove all but 10 QBs (need 32)
        qb_mask = df["pos"] == "QB"
        qb_indices = df[qb_mask].index[10:]  # Keep first 10, remove rest
        df = df.drop(qb_indices)

        with pytest.raises(RuntimeWarning, match="QB"):
            validate(df, strict=True)

    def test_too_many_teams_fails_validation(self):
        """Validation fails when there are more than 33 teams."""
        from scrape import validate

        df = self.create_valid_df()
        # Add players from fake teams to exceed 33
        fake_teams = ["FAKE1", "FAKE2", "FAKE3"]
        for fake_team in fake_teams:
            df = pd.concat([df, pd.DataFrame([{
                "name": f"FakePlayer{fake_team}",
                "pos": "QB",
                "team": fake_team,
            }])], ignore_index=True)

        with pytest.raises(RuntimeError, match="too many teams"):
            validate(df, strict=True)

    def test_non_strict_mode_allows_fewer_players(self):
        """Non-strict mode allows fewer players (above 1/3 threshold)."""
        from scrape import validate

        df = self.create_valid_df()
        # Remove QBs to have 15 (which is less than 32 but more than 32/3=10.67)
        qb_mask = df["pos"] == "QB"
        qb_indices = df[qb_mask].index[15:]  # Keep first 15, remove rest
        df = df.drop(qb_indices)

        # Should pass non-strict (15 > 32/3 = 10.67)
        validate(df, strict=False)

        # But fail strict (15 < 32)
        with pytest.raises(RuntimeWarning, match="QB"):
            validate(df, strict=True)

    def test_non_strict_mode_fails_below_one_third_threshold(self):
        """Non-strict mode fails when players are below 1/3 threshold."""
        from scrape import validate

        df = self.create_valid_df()
        # Remove QBs to have only 5 (which is less than 32/3=10.67)
        qb_mask = df["pos"] == "QB"
        qb_indices = df[qb_mask].index[5:]  # Keep first 5, remove rest
        df = df.drop(qb_indices)

        # Should fail non-strict (5 < 32/3 = 10.67)
        with pytest.raises(RuntimeWarning, match="QB"):
            validate(df, strict=False)

    def test_insufficient_rbs_fails_strict_validation(self):
        """Validation fails when there are insufficient RBs in strict mode."""
        from scrape import validate

        df = self.create_valid_df()
        # Remove all but 20 RBs (need 64)
        rb_mask = df["pos"] == "RB"
        rb_indices = df[rb_mask].index[20:]  # Keep first 20, remove rest
        df = df.drop(rb_indices)

        with pytest.raises(RuntimeWarning, match="RB"):
            validate(df, strict=True)

    def test_insufficient_wrs_fails_strict_validation(self):
        """Validation fails when there are insufficient WRs in strict mode."""
        from scrape import validate

        df = self.create_valid_df()
        # Remove all but 20 WRs (need 64)
        wr_mask = df["pos"] == "WR"
        wr_indices = df[wr_mask].index[20:]  # Keep first 20, remove rest
        df = df.drop(wr_indices)

        with pytest.raises(RuntimeWarning, match="WR"):
            validate(df, strict=True)

    def test_skip_fantasy_pros_check_skips_dst_and_k(self):
        """skip_fantasy_pros_check=True skips DST and K validation."""
        from scrape import validate

        df = self.create_valid_df()
        # Remove all DSTs and Ks
        df = df[(df["pos"] != "DST") & (df["pos"] != "K")]

        # Should fail without skip_fantasy_pros_check
        with pytest.raises(RuntimeWarning, match="(DST|K)"):
            validate(df, strict=True, skip_fantasy_pros_check=False)

        # Should pass with skip_fantasy_pros_check
        validate(df, strict=True, skip_fantasy_pros_check=True)
