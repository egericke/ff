import pytest
from scrapers.base import ScraperConfig, PlayerProjection, BaseScraper


class TestScraperConfig:
    def test_config_defaults(self):
        config = ScraperConfig(name="test", weight=1.0)
        assert config.timeout == 30
        assert config.retry_count == 3
        assert config.headless is True

    def test_config_custom_values(self):
        config = ScraperConfig(
            name="custom",
            weight=1.2,
            timeout=60,
            retry_count=5,
            headless=False
        )
        assert config.name == "custom"
        assert config.weight == 1.2
        assert config.timeout == 60


class TestPlayerProjection:
    def test_projection_defaults(self):
        proj = PlayerProjection(
            key="smith_wr_phi",
            name="DeVonta Smith",
            pos="WR",
            team="PHI"
        )
        assert proj.pass_yds == 0.0
        assert proj.target_share is None

    def test_projection_with_advanced_stats(self):
        proj = PlayerProjection(
            key="chase_wr_cin",
            name="Ja'Marr Chase",
            pos="WR",
            team="CIN",
            rec_yds=1350.0,
            rec_tds=11.0,
            target_share=0.28,
            snap_pct=0.92
        )
        assert proj.target_share == 0.28
        assert proj.snap_pct == 0.92


class TestBaseScraper:
    def test_cannot_instantiate_abstract_class(self):
        with pytest.raises(TypeError):
            BaseScraper(ScraperConfig(name="test", weight=1.0))
