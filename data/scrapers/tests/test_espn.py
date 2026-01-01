"""Tests for ESPN scraper."""

import pytest
from bs4 import BeautifulSoup

from scrapers.base import ScraperConfig
from scrapers.espn import DEFAULT_CONFIG, ESPNScraper


class TestESPNScraper:
    """Tests for ESPNScraper class initialization and configuration."""

    def test_default_config(self):
        """Test that scraper uses default config when none provided."""
        scraper = ESPNScraper()
        assert scraper.config.name == "ESPN"
        assert scraper.config.weight == 1.0
        assert scraper.config.timeout == 30
        assert scraper.config.retry_count == 3
        assert scraper.config.headless is True

    def test_custom_config(self):
        """Test that scraper accepts custom configuration."""
        custom_config = ScraperConfig(
            name="ESPN Custom",
            weight=1.2,
            timeout=60,
            retry_count=5,
            headless=False
        )
        scraper = ESPNScraper(config=custom_config)
        assert scraper.config.name == "ESPN Custom"
        assert scraper.config.weight == 1.2
        assert scraper.config.timeout == 60
        assert scraper.config.retry_count == 5
        assert scraper.config.headless is False

    def test_get_source_name(self):
        """Test that get_source_name returns 'ESPN'."""
        scraper = ESPNScraper()
        assert scraper.get_source_name() == "ESPN"


class TestESPNParsePlayer:
    """Tests for ESPNScraper._parse_player method."""

    @pytest.fixture
    def scraper(self):
        """Create an ESPNScraper instance for testing."""
        return ESPNScraper()

    def test_parse_regular_player(self, scraper):
        """Test parsing a regular player with stats."""
        html = '''
        <div class="full-projection-table">
            <span class="player-name">Patrick Mahomes</span>
            <span class="position-eligibility">QB</span>
            <span class="player-teamname">Chiefs</span>
            <div class="player-stat-table">
                <table><tbody>
                    <tr></tr>
                    <tr>
                        <td></td>
                        <td><div title="Passing_Yards">4500</div></td>
                        <td><div title="TD_Pass">35</div></td>
                    </tr>
                </tbody></table>
            </div>
        </div>
        '''
        soup = BeautifulSoup(html, "html.parser")
        row = soup.find("div", class_="full-projection-table")

        projection = scraper._parse_player(row)

        assert projection is not None
        assert projection.name == "Patrick Mahomes"
        assert projection.pos == "QB"
        assert projection.team == "KC"
        assert projection.key == "mahomes_qb_kc"
        assert projection.pass_yds == 4500.0
        assert projection.pass_tds == 35.0

    def test_parse_dst(self, scraper):
        """Test parsing a D/ST player."""
        html = '''
        <div class="full-projection-table">
            <span class="player-name">Eagles D/ST</span>
            <div class="player-stat-table">
                <table><tbody>
                    <tr></tr>
                    <tr><td></td></tr>
                </tbody></table>
            </div>
        </div>
        '''
        soup = BeautifulSoup(html, "html.parser")
        row = soup.find("div", class_="full-projection-table")

        projection = scraper._parse_player(row)

        assert projection is not None
        assert projection.name == "Eagles D/ST"
        assert projection.pos == "DST"
        assert projection.team == "PHI"
        assert "dst" in projection.key

    def test_skip_free_agent(self, scraper):
        """Test that free agents are skipped and return None."""
        html = '''
        <div class="full-projection-table">
            <span class="player-name">Free Agent Player</span>
            <span class="position-eligibility">RB</span>
            <span class="player-teamname">FA</span>
            <div class="player-stat-table">
                <table><tbody><tr></tr><tr><td></td></tr></tbody></table>
            </div>
        </div>
        '''
        soup = BeautifulSoup(html, "html.parser")
        row = soup.find("div", class_="full-projection-table")

        projection = scraper._parse_player(row)

        assert projection is None
