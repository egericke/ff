"""ESPN Fantasy Football projections scraper."""

from typing import Any, Optional

from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from scrapers.base import BaseScraper, PlayerProjection, ScraperConfig
from scrapers.constants import create_player_key, normalize_position, normalize_team


DEFAULT_CONFIG = ScraperConfig(name="ESPN", weight=1.0)


class ESPNScraper(BaseScraper):
    """Scraper for ESPN Fantasy Football projections."""

    URL = "http://fantasy.espn.com/football/players/projections"

    def __init__(self, config: Optional[ScraperConfig] = None):
        """Initialize the ESPN scraper.

        Args:
            config: Optional scraper configuration. Uses DEFAULT_CONFIG if not provided.
        """
        super().__init__(config or DEFAULT_CONFIG)

    def get_source_name(self) -> str:
        """Return the source name for logging and identification.

        Returns:
            str: 'ESPN' as the source identifier.
        """
        return "ESPN"

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
        """Scrape projections from ESPN.

        Returns:
            list[PlayerProjection]: A list of player projections from ESPN.

        Raises:
            Exception: If scraping fails after retries.
        """
        projections: list[PlayerProjection] = []

        for attempt in range(self.config.retry_count):
            try:
                self._driver = self._create_driver()
                self._driver.get(self.URL)

                # Wait for page to load
                WebDriverWait(self._driver, self.config.timeout).until(
                    EC.presence_of_element_located((By.CLASS_NAME, "full-projection-table"))
                )

                while True:
                    self._scroll_page()
                    page_projections = self._parse_page()
                    projections.extend(page_projections)

                    if not self._go_to_next_page():
                        break

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
            # Wait for content to load
            WebDriverWait(self._driver, 2).until(
                lambda d: d.execute_script("return document.body.scrollHeight") >= last_height
            )
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
            next_button = self._driver.find_element(By.CSS_SELECTOR, "button.next-page")
            if next_button.is_enabled():
                next_button.click()
                WebDriverWait(self._driver, self.config.timeout).until(
                    EC.staleness_of(next_button)
                )
                return True
        except Exception:
            pass

        return False

    def _parse_page(self) -> list[PlayerProjection]:
        """Parse all player projections from the current page.

        Returns:
            list[PlayerProjection]: Projections parsed from the current page.
        """
        if not self._driver:
            return []

        projections: list[PlayerProjection] = []
        soup = BeautifulSoup(self._driver.page_source, "html.parser")
        player_rows = soup.find_all("div", class_="full-projection-table")

        for row in player_rows:
            projection = self._parse_player(row)
            if projection:
                projections.append(projection)

        return projections

    def _parse_player(self, row: Any) -> Optional[PlayerProjection]:
        """Parse a single player row into a PlayerProjection.

        Args:
            row: BeautifulSoup element containing player data.

        Returns:
            PlayerProjection if valid player data found, None otherwise.
        """
        try:
            name_elem = row.find("span", class_="player-name")
            if not name_elem:
                return None
            name = name_elem.get_text(strip=True)

            # Handle D/ST players
            if "D/ST" in name:
                pos = "DST"
                # Extract team name from "Eagles D/ST" -> "Eagles"
                team_name = name.replace("D/ST", "").strip()
                try:
                    team = normalize_team(team_name)
                except ValueError:
                    return None

                key = create_player_key(name, pos, team)
                stats = self._parse_stats_row(row)

                return PlayerProjection(
                    key=key,
                    name=name,
                    pos=pos,
                    team=team,
                    **stats
                )

            # Regular player
            pos_elem = row.find("span", class_="position-eligibility")
            team_elem = row.find("span", class_="player-teamname")

            if not pos_elem or not team_elem:
                return None

            pos_text = pos_elem.get_text(strip=True)
            team_text = team_elem.get_text(strip=True)

            # Skip free agents
            if team_text.upper() == "FA":
                return None

            try:
                pos = normalize_position(pos_text)
                team = normalize_team(team_text)
            except ValueError:
                return None

            key = create_player_key(name, pos, team)
            stats = self._parse_stats_row(row)

            return PlayerProjection(
                key=key,
                name=name,
                pos=pos,
                team=team,
                **stats
            )

        except Exception:
            return None

    def _parse_stats_row(self, row: Any) -> dict[str, float]:
        """Parse statistics from a player row.

        Args:
            row: BeautifulSoup element containing player stats.

        Returns:
            dict: Dictionary of stat name to value mappings.
        """
        stats: dict[str, float] = {}

        stat_table = row.find("div", class_="player-stat-table")
        if not stat_table:
            return stats

        table = stat_table.find("table")
        if not table:
            return stats

        tbody = table.find("tbody")
        if not tbody:
            return stats

        rows = tbody.find_all("tr")
        if len(rows) < 2:
            return stats

        # Data is in second row
        data_row = rows[1]
        cells = data_row.find_all("td")

        stat_mapping = {
            "Passing_Yards": "pass_yds",
            "TD_Pass": "pass_tds",
            "Interceptions": "pass_ints",
            "Rushing_Yards": "rush_yds",
            "TD_Rush": "rush_tds",
            "Receptions": "receptions",
            "Receiving_Yards": "rec_yds",
            "TD_Rec": "rec_tds",
            "Fumbles": "fumbles",
            "2PT": "two_pts",
            "FG_0-19": "kick_0_19",
            "FG_20-29": "kick_20_29",
            "FG_30-39": "kick_30_39",
            "FG_40-49": "kick_40_49",
            "FG_50+": "kick_50",
            "XP": "kick_xp",
            "Sacks": "dst_sacks",
            "INT": "dst_ints",
            "FR": "dst_fumbles",
            "TD": "dst_tds",
            "Safety": "dst_safeties",
            "PA/G": "dst_pa_per_game",
        }

        for cell in cells:
            div = cell.find("div")
            if div and div.get("title"):
                title = div.get("title")
                if title in stat_mapping:
                    try:
                        value = float(div.get_text(strip=True).replace(",", ""))
                        stats[stat_mapping[title]] = value
                    except ValueError:
                        pass

        return stats
