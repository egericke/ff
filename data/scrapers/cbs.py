"""CBS Sports Fantasy Football projections scraper."""

import time
from datetime import datetime
from typing import Any, Optional

from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from scrapers.base import BaseScraper, PlayerProjection, ScraperConfig
from scrapers.constants import create_player_key, normalize_position, normalize_team


DEFAULT_CONFIG = ScraperConfig(name="CBS", weight=0.9)

YEAR = datetime.now().year

BASE_URL = "https://www.cbssports.com/fantasy/football/stats"

POSITIONS = ["QB", "RB", "WR", "TE", "DST", "K"]


class CBSScraper(BaseScraper):
    """Scraper for CBS Sports Fantasy Football projections."""

    COLUMN_MAP = {
        "passing_yards": "pass_yds",
        "touchdowns_passes": "pass_tds",
        "interceptions_thrown": "pass_ints",
        "rushing_yards": "rush_yds",
        "rushing_touchdowns": "rush_tds",
        "receptions": "receptions",
        "receiving_yards": "rec_yds",
        "receiving_touchdowns": "rec_tds",
        "fumbles_lost": "fumbles",
        "2_pt_conversions": "two_pts",
        "field_goals_0_19": "kick_0_19",
        "field_goals_20_29": "kick_20_29",
        "field_goals_30_39": "kick_30_39",
        "field_goals_40_49": "kick_40_49",
        "field_goals_50": "kick_50",
        "extra_points_made": "kick_xp",
        "sacks": "dst_sacks",
        "interceptions": "dst_ints",
        "fumbles_recovered": "dst_fumbles",
        "touchdowns": "dst_tds",
        "safeties": "dst_safeties",
        "points_allowed": "dst_pa_per_game",
    }

    def __init__(self, config: Optional[ScraperConfig] = None):
        """Initialize the CBS scraper.

        Args:
            config: Optional scraper configuration. Uses DEFAULT_CONFIG if not provided.
        """
        super().__init__(config or DEFAULT_CONFIG)

    def get_source_name(self) -> str:
        """Return the source name for logging and identification.

        Returns:
            str: 'CBS' as the source identifier.
        """
        return "CBS"

    def _create_driver(self) -> webdriver.Chrome:
        """Create and configure a Chrome WebDriver instance.

        Returns:
            webdriver.Chrome: Configured Chrome WebDriver.
        """
        options = Options()
        if self.config.headless:
            options.add_argument("--headless")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--disable-gpu")
        options.add_argument("--window-size=1920,1080")

        driver = webdriver.Chrome(options=options)
        driver.set_page_load_timeout(self.config.timeout)
        return driver

    def scrape(self) -> list[PlayerProjection]:
        """Scrape projections from CBS Sports.

        Returns:
            list[PlayerProjection]: A list of player projections from CBS.

        Raises:
            Exception: If scraping fails after retries.
        """
        projections: list[PlayerProjection] = []

        for attempt in range(self.config.retry_count):
            try:
                self._driver = self._create_driver()

                for position in POSITIONS:
                    url = f"{BASE_URL}/{position}/{YEAR}/season/projections/ppr/"
                    self._driver.get(url)

                    # Wait for page to load
                    WebDriverWait(self._driver, self.config.timeout).until(
                        EC.presence_of_element_located((By.TAG_NAME, "table"))
                    )

                    self._scroll_page()
                    page_projections = self._parse_position_page(position)
                    projections.extend(page_projections)

                return projections

            except Exception as e:
                if attempt == self.config.retry_count - 1:
                    raise
            finally:
                if self._driver:
                    self._driver.quit()
                    self._driver = None

        return projections

    def _scroll_page(self) -> None:
        """Scroll the page to load all dynamic content."""
        if not self._driver:
            return

        last_height = self._driver.execute_script("return document.body.scrollHeight")

        while True:
            self._driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
            time.sleep(0.5)
            new_height = self._driver.execute_script("return document.body.scrollHeight")
            if new_height == last_height:
                break
            last_height = new_height

    def _parse_position_page(self, position: str) -> list[PlayerProjection]:
        """Parse all player projections for a position page.

        Args:
            position: The position being scraped (QB, RB, WR, TE, DST, K).

        Returns:
            list[PlayerProjection]: Projections parsed from the position page.
        """
        if not self._driver:
            return []

        projections: list[PlayerProjection] = []
        soup = BeautifulSoup(self._driver.page_source, "html.parser")

        # Find the stats table
        table = soup.find("table", class_="TableBase-table")
        if not table:
            return []

        headers = self._parse_headers(table)
        tbody = table.find("tbody")
        if not tbody:
            return []

        rows = tbody.find_all("tr")
        for row in rows:
            projection = self._parse_row(row, position, headers)
            if projection:
                projections.append(projection)

        return projections

    def _parse_headers(self, table: Any) -> list[str]:
        """Parse table headers to determine column order.

        Args:
            table: BeautifulSoup table element.

        Returns:
            list[str]: List of header names in column order.
        """
        headers = []
        thead = table.find("thead")
        if thead:
            header_row = thead.find("tr")
            if header_row:
                for th in header_row.find_all("th"):
                    # Get data attribute or text content for header name
                    header_text = th.get("data-stat", "") or th.get_text(strip=True)
                    # Normalize header name
                    header_text = header_text.lower().replace(" ", "_").replace("-", "_")
                    headers.append(header_text)
        return headers

    def _parse_row(
        self, row: Any, position: str, headers: list[str]
    ) -> Optional[PlayerProjection]:
        """Parse a single player row into a PlayerProjection.

        Args:
            row: BeautifulSoup element containing player data.
            position: The position being scraped.
            headers: List of column headers.

        Returns:
            PlayerProjection if valid player data found, None otherwise.
        """
        try:
            cells = row.find_all("td")
            if not cells:
                return None

            # First cell contains player info
            player_cell = cells[0]

            # Handle DST differently - extract team from TeamLogoNameLockup href
            if position == "DST":
                lockup = player_cell.find("a", class_="TeamLogoNameLockup")
                if not lockup:
                    # Try alternate selector
                    lockup = player_cell.find("a")
                if lockup:
                    href = lockup.get("href", "")
                    # Extract team from href like /nfl/teams/PHI/
                    parts = href.strip("/").split("/")
                    team = None
                    for part in parts:
                        if len(part) == 2 or len(part) == 3:
                            try:
                                team = normalize_team(part)
                                break
                            except ValueError:
                                continue

                    if not team:
                        team_text = lockup.get_text(strip=True)
                        try:
                            team = normalize_team(team_text.split()[0])
                        except (ValueError, IndexError):
                            return None

                    name = f"{team} D/ST"
                    pos = "DST"
                    key = create_player_key(name, pos, team)
                    stats = self._parse_stats(cells[1:], headers[1:], position)

                    return PlayerProjection(
                        key=key,
                        name=name,
                        pos=pos,
                        team=team,
                        **stats,
                    )
                return None

            # Regular player parsing
            name_elem = player_cell.find("a", class_="CellPlayerName--long")
            if not name_elem:
                name_elem = player_cell.find("a")
            if not name_elem:
                return None

            name = name_elem.get_text(strip=True)
            if not name:
                return None

            # Get team from player info
            team_elem = player_cell.find("span", class_="CellPlayerName-team")
            if not team_elem:
                # Try getting team from a different location
                team_elem = player_cell.find("a", class_="CellPlayerName-team")
            if not team_elem:
                return None

            team_text = team_elem.get_text(strip=True)
            if not team_text or team_text.upper() == "FA":
                return None

            try:
                team = normalize_team(team_text)
                pos = normalize_position(position)
            except ValueError:
                return None

            key = create_player_key(name, pos, team)
            stats = self._parse_stats(cells[1:], headers[1:], position)

            return PlayerProjection(
                key=key,
                name=name,
                pos=pos,
                team=team,
                **stats,
            )

        except Exception:
            return None

    def _parse_stats(
        self, cells: list[Any], headers: list[str], position: str
    ) -> dict[str, float]:
        """Parse statistics from row cells.

        Args:
            cells: List of BeautifulSoup td elements containing stats.
            headers: List of header names corresponding to cells.
            position: The position being scraped.

        Returns:
            dict: Dictionary of stat name to value mappings.
        """
        stats: dict[str, float] = {}

        for i, cell in enumerate(cells):
            if i >= len(headers):
                break

            header = headers[i]
            if header in self.COLUMN_MAP:
                try:
                    text = cell.get_text(strip=True).replace(",", "")
                    if text and text != "-":
                        value = float(text)
                        stats[self.COLUMN_MAP[header]] = value
                except (ValueError, AttributeError):
                    pass

        return stats
