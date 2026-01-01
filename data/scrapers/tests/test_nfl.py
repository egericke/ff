"""Tests for NFL scraper."""

import pytest
from bs4 import BeautifulSoup

from scrapers.base import ScraperConfig
from scrapers.nfl import DEFAULT_CONFIG, PAGES, NFLScraper


class TestNFLScraper:
    """Tests for NFLScraper class initialization and configuration."""

    def test_default_config(self):
        """Test that scraper uses default config when none provided."""
        scraper = NFLScraper()
        assert scraper.config.name == "NFL"
        assert scraper.config.weight == 0.8
        assert scraper.config.timeout == 30
        assert scraper.config.retry_count == 3
        assert scraper.config.headless is True

    def test_custom_config(self):
        """Test that scraper accepts custom configuration."""
        custom_config = ScraperConfig(
            name="NFL Custom",
            weight=1.0,
            timeout=60,
            retry_count=5,
            headless=False
        )
        scraper = NFLScraper(config=custom_config)
        assert scraper.config.name == "NFL Custom"
        assert scraper.config.weight == 1.0
        assert scraper.config.timeout == 60
        assert scraper.config.retry_count == 5
        assert scraper.config.headless is False

    def test_get_source_name(self):
        """Test that get_source_name returns 'NFL'."""
        scraper = NFLScraper()
        assert scraper.get_source_name() == "NFL"

    def test_pages_defined(self):
        """Test that PAGES list is properly defined with required structure."""
        assert len(PAGES) == 3  # Offensive, Kickers, DST

        # Verify each page has the correct structure: (url, position_filter, column_headers)
        for url, position_filter, column_headers in PAGES:
            assert isinstance(url, str)
            assert url.startswith("https://fantasy.nfl.com/research/projections")
            assert isinstance(position_filter, list)
            assert len(position_filter) > 0
            assert isinstance(column_headers, list)
            assert len(column_headers) > 0

    def test_pages_offensive(self):
        """Test that offensive page is configured correctly."""
        url, positions, columns = PAGES[0]
        assert "position=O" in url
        assert positions == ["QB", "RB", "WR", "TE"]
        assert "pass_yds" in columns
        assert "rush_yds" in columns
        assert "rec_yds" in columns

    def test_pages_kickers(self):
        """Test that kickers page is configured correctly."""
        url, positions, columns = PAGES[1]
        assert "position=K" in url
        assert positions == ["K"]
        assert "kick_xp" in columns
        assert "kick_50" in columns

    def test_pages_dst(self):
        """Test that DST page is configured correctly."""
        url, positions, columns = PAGES[2]
        assert "position=DEF" in url
        assert positions == ["DST"]
        assert "dst_sacks" in columns
        assert "dst_ints" in columns


