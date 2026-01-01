"""NFL Fantasy Football projections scraper."""

import time
from typing import Any, Optional

from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from scrapers.base import BaseScraper, PlayerProjection, ScraperConfig
from scrapers.constants import (
    TEAM_NAME_TO_ABBR,
    create_player_key,
    normalize_position,
    normalize_team,
)


DEFAULT_CONFIG = ScraperConfig(name="NFL", weight=0.8)


# Page definitions: (url, position_filter, column_headers)
# Each tuple defines a page to scrape with its URL, position filter, and expected columns
PAGES = [
    # Offensive players (QB, RB, WR, TE)
    (
        "https://fantasy.nfl.com/research/projections?position=O&statCategory=projectedStats&statSeason=2024&statType=seasonProjectedStats",
        ["QB", "RB", "WR", "TE"],
        ["pass_yds", "pass_tds", "pass_ints", "rush_yds", "rush_tds", "receptions", "rec_yds", "rec_tds", "fumbles"],
    ),
    # Kickers
    (
        "https://fantasy.nfl.com/research/projections?position=K&statCategory=projectedStats&statSeason=2024&statType=seasonProjectedStats",
        ["K"],
        ["kick_xp", "kick_0_19", "kick_20_29", "kick_30_39", "kick_40_49", "kick_50"],
    ),
    # Defense/Special Teams
    (
        "https://fantasy.nfl.com/research/projections?position=DEF&statCategory=projectedStats&statSeason=2024&statType=seasonProjectedStats",
        ["DST"],
        ["dst_sacks", "dst_ints", "dst_fumbles", "dst_tds", "dst_safeties", "dst_pa_per_game"],
    ),
]


