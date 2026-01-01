"""Tests for CBS scraper."""

import pytest
from bs4 import BeautifulSoup

from scrapers.base import ScraperConfig
from scrapers.cbs import DEFAULT_CONFIG, CBSScraper


class TestCBSScraper:
    """Tests for CBSScraper class initialization and configuration."""

    def test_default_config(self):
        """Test that scraper uses default config when none provided."""
        scraper = CBSScraper()
        assert scraper.config.name == "CBS"
        assert scraper.config.weight == 0.9
        assert scraper.config.timeout == 30
        assert scraper.config.retry_count == 3
        assert scraper.config.headless is True

    def test_custom_config(self):
        """Test that scraper accepts custom configuration."""
        custom_config = ScraperConfig(
            name="CBS Custom",
            weight=1.1,
            timeout=60,
            retry_count=5,
            headless=False,
        )
        scraper = CBSScraper(config=custom_config)
        assert scraper.config.name == "CBS Custom"
        assert scraper.config.weight == 1.1
        assert scraper.config.timeout == 60
        assert scraper.config.retry_count == 5
        assert scraper.config.headless is False

    def test_get_source_name(self):
        """Test that get_source_name returns 'CBS'."""
        scraper = CBSScraper()
        assert scraper.get_source_name() == "CBS"


class TestCBSParseStats:
    """Tests for CBSScraper._parse_stats method."""

    @pytest.fixture
    def scraper(self):
        """Create a CBSScraper instance for testing."""
        return CBSScraper()

    def test_parse_stats_passing(self, scraper):
        """Test parsing passing stats."""
        html = """
        <td>4500</td>
        <td>35</td>
        <td>10</td>
        """
        soup = BeautifulSoup(html, "html.parser")
        cells = soup.find_all("td")
        headers = ["passing_yards", "touchdowns_passes", "interceptions_thrown"]

        stats = scraper._parse_stats(cells, headers, "QB")

        assert stats["pass_yds"] == 4500.0
        assert stats["pass_tds"] == 35.0
        assert stats["pass_ints"] == 10.0

    def test_parse_stats_rushing(self, scraper):
        """Test parsing rushing stats."""
        html = """
        <td>1,200</td>
        <td>12</td>
        """
        soup = BeautifulSoup(html, "html.parser")
        cells = soup.find_all("td")
        headers = ["rushing_yards", "rushing_touchdowns"]

        stats = scraper._parse_stats(cells, headers, "RB")

        assert stats["rush_yds"] == 1200.0
        assert stats["rush_tds"] == 12.0

    def test_parse_stats_receiving(self, scraper):
        """Test parsing receiving stats."""
        html = """
        <td>85</td>
        <td>1,100</td>
        <td>9</td>
        """
        soup = BeautifulSoup(html, "html.parser")
        cells = soup.find_all("td")
        headers = ["receptions", "receiving_yards", "receiving_touchdowns"]

        stats = scraper._parse_stats(cells, headers, "WR")

        assert stats["receptions"] == 85.0
        assert stats["rec_yds"] == 1100.0
        assert stats["rec_tds"] == 9.0

    def test_parse_stats_kicker(self, scraper):
        """Test parsing kicker stats."""
        html = """
        <td>5</td>
        <td>10</td>
        <td>15</td>
        <td>8</td>
        <td>3</td>
        <td>45</td>
        """
        soup = BeautifulSoup(html, "html.parser")
        cells = soup.find_all("td")
        headers = [
            "field_goals_0_19",
            "field_goals_20_29",
            "field_goals_30_39",
            "field_goals_40_49",
            "field_goals_50",
            "extra_points_made",
        ]

        stats = scraper._parse_stats(cells, headers, "K")

        assert stats["kick_0_19"] == 5.0
        assert stats["kick_20_29"] == 10.0
        assert stats["kick_30_39"] == 15.0
        assert stats["kick_40_49"] == 8.0
        assert stats["kick_50"] == 3.0
        assert stats["kick_xp"] == 45.0

    def test_parse_stats_dst(self, scraper):
        """Test parsing DST stats."""
        html = """
        <td>45</td>
        <td>18</td>
        <td>12</td>
        <td>3</td>
        <td>1</td>
        <td>18.5</td>
        """
        soup = BeautifulSoup(html, "html.parser")
        cells = soup.find_all("td")
        headers = [
            "sacks",
            "interceptions",
            "fumbles_recovered",
            "touchdowns",
            "safeties",
            "points_allowed",
        ]

        stats = scraper._parse_stats(cells, headers, "DST")

        assert stats["dst_sacks"] == 45.0
        assert stats["dst_ints"] == 18.0
        assert stats["dst_fumbles"] == 12.0
        assert stats["dst_tds"] == 3.0
        assert stats["dst_safeties"] == 1.0
        assert stats["dst_pa_per_game"] == 18.5

    def test_parse_stats_empty_cell(self, scraper):
        """Test parsing stats with empty cell returns empty stats."""
        html = """
        <td>4500</td>
        <td>-</td>
        <td>10</td>
        """
        soup = BeautifulSoup(html, "html.parser")
        cells = soup.find_all("td")
        headers = ["passing_yards", "touchdowns_passes", "interceptions_thrown"]

        stats = scraper._parse_stats(cells, headers, "QB")

        assert stats["pass_yds"] == 4500.0
        assert "pass_tds" not in stats  # Dash is treated as no value
        assert stats["pass_ints"] == 10.0

    def test_parse_stats_unknown_header(self, scraper):
        """Test that unknown headers are ignored."""
        html = """
        <td>4500</td>
        <td>500</td>
        """
        soup = BeautifulSoup(html, "html.parser")
        cells = soup.find_all("td")
        headers = ["passing_yards", "unknown_stat"]

        stats = scraper._parse_stats(cells, headers, "QB")

        assert stats["pass_yds"] == 4500.0
        assert len(stats) == 1  # Only one valid stat

    def test_parse_stats_fumbles(self, scraper):
        """Test parsing fumbles lost."""
        html = """
        <td>3</td>
        """
        soup = BeautifulSoup(html, "html.parser")
        cells = soup.find_all("td")
        headers = ["fumbles_lost"]

        stats = scraper._parse_stats(cells, headers, "RB")

        assert stats["fumbles"] == 3.0