class TestNFLParseRow:
    """Tests for NFLScraper row parsing methods."""

    @pytest.fixture
    def scraper(self):
        """Create an NFLScraper instance for testing."""
        return NFLScraper()

    def test_parse_regular_player(self, scraper):
        """Test parsing a regular offensive player."""
        html = '''
        <tr>
            <td class="playerNameAndInfo">
                <a class="playerName" href="#">Patrick Mahomes</a>
                <em>QB - KC</em>
            </td>
            <td class="stat">4500</td>
            <td class="stat">35</td>
            <td class="stat">10</td>
            <td class="stat">200</td>
            <td class="stat">2</td>
            <td class="stat">0</td>
            <td class="stat">0</td>
            <td class="stat">0</td>
            <td class="stat">3</td>
        </tr>
        '''
        soup = BeautifulSoup(html, "html.parser")
        row = soup.find("tr")

        position_filter = ["QB", "RB", "WR", "TE"]
        column_headers = ["pass_yds", "pass_tds", "pass_ints", "rush_yds", "rush_tds",
                         "receptions", "rec_yds", "rec_tds", "fumbles"]

        projection = scraper._parse_row(row, position_filter, column_headers)

        assert projection is not None
        assert projection.name == "Patrick Mahomes"
        assert projection.pos == "QB"
        assert projection.team == "KC"
        assert projection.key == "mahomes_qb_kc"
        assert projection.pass_yds == 4500.0
        assert projection.pass_tds == 35.0
        assert projection.pass_ints == 10.0

    def test_parse_running_back(self, scraper):
        """Test parsing a running back."""
        html = '''
        <tr>
            <td class="playerNameAndInfo">
                <a class="playerName" href="#">Derrick Henry</a>
                <em>RB - BAL</em>
            </td>
            <td class="stat">0</td>
            <td class="stat">0</td>
            <td class="stat">0</td>
            <td class="stat">1500</td>
            <td class="stat">14</td>
            <td class="stat">25</td>
            <td class="stat">200</td>
            <td class="stat">1</td>
            <td class="stat">2</td>
        </tr>
        '''
        soup = BeautifulSoup(html, "html.parser")
        row = soup.find("tr")

        position_filter = ["QB", "RB", "WR", "TE"]
        column_headers = ["pass_yds", "pass_tds", "pass_ints", "rush_yds", "rush_tds",
                         "receptions", "rec_yds", "rec_tds", "fumbles"]

        projection = scraper._parse_row(row, position_filter, column_headers)

        assert projection is not None
        assert projection.name == "Derrick Henry"
        assert projection.pos == "RB"
        assert projection.team == "BAL"
        assert projection.rush_yds == 1500.0
        assert projection.rush_tds == 14.0

    def test_parse_dst(self, scraper):
        """Test parsing a DST row."""
        html = '''
        <tr>
            <td class="playerNameAndInfo">
                <a class="playerName" href="#">Eagles Defense</a>
                <em>DEF - PHI</em>
            </td>
            <td class="stat">45</td>
            <td class="stat">15</td>
            <td class="stat">12</td>
            <td class="stat">3</td>
            <td class="stat">1</td>
            <td class="stat">18.5</td>
        </tr>
        '''
        soup = BeautifulSoup(html, "html.parser")
        row = soup.find("tr")

        position_filter = ["DST"]
        column_headers = ["dst_sacks", "dst_ints", "dst_fumbles", "dst_tds",
                         "dst_safeties", "dst_pa_per_game"]

        projection = scraper._parse_dst_row(
            row,
            "Eagles Defense",
            column_headers
        )

        assert projection is not None
        assert projection.name == "Eagles Defense"
        assert projection.pos == "DST"
        assert projection.team == "PHI"
        assert "dst" in projection.key

    def test_parse_dst_team_extraction(self, scraper):
        """Test that DST team name is correctly extracted."""
        html = '''
        <tr>
            <td class="playerNameAndInfo">
                <a class="playerName" href="#">Cowboys Defense</a>
            </td>
            <td class="stat">40</td>
            <td class="stat">12</td>
            <td class="stat">10</td>
            <td class="stat">2</td>
            <td class="stat">0</td>
            <td class="stat">21.0</td>
        </tr>
        '''
        soup = BeautifulSoup(html, "html.parser")
        row = soup.find("tr")

        column_headers = ["dst_sacks", "dst_ints", "dst_fumbles", "dst_tds",
                         "dst_safeties", "dst_pa_per_game"]

        projection = scraper._parse_dst_row(row, "Cowboys Defense", column_headers)

        assert projection is not None
        assert projection.team == "DAL"

    def test_skip_invalid_position(self, scraper):
        """Test that invalid positions are skipped."""
        html = '''
        <tr>
            <td class="playerNameAndInfo">
                <a class="playerName" href="#">Some Punter</a>
                <em>P - SEA</em>
            </td>
            <td class="stat">0</td>
        </tr>
        '''
        soup = BeautifulSoup(html, "html.parser")
        row = soup.find("tr")

        position_filter = ["QB", "RB", "WR", "TE"]
        column_headers = ["pass_yds"]

        projection = scraper._parse_row(row, position_filter, column_headers)

        # Should return None because P (Punter) is not a valid position
        assert projection is None

    def test_parse_stats_with_dashes(self, scraper):
        """Test that dash values are handled as missing."""
        html = '''
        <tr>
            <td class="playerNameAndInfo">
                <a class="playerName" href="#">Tyreek Hill</a>
                <em>WR - MIA</em>
            </td>
            <td class="stat">-</td>
            <td class="stat">-</td>
            <td class="stat">-</td>
            <td class="stat">50</td>
            <td class="stat">0</td>
            <td class="stat">110</td>
            <td class="stat">1400</td>
            <td class="stat">12</td>
            <td class="stat">1</td>
        </tr>
        '''
        soup = BeautifulSoup(html, "html.parser")
        row = soup.find("tr")

        position_filter = ["QB", "RB", "WR", "TE"]
        column_headers = ["pass_yds", "pass_tds", "pass_ints", "rush_yds", "rush_tds",
                         "receptions", "rec_yds", "rec_tds", "fumbles"]

        projection = scraper._parse_row(row, position_filter, column_headers)

        assert projection is not None
        assert projection.name == "Tyreek Hill"
        assert projection.pos == "WR"
        # Dash values should not be in stats (defaults to 0.0 from PlayerProjection)
        assert projection.pass_yds == 0.0
        assert projection.receptions == 110.0
        assert projection.rec_yds == 1400.0

    def test_parse_stats_with_commas(self, scraper):
        """Test that comma-formatted numbers are parsed correctly."""
        html = '''
        <tr>
            <td class="playerNameAndInfo">
                <a class="playerName" href="#">Josh Allen</a>
                <em>QB - BUF</em>
            </td>
            <td class="stat">4,200</td>
            <td class="stat">30</td>
            <td class="stat">12</td>
            <td class="stat">500</td>
            <td class="stat">5</td>
            <td class="stat">0</td>
            <td class="stat">0</td>
            <td class="stat">0</td>
            <td class="stat">4</td>
        </tr>
        '''
        soup = BeautifulSoup(html, "html.parser")
        row = soup.find("tr")

        position_filter = ["QB", "RB", "WR", "TE"]
        column_headers = ["pass_yds", "pass_tds", "pass_ints", "rush_yds", "rush_tds",
                         "receptions", "rec_yds", "rec_tds", "fumbles"]

        projection = scraper._parse_row(row, position_filter, column_headers)

        assert projection is not None
        assert projection.pass_yds == 4200.0


