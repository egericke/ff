import pytest
from scrapers.constants import (
    normalize_team, normalize_position, create_player_key,
    TEAM_ABBREVIATIONS, POSITIONS
)

class TestNormalizeTeam:
    def test_valid_abbreviation_unchanged(self):
        assert normalize_team("PHI") == "PHI"
        assert normalize_team("KC") == "KC"

    def test_legacy_fixes_applied(self):
        assert normalize_team("WAS") == "WSH"
        assert normalize_team("JAC") == "JAX"
        assert normalize_team("LA") == "LAR"

    def test_team_name_converted(self):
        assert normalize_team("Eagles") == "PHI"
        assert normalize_team("Chiefs") == "KC"
        assert normalize_team("49ers") == "SF"

    def test_case_insensitive(self):
        assert normalize_team("phi") == "PHI"
        assert normalize_team("EAGLES") == "PHI"

    def test_unknown_team_raises(self):
        with pytest.raises(ValueError, match="Unknown team"):
            normalize_team("INVALID")

class TestNormalizePosition:
    def test_valid_position_unchanged(self):
        assert normalize_position("QB") == "QB"
        assert normalize_position("WR") == "WR"

    def test_aliases_converted(self):
        assert normalize_position("FB") == "RB"
        assert normalize_position("D/ST") == "DST"

    def test_case_insensitive(self):
        assert normalize_position("qb") == "QB"
        assert normalize_position("Wr") == "WR"

    def test_unknown_position_raises(self):
        with pytest.raises(ValueError, match="Unknown position"):
            normalize_position("INVALID")

class TestCreatePlayerKey:
    def test_basic_key_generation(self):
        assert create_player_key("Patrick Mahomes", "QB", "KC") == "mahomes_qb_kc"
        assert create_player_key("Ja'Marr Chase", "WR", "CIN") == "chase_wr_cin"

    def test_removes_suffixes(self):
        assert create_player_key("Marvin Harrison Jr", "WR", "ARI") == "harrison_wr_ari"
        assert create_player_key("Odell Beckham Sr.", "WR", "MIA") == "beckham_wr_mia"

    def test_handles_special_characters(self):
        assert create_player_key("D'Andre Swift", "RB", "CHI") == "swift_rb_chi"
