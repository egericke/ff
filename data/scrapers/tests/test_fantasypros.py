"""Tests for FantasyPros ADP scraper."""

import pytest

from scrapers.base import ScraperConfig
from scrapers.fantasypros import ADPData, DEFAULT_CONFIG, URLS, FantasyProsScraper


class TestFantasyProsScraper:
    """Tests for FantasyProsScraper class initialization and configuration."""

    def test_default_config(self):
        """Test that scraper uses default config when none provided."""
        scraper = FantasyProsScraper()
        assert scraper.config.name == "FantasyPros"
        assert scraper.config.weight == 1.2
        assert scraper.config.timeout == 30
        assert scraper.config.retry_count == 3
        assert scraper.config.headless is True

    def test_custom_config(self):
        """Test that scraper accepts custom configuration."""
        custom_config = ScraperConfig(
            name="FantasyPros Custom",
            weight=1.0,
            timeout=60,
            retry_count=5,
            headless=False
        )
        scraper = FantasyProsScraper(config=custom_config)
        assert scraper.config.name == "FantasyPros Custom"
        assert scraper.config.weight == 1.0
        assert scraper.config.timeout == 60
        assert scraper.config.retry_count == 5
        assert scraper.config.headless is False

    def test_get_source_name(self):
        """Test that get_source_name returns 'FantasyPros'."""
        scraper = FantasyProsScraper()
        assert scraper.get_source_name() == "FantasyPros"

    def test_urls_defined(self):
        """Test that URLS dictionary contains all required scoring formats."""
        assert "std" in URLS
        assert "half_ppr" in URLS
        assert "ppr" in URLS
        assert len(URLS) == 3

        # Verify URLs are valid FantasyPros URLs
        for key, url in URLS.items():
            assert url.startswith("https://www.fantasypros.com/nfl/adp/")
            assert url.endswith(".php")


class TestADPData:
    """Tests for ADPData dataclass."""

    def test_adp_data_creation(self):
        """Test creating an ADPData instance with all fields."""
        adp = ADPData(
            key="mahomes_qb_kc",
            name="Patrick Mahomes",
            pos="QB",
            team="KC",
            bye=10,
            std=24.5,
            half_ppr=28.2,
            ppr=32.1
        )
        assert adp.key == "mahomes_qb_kc"
        assert adp.name == "Patrick Mahomes"
        assert adp.pos == "QB"
        assert adp.team == "KC"
        assert adp.bye == 10
        assert adp.std == 24.5
        assert adp.half_ppr == 28.2
        assert adp.ppr == 32.1

    def test_adp_data_with_zero_values(self):
        """Test ADPData with zero/default ADP values."""
        adp = ADPData(
            key="smith_wr_phi",
            name="DeVonta Smith",
            pos="WR",
            team="PHI",
            bye=14,
            std=0.0,
            half_ppr=0.0,
            ppr=0.0
        )
        assert adp.std == 0.0
        assert adp.half_ppr == 0.0
        assert adp.ppr == 0.0

    def test_adp_data_different_positions(self):
        """Test ADPData for various fantasy positions."""
        # Test RB
        rb_adp = ADPData(
            key="mccaffrey_rb_sf",
            name="Christian McCaffrey",
            pos="RB",
            team="SF",
            bye=9,
            std=1.0,
            half_ppr=1.0,
            ppr=1.0
        )
        assert rb_adp.pos == "RB"

        # Test TE
        te_adp = ADPData(
            key="kelce_te_kc",
            name="Travis Kelce",
            pos="TE",
            team="KC",
            bye=10,
            std=15.0,
            half_ppr=12.5,
            ppr=10.0
        )
        assert te_adp.pos == "TE"

        # Test K
        k_adp = ADPData(
            key="tucker_k_bal",
            name="Justin Tucker",
            pos="K",
            team="BAL",
            bye=13,
            std=150.0,
            half_ppr=155.0,
            ppr=160.0
        )
        assert k_adp.pos == "K"

        # Test DST
        dst_adp = ADPData(
            key="eagles_dst_phi",
            name="Eagles D/ST",
            pos="DST",
            team="PHI",
            bye=14,
            std=85.0,
            half_ppr=88.0,
            ppr=90.0
        )
        assert dst_adp.pos == "DST"


class TestDefaultConfig:
    """Tests for DEFAULT_CONFIG."""

    def test_default_config_values(self):
        """Test that DEFAULT_CONFIG has correct values."""
        assert DEFAULT_CONFIG.name == "FantasyPros"
        assert DEFAULT_CONFIG.weight == 1.2
        assert DEFAULT_CONFIG.timeout == 30
        assert DEFAULT_CONFIG.retry_count == 3
        assert DEFAULT_CONFIG.headless is True