class TestNFLParseStats:
    """Tests for NFLScraper._parse_stats method."""

    @pytest.fixture
    def scraper(self):
        """Create an NFLScraper instance for testing."""
        return NFLScraper()

    def test_parse_kicker_stats(self, scraper):
        """Test parsing kicker statistics."""
        html = '''
        <tr>
            <td class="stat">45</td>
            <td class="stat">5</td>
            <td class="stat">10</td>
            <td class="stat">12</td>
            <td class="stat">8</td>
            <td class="stat">3</td>
        </tr>
        '''
        soup = BeautifulSoup(html, "html.parser")
        row = soup.find("tr")

        column_headers = ["kick_xp", "kick_0_19", "kick_20_29", "kick_30_39",
                         "kick_40_49", "kick_50"]

        stats = scraper._parse_stats(row, column_headers)

        assert stats["kick_xp"] == 45.0
        assert stats["kick_0_19"] == 5.0
        assert stats["kick_20_29"] == 10.0
        assert stats["kick_30_39"] == 12.0
        assert stats["kick_40_49"] == 8.0
        assert stats["kick_50"] == 3.0

    def test_parse_dst_stats(self, scraper):
        """Test parsing DST statistics."""
        html = '''
        <tr>
            <td class="stat">42</td>
            <td class="stat">14</td>
            <td class="stat">11</td>
            <td class="stat">4</td>
            <td class="stat">2</td>
            <td class="stat">19.5</td>
        </tr>
        '''
        soup = BeautifulSoup(html, "html.parser")
        row = soup.find("tr")

        column_headers = ["dst_sacks", "dst_ints", "dst_fumbles", "dst_tds",
                         "dst_safeties", "dst_pa_per_game"]

        stats = scraper._parse_stats(row, column_headers)

        assert stats["dst_sacks"] == 42.0
        assert stats["dst_ints"] == 14.0
        assert stats["dst_fumbles"] == 11.0
        assert stats["dst_tds"] == 4.0
        assert stats["dst_safeties"] == 2.0
        assert stats["dst_pa_per_game"] == 19.5