class NFLScraper(BaseScraper):
    """Scraper for NFL.com Fantasy Football projections."""

    def __init__(self, config: Optional[ScraperConfig] = None):
        """Initialize the NFL scraper.

        Args:
            config: Optional scraper configuration. Uses DEFAULT_CONFIG if not provided.
        """
        super().__init__(config or DEFAULT_CONFIG)

    def get_source_name(self) -> str:
        """Return the source name for logging and identification.

        Returns:
            str: 'NFL' as the source identifier.
        """
        return "NFL"

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
        """Scrape projections from NFL.com.

        Returns:
            list[PlayerProjection]: A list of player projections from NFL.com.

        Raises:
            Exception: If scraping fails after retries.
        """
        projections: list[PlayerProjection] = []

        for attempt in range(self.config.retry_count):
            try:
                self._driver = self._create_driver()

                for url, position_filter, column_headers in PAGES:
                    page_projections = self._scrape_page(url, position_filter, column_headers)
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

    def _scrape_page(
        self, url: str, position_filter: list[str], column_headers: list[str]
    ) -> list[PlayerProjection]:
        """Scrape a single page of projections with pagination support.

        Args:
            url: The URL to scrape.
            position_filter: List of positions expected on this page.
            column_headers: List of stat column names for parsing.

        Returns:
            list[PlayerProjection]: Projections from all pages of this URL.
        """
        if not self._driver:
            return []

        projections: list[PlayerProjection] = []
        self._driver.get(url)

        # Wait for table to load
        try:
            WebDriverWait(self._driver, self.config.timeout).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "table.tableType-player"))
            )
        except Exception:
            # Table might not exist or page structure changed
            return projections

        while True:
            self._scroll_page()
            page_projections = self._parse_table(position_filter, column_headers)
            projections.extend(page_projections)

            if not self._go_to_next_page():
                break

        return projections

    def _scroll_page(self) -> None:
        """Scroll the page to load all dynamic content."""
        if not self._driver:
            return

        last_height = self._driver.execute_script("return document.body.scrollHeight")

        while True:
            self._driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
            time.sleep(0.5)  # Brief pause to allow content to load
            new_height = self._driver.execute_script("return document.body.scrollHeight")
            if new_height == last_height:
                break
            last_height = new_height

    def _go_to_next_page(self) -> bool:
        """Navigate to the next page of projections.

        Returns:
            bool: True if successfully navigated to next page, False otherwise.
        """
        if not self._driver:
            return False

        try:
            # Look for next page link in NFL's pagination
            next_link = self._driver.find_element(By.CSS_SELECTOR, "a.next")
            if next_link and "disabled" not in next_link.get_attribute("class"):
                next_link.click()
                # Wait for table to reload
                time.sleep(1)
                WebDriverWait(self._driver, self.config.timeout).until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, "table.tableType-player"))
                )
                return True
        except Exception:
            pass

        return False

    def _parse_table(
        self, position_filter: list[str], column_headers: list[str]
    ) -> list[PlayerProjection]:
        """Parse the player table on the current page.

        Args:
            position_filter: List of positions expected on this page.
            column_headers: List of stat column names for parsing.

        Returns:
            list[PlayerProjection]: Projections parsed from the table.
        """
        if not self._driver:
            return []

        projections: list[PlayerProjection] = []
        soup = BeautifulSoup(self._driver.page_source, "html.parser")

        table = soup.find("table", class_="tableType-player")
        if not table:
            return projections

        tbody = table.find("tbody")
        if not tbody:
            return projections

        rows = tbody.find_all("tr")
        for row in rows:
            projection = self._parse_row(row, position_filter, column_headers)
            if projection:
                projections.append(projection)

        return projections

    def _parse_row(
        self, row: Any, position_filter: list[str], column_headers: list[str]
    ) -> Optional[PlayerProjection]:
        """Parse a single player row into a PlayerProjection.

        Args:
            row: BeautifulSoup element containing player data.
            position_filter: List of valid positions for this page.
            column_headers: List of stat column names for parsing.

        Returns:
            PlayerProjection if valid player data found, None otherwise.
        """
        try:
            # Find player info cell
            player_cell = row.find("td", class_="playerNameAndInfo")
            if not player_cell:
                return None

            # Extract player name
            name_elem = player_cell.find("a", class_="playerName")
            if not name_elem:
                return None
            name = name_elem.get_text(strip=True)

            # Handle DST players - name is like "Eagles Defense"
            if "DST" in position_filter:
                return self._parse_dst_row(row, name, column_headers)

            # Extract position and team
            em_elem = player_cell.find("em")
            if not em_elem:
                return None
            player_info = em_elem.get_text(strip=True)

            # Parse "POS - TEAM" format (e.g., "QB - KC")
            parts = player_info.split(" - ")
            if len(parts) < 2:
                return None

            pos_text = parts[0].strip()
            team_text = parts[1].strip()

            try:
                pos = normalize_position(pos_text)
                team = normalize_team(team_text)
            except ValueError:
                return None

            # Skip if position not in filter
            if pos not in position_filter:
                return None

            key = create_player_key(name, pos, team)
            stats = self._parse_stats(row, column_headers)

            return PlayerProjection(
                key=key,
                name=name,
                pos=pos,
                team=team,
                **stats
            )

        except Exception:
            return None

    def _parse_dst_row(
        self, row: Any, name: str, column_headers: list[str]
    ) -> Optional[PlayerProjection]:
        """Parse a DST row into a PlayerProjection.

        DST names on NFL.com are like "Eagles Defense" - we need to extract
        the team name and convert to abbreviation.

        Args:
            row: BeautifulSoup element containing player data.
            name: The raw DST name (e.g., "Eagles Defense").
            column_headers: List of stat column names for parsing.

        Returns:
            PlayerProjection if valid DST data found, None otherwise.
        """
        try:
            # Extract team name from "Eagles Defense" -> "Eagles"
            team_name = name.replace("Defense", "").strip()

            # Use TEAM_NAME_TO_ABBR to normalize
            if team_name not in TEAM_NAME_TO_ABBR:
                return None

            team = TEAM_NAME_TO_ABBR[team_name]
            pos = "DST"

            key = create_player_key(name, pos, team)
            stats = self._parse_stats(row, column_headers)

            return PlayerProjection(
                key=key,
                name=name,
                pos=pos,
                team=team,
                **stats
            )

        except Exception:
            return None

    def _parse_stats(self, row: Any, column_headers: list[str]) -> dict[str, float]:
        """Parse statistics from a player row.

        Args:
            row: BeautifulSoup element containing player stats.
            column_headers: List of stat column names in order.

        Returns:
            dict: Dictionary of stat name to value mappings.
        """
        stats: dict[str, float] = {}

        # Get all stat cells (skip the player info cell)
        cells = row.find_all("td", class_="stat")

        for i, cell in enumerate(cells):
            if i >= len(column_headers):
                break

            stat_name = column_headers[i]
            try:
                value_text = cell.get_text(strip=True).replace(",", "")
                if value_text and value_text != "-":
                    stats[stat_name] = float(value_text)
            except ValueError:
                pass

        return stats
