"""FantasyPros ADP scraper for Fantasy Football."""

from dataclasses import dataclass
from typing import Any, Optional

from bs4 import BeautifulSoup
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait

from scrapers.base import BaseScraper, PlayerProjection, ScraperConfig
from scrapers.constants import create_player_key, normalize_position, normalize_team


DEFAULT_CONFIG = ScraperConfig(name="FantasyPros", weight=1.2)


@dataclass
class ADPData:
    """Average Draft Position data from FantasyPros."""
    key: str
    name: str
    pos: str
    team: str
    bye: int
    std: float       # Standard scoring ADP
    half_ppr: float  # Half-PPR ADP
    ppr: float       # Full PPR ADP


URLS = {
    "std": "https://www.fantasypros.com/nfl/adp/overall.php",
    "half_ppr": "https://www.fantasypros.com/nfl/adp/half-point-ppr-overall.php",
    "ppr": "https://www.fantasypros.com/nfl/adp/ppr-overall.php",
}


class FantasyProsScraper(BaseScraper):
    """Scraper for FantasyPros ADP data."""

    def __init__(self, config: Optional[ScraperConfig] = None):
        """Initialize the FantasyPros scraper.

        Args:
            config: Optional scraper configuration. Uses DEFAULT_CONFIG if not provided.
        """
        super().__init__(config or DEFAULT_CONFIG)

    def get_source_name(self) -> str:
        """Return the source name for logging and identification.

        Returns:
            str: 'FantasyPros' as the source identifier.
        """
        return "FantasyPros"

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

    def scrape(self) -> list[ADPData]:
        """Scrape ADP data from FantasyPros for all scoring formats.

        Returns:
            list[ADPData]: A list of ADP data for all players.

        Raises:
            Exception: If scraping fails after retries.
        """
        # Dictionary to accumulate ADP data by player key
        adp_by_key: dict[str, dict[str, Any]] = {}

        for attempt in range(self.config.retry_count):
            try:
                self._driver = self._create_driver()

                # Scrape each scoring format
                for format_key, url in URLS.items():
                    self._driver.get(url)

                    # Wait for the ADP table to load
                    WebDriverWait(self._driver, self.config.timeout).until(
                        EC.presence_of_element_located((By.CSS_SELECTOR, "table.player-table, table#data"))
                    )

                    self._scroll_page()
                    format_data = self._parse_adp_page(format_key)

                    # Merge format data into accumulated data
                    for player_data in format_data:
                        key = player_data["key"]
                        if key not in adp_by_key:
                            adp_by_key[key] = {
                                "key": key,
                                "name": player_data["name"],
                                "pos": player_data["pos"],
                                "team": player_data["team"],
                                "bye": player_data["bye"],
                                "std": 0.0,
                                "half_ppr": 0.0,
                                "ppr": 0.0,
                            }
                        adp_by_key[key][format_key] = player_data["adp"]

                # Convert to ADPData objects
                result = [
                    ADPData(
                        key=data["key"],
                        name=data["name"],
                        pos=data["pos"],
                        team=data["team"],
                        bye=data["bye"],
                        std=data["std"],
                        half_ppr=data["half_ppr"],
                        ppr=data["ppr"],
                    )
                    for data in adp_by_key.values()
                ]

                return result

            except Exception as e:
                if attempt == self.config.retry_count - 1:
                    raise
            finally:
                if self._driver:
                    self._driver.quit()
                    self._driver = None

        return []

    def _scroll_page(self) -> None:
        """Scroll the page to load all dynamic content."""
        if not self._driver:
            return

        last_height = self._driver.execute_script("return document.body.scrollHeight")

        while True:
            self._driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
            # Wait for content to load
            try:
                WebDriverWait(self._driver, 2).until(
                    lambda d: d.execute_script("return document.body.scrollHeight") >= last_height
                )
            except Exception:
                pass
            new_height = self._driver.execute_script("return document.body.scrollHeight")
            if new_height == last_height:
                break
            last_height = new_height

    def _parse_adp_page(self, format_key: str) -> list[dict[str, Any]]:
        """Parse ADP data from the current page.

        Args:
            format_key: The scoring format being parsed ('std', 'half_ppr', or 'ppr').

        Returns:
            list[dict]: List of dictionaries with player ADP data for this format.
        """
        if not self._driver:
            return []

        players: list[dict[str, Any]] = []
        soup = BeautifulSoup(self._driver.page_source, "html.parser")

        # FantasyPros uses a table with class 'player-table' or id 'data'
        table = soup.find("table", class_="player-table") or soup.find("table", id="data")
        if not table:
            return players

        tbody = table.find("tbody")
        if not tbody:
            return players

        rows = tbody.find_all("tr")

        for row in rows:
            player_data = self._parse_player_row(row)
            if player_data:
                players.append(player_data)

        return players

    def _parse_player_row(self, row: Any) -> Optional[dict[str, Any]]:
        """Parse a single player row from the ADP table.

        Args:
            row: BeautifulSoup element containing player data.

        Returns:
            dict with player data if valid, None otherwise.
        """
        try:
            cells = row.find_all("td")
            if len(cells) < 4:
                return None

            # Find player name - typically in a cell with class 'player-name' or similar
            player_cell = row.find("td", class_="player-label") or cells[1]
            name_elem = player_cell.find("a", class_="player-name") or player_cell.find("a")

            if not name_elem:
                return None

            name = name_elem.get_text(strip=True)

            # Get position and team from small text or separate elements
            small_elem = player_cell.find("small") or player_cell.find("span", class_="player-position")
            if small_elem:
                pos_team_text = small_elem.get_text(strip=True)
                # Format is typically "POS - TEAM" or "POS TEAM"
                parts = pos_team_text.replace("-", " ").split()
                if len(parts) >= 2:
                    pos_text = parts[0]
                    team_text = parts[-1]
                elif len(parts) == 1:
                    pos_text = parts[0]
                    team_text = "FA"
                else:
                    return None
            else:
                return None

            # Get bye week
            bye = 0
            bye_cell = row.find("td", class_="player-bye") or (cells[2] if len(cells) > 2 else None)
            if bye_cell:
                bye_text = bye_cell.get_text(strip=True)
                try:
                    bye = int(bye_text)
                except ValueError:
                    bye = 0

            # Get ADP value (usually in the last cell or a cell with 'avg' class)
            adp = 0.0
            adp_cell = row.find("td", class_="adp") or cells[-1]
            if adp_cell:
                adp_text = adp_cell.get_text(strip=True)
                try:
                    adp = float(adp_text)
                except ValueError:
                    adp = 0.0

            # Skip free agents
            if team_text.upper() == "FA":
                return None

            try:
                pos = normalize_position(pos_text)
                team = normalize_team(team_text)
            except ValueError:
                return None

            key = create_player_key(name, pos, team)

            return {
                "key": key,
                "name": name,
                "pos": pos,
                "team": team,
                "bye": bye,
                "adp": adp,
            }

        except Exception:
            return None