class TestCBSParseHeaders:
    """Tests for CBSScraper._parse_headers method."""

    @pytest.fixture
    def scraper(self):
        """Create a CBSScraper instance for testing."""
        return CBSScraper()

    def test_parse_headers_basic(self, scraper):
        """Test parsing basic table headers."""
        html = """
        <table>
            <thead>
                <tr>
                    <th>Player</th>
                    <th data-stat="passing_yards">Pass Yds</th>
                    <th data-stat="touchdowns_passes">Pass TDs</th>
                </tr>
            </thead>
        </table>
        """
        soup = BeautifulSoup(html, "html.parser")
        table = soup.find("table")

        headers = scraper._parse_headers(table)

        assert len(headers) == 3
        assert headers[0] == "player"
        assert headers[1] == "passing_yards"
        assert headers[2] == "touchdowns_passes"

    def test_parse_headers_with_spaces(self, scraper):
        """Test parsing headers with spaces converts to underscores."""
        html = """
        <table>
            <thead>
                <tr>
                    <th>Passing Yards</th>
                    <th>Rushing-TDs</th>
                </tr>
            </thead>
        </table>
        """
        soup = BeautifulSoup(html, "html.parser")
        table = soup.find("table")

        headers = scraper._parse_headers(table)

        assert headers[0] == "passing_yards"
        assert headers[1] == "rushing_tds"

    def test_parse_headers_empty_table(self, scraper):
        """Test parsing headers from table with no thead."""
        html = """
        <table>
            <tbody>
                <tr><td>Data</td></tr>
            </tbody>
        </table>
        """
        soup = BeautifulSoup(html, "html.parser")
        table = soup.find("table")

        headers = scraper._parse_headers(table)

        assert headers == []


class TestCBSParseRow:
    """Tests for CBSScraper._parse_row method."""

    @pytest.fixture
    def scraper(self):
        """Create a CBSScraper instance for testing."""
        return CBSScraper()

    def test_parse_row_regular_player(self, scraper):
        """Test parsing a regular player row."""
        html = """
        <tr>
            <td>
                <a class="CellPlayerName--long">Patrick Mahomes</a>
                <span class="CellPlayerName-team">KC</span>
            </td>
            <td>4500</td>
            <td>35</td>
        </tr>
        """
        soup = BeautifulSoup(html, "html.parser")
        row = soup.find("tr")
        headers = ["player", "passing_yards", "touchdowns_passes"]

        projection = scraper._parse_row(row, "QB", headers)

        assert projection is not None
        assert projection.name == "Patrick Mahomes"
        assert projection.pos == "QB"
        assert projection.team == "KC"
        assert projection.key == "mahomes_qb_kc"
        assert projection.pass_yds == 4500.0
        assert projection.pass_tds == 35.0

    def test_parse_row_dst(self, scraper):
        """Test parsing a DST row."""
        html = """
        <tr>
            <td>
                <a class="TeamLogoNameLockup" href="/nfl/teams/PHI/philadelphia-eagles/">Eagles</a>
            </td>
            <td>45</td>
            <td>18</td>
        </tr>
        """
        soup = BeautifulSoup(html, "html.parser")
        row = soup.find("tr")
        headers = ["player", "sacks", "interceptions"]

        projection = scraper._parse_row(row, "DST", headers)

        assert projection is not None
        assert projection.pos == "DST"
        assert projection.team == "PHI"
        assert "dst" in projection.key
        assert projection.dst_sacks == 45.0
        assert projection.dst_ints == 18.0

    def test_parse_row_skip_free_agent(self, scraper):
        """Test that free agents return None."""
        html = """
        <tr>
            <td>
                <a class="CellPlayerName--long">Free Agent</a>
                <span class="CellPlayerName-team">FA</span>
            </td>
            <td>100</td>
        </tr>
        """
        soup = BeautifulSoup(html, "html.parser")
        row = soup.find("tr")
        headers = ["player", "rushing_yards"]

        projection = scraper._parse_row(row, "RB", headers)

        assert projection is None

    def test_parse_row_empty_cells(self, scraper):
        """Test parsing row with no cells returns None."""
        html = "<tr></tr>"
        soup = BeautifulSoup(html, "html.parser")
        row = soup.find("tr")
        headers = ["player"]

        projection = scraper._parse_row(row, "QB", headers)

        assert projection is None

    def test_parse_row_missing_team(self, scraper):
        """Test parsing row with missing team returns None."""
        html = """
        <tr>
            <td>
                <a class="CellPlayerName--long">No Team Player</a>
            </td>
            <td>100</td>
        </tr>
        """
        soup = BeautifulSoup(html, "html.parser")
        row = soup.find("tr")
        headers = ["player", "rushing_yards"]

        projection = scraper._parse_row(row, "RB", headers)

        assert projection is None
