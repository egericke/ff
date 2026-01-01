# Advanced VOR Modeling - Phase 2: Data Layer

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a modular data pipeline with enhanced scrapers that collect advanced stats, injury data, and schedule information to feed the TypeScript VOR engine.

**Architecture:** Refactor monolithic `scrape.py` into a modular scraper system with base class, individual source scrapers, and processors for risk calculation, schedule analysis, and data normalization. Output enhanced JSON matching the TypeScript models.

**Tech Stack:** Python 3.11+, pytest, pandas, numpy, beautifulsoup4, selenium, requests

---

## Task 1: Create Base Scraper Class

**Files:**
- Create: `data/scrapers/__init__.py`
- Create: `data/scrapers/base.py`
- Create: `data/scrapers/tests/__init__.py`
- Create: `data/scrapers/tests/test_base.py`

**Interfaces:**

```python
# data/scrapers/base.py
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional
import pandas as pd

@dataclass
class ScraperConfig:
    """Configuration for a scraper."""
    name: str
    weight: float  # Source reliability weight (0.8-1.2)
    timeout: int = 30
    retry_count: int = 3
    headless: bool = True

@dataclass
class PlayerProjection:
    """Raw projection data from a single source."""
    key: str
    name: str
    pos: str
    team: str

    # Basic projections
    pass_yds: float = 0.0
    pass_tds: float = 0.0
    pass_ints: float = 0.0
    rush_yds: float = 0.0
    rush_tds: float = 0.0
    receptions: float = 0.0
    rec_yds: float = 0.0
    rec_tds: float = 0.0
    fumbles: float = 0.0
    two_pts: float = 0.0

    # Kicker stats
    kick_0_19: float = 0.0
    kick_20_29: float = 0.0
    kick_30_39: float = 0.0
    kick_40_49: float = 0.0
    kick_50: float = 0.0
    kick_xp: float = 0.0

    # DST stats
    dst_sacks: float = 0.0
    dst_ints: float = 0.0
    dst_fumbles: float = 0.0
    dst_tds: float = 0.0
    dst_safeties: float = 0.0
    dst_pa_per_game: float = 0.0

    # Advanced stats (when available)
    target_share: Optional[float] = None
    snap_pct: Optional[float] = None
    red_zone_targets: Optional[float] = None
    red_zone_carries: Optional[float] = None
    air_yards: Optional[float] = None
    yards_after_contact: Optional[float] = None

class BaseScraper(ABC):
    """Abstract base class for all scrapers."""

    def __init__(self, config: ScraperConfig):
        self.config = config
        self._driver = None

    @abstractmethod
    def scrape(self) -> list[PlayerProjection]:
        """Scrape projections from the source."""
        pass

    @abstractmethod
    def get_source_name(self) -> str:
        """Return the source name for logging."""
        pass

    def to_dataframe(self, projections: list[PlayerProjection]) -> pd.DataFrame:
        """Convert projections to DataFrame."""
        pass

    def validate(self, df: pd.DataFrame, strict: bool = True) -> bool:
        """Validate scraped data meets minimum requirements."""
        pass
```

**Tests:**

```python
# data/scrapers/tests/test_base.py
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
```

---

## Task 2: Create Team Constants and Utilities

**Files:**
- Create: `data/scrapers/constants.py`
- Create: `data/scrapers/tests/test_constants.py`

**Implementation:**

```python
# data/scrapers/constants.py
"""Team mappings and constants used across scrapers."""

TEAM_ABBREVIATIONS = {
    "ARI", "ATL", "BAL", "BUF", "CAR", "CHI", "CIN", "CLE",
    "DAL", "DEN", "DET", "GB", "HOU", "IND", "JAX", "KC",
    "LAC", "LAR", "LV", "MIA", "MIN", "NE", "NO", "NYG",
    "NYJ", "PHI", "PIT", "SEA", "SF", "TB", "TEN", "WSH"
}

TEAM_NAME_TO_ABBR = {
    "Cardinals": "ARI", "Arizona": "ARI",
    "Falcons": "ATL", "Atlanta": "ATL",
    "Ravens": "BAL", "Baltimore": "BAL",
    "Bills": "BUF", "Buffalo": "BUF",
    "Panthers": "CAR", "Carolina": "CAR",
    "Bears": "CHI", "Chicago": "CHI",
    "Bengals": "CIN", "Cincinnati": "CIN",
    "Browns": "CLE", "Cleveland": "CLE",
    "Cowboys": "DAL", "Dallas": "DAL",
    "Broncos": "DEN", "Denver": "DEN",
    "Lions": "DET", "Detroit": "DET",
    "Packers": "GB", "Green Bay": "GB",
    "Texans": "HOU", "Houston": "HOU",
    "Colts": "IND", "Indianapolis": "IND",
    "Jaguars": "JAX", "Jacksonville": "JAX",
    "Chiefs": "KC", "Kansas City": "KC",
    "Chargers": "LAC", "L.A. Chargers": "LAC", "Los Angeles Chargers": "LAC",
    "Rams": "LAR", "L.A. Rams": "LAR", "Los Angeles Rams": "LAR",
    "Raiders": "LV", "Las Vegas": "LV",
    "Dolphins": "MIA", "Miami": "MIA",
    "Vikings": "MIN", "Minnesota": "MIN",
    "Patriots": "NE", "New England": "NE",
    "Saints": "NO", "New Orleans": "NO",
    "Giants": "NYG", "N.Y. Giants": "NYG", "New York Giants": "NYG",
    "Jets": "NYJ", "N.Y. Jets": "NYJ", "New York Jets": "NYJ",
    "Eagles": "PHI", "Philadelphia": "PHI",
    "Steelers": "PIT", "Pittsburgh": "PIT",
    "Seahawks": "SEA", "Seattle": "SEA",
    "49ers": "SF", "San Francisco": "SF",
    "Buccaneers": "TB", "Tampa Bay": "TB",
    "Titans": "TEN", "Tennessee": "TEN",
    "Commanders": "WSH", "Washington": "WSH",
}

# Legacy mappings for older data sources
LEGACY_TEAM_FIXES = {
    "WAS": "WSH",
    "JAC": "JAX",
    "LA": "LAR",
}

POSITIONS = {"QB", "RB", "WR", "TE", "K", "DST"}

POSITION_ALIASES = {
    "FB": "RB",
    "D/ST": "DST",
    "DEF": "DST",
}

def normalize_team(team: str) -> str:
    """Normalize team name/abbreviation to standard 2-3 letter code."""
    team = team.strip().upper()
    if team in TEAM_ABBREVIATIONS:
        return team
    if team in LEGACY_TEAM_FIXES:
        return LEGACY_TEAM_FIXES[team]
    # Try name lookup
    for name, abbr in TEAM_NAME_TO_ABBR.items():
        if name.upper() == team:
            return abbr
    raise ValueError(f"Unknown team: {team}")

def normalize_position(pos: str) -> str:
    """Normalize position to standard code."""
    pos = pos.strip().upper()
    if pos in POSITIONS:
        return pos
    if pos in POSITION_ALIASES:
        return POSITION_ALIASES[pos]
    raise ValueError(f"Unknown position: {pos}")

def create_player_key(name: str, pos: str, team: str) -> str:
    """Create unique player key from name, position, and team."""
    import re
    # Clean name: lowercase, remove suffixes, keep only letters/spaces
    clean_name = name.lower().replace("sr", "").replace("jr", "").replace(".", "").strip()
    clean_name = re.sub(r"[^a-z ]+", "", clean_name).strip()
    parts = clean_name.split()
    last_name = parts[-1] if parts else clean_name
    return f"{last_name}_{pos.lower()}_{team.lower()}"
```

**Tests:**

```python
# data/scrapers/tests/test_constants.py
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
```

---

## Task 3: Create ESPN Scraper

**Files:**
- Create: `data/scrapers/espn.py`
- Create: `data/scrapers/tests/test_espn.py`

**Implementation:**

```python
# data/scrapers/espn.py
"""ESPN fantasy football projections scraper."""

import logging
import time
from typing import Optional

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from bs4 import BeautifulSoup

from .base import BaseScraper, ScraperConfig, PlayerProjection
from .constants import normalize_team, normalize_position, create_player_key, TEAM_NAME_TO_ABBR

logger = logging.getLogger(__name__)

DEFAULT_CONFIG = ScraperConfig(
    name="ESPN",
    weight=1.0,  # Solid baseline
    timeout=30,
    retry_count=3,
    headless=True
)

class ESPNScraper(BaseScraper):
    """Scraper for ESPN fantasy football projections."""

    URL = "http://fantasy.espn.com/football/players/projections"

    def __init__(self, config: Optional[ScraperConfig] = None):
        super().__init__(config or DEFAULT_CONFIG)

    def get_source_name(self) -> str:
        return "ESPN"

    def _create_driver(self) -> webdriver.Chrome:
        """Create configured Chrome driver."""
        options = webdriver.ChromeOptions()
        options.add_argument("start-maximized")
        options.add_argument("--window-size=1200x900")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-gpu")
        if self.config.headless:
            options.add_argument("--headless")

        return webdriver.Chrome(
            options=options,
            service=Service(ChromeDriverManager().install())
        )

    def scrape(self) -> list[PlayerProjection]:
        """Scrape ESPN projections."""
        logger.info("Starting ESPN scrape")
        driver = self._create_driver()

        try:
            driver.get(self.URL)
            time.sleep(5)  # Wait for React app

            projections = []
            page = 1

            while True:
                time.sleep(1)
                self._scroll_page(driver)
                time.sleep(1)

                soup = BeautifulSoup(
                    driver.execute_script("return document.body.innerHTML"),
                    "html.parser"
                )

                page_projections = self._parse_page(soup)
                projections.extend(page_projections)

                # Try to go to next page
                if not self._go_to_next_page(driver, page):
                    break

                page += 1
                if page % 5 == 0:
                    logger.info(f"ESPN: page={page}, players={len(projections)}")

            logger.info(f"ESPN scrape complete: {len(projections)} players")
            return projections

        finally:
            driver.quit()

    def _scroll_page(self, driver: webdriver.Chrome) -> None:
        """Scroll to bottom to load all content."""
        driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")

    def _go_to_next_page(self, driver: webdriver.Chrome, current_page: int) -> bool:
        """Attempt to navigate to next page. Returns False if no more pages."""
        try:
            next_button = driver.find_element(By.ID, str(current_page + 1))
            ActionChains(driver).move_to_element(next_button).perform()
            next_button.send_keys(Keys.ENTER)
            return True
        except Exception:
            return False

    def _parse_page(self, soup: BeautifulSoup) -> list[PlayerProjection]:
        """Parse player projections from page HTML."""
        projections = []

        for player_div in soup.select("div.full-projection-table"):
            try:
                proj = self._parse_player(player_div)
                if proj:
                    projections.append(proj)
            except Exception as e:
                logger.warning(f"Failed to parse player: {e}")

        return projections

    def _parse_player(self, player_div) -> Optional[PlayerProjection]:
        """Parse single player projection."""
        name = player_div.select(".player-name")[0].get_text().strip()

        # Handle D/ST
        if "D/ST" in name:
            team_name = name.replace(" D/ST", "").strip()
            if team_name not in TEAM_NAME_TO_ABBR:
                return None
            team = TEAM_NAME_TO_ABBR[team_name]
            pos = "DST"
        else:
            if not player_div.select(".position-eligibility"):
                return None
            pos = player_div.select(".position-eligibility")[0].get_text().strip()
            team_name = player_div.select(".player-teamname")[0].get_text().strip()
            if team_name == "FA":
                return None  # Skip free agents
            try:
                team = normalize_team(team_name)
                pos = normalize_position(pos)
            except ValueError:
                return None

        # Parse stats table
        table = player_div.select(".player-stat-table")[0]
        projection_row = table.find("tbody").find_all("tr")[1]

        stats = self._parse_stats_row(projection_row)

        return PlayerProjection(
            key=create_player_key(name, pos, team),
            name=name,
            pos=pos,
            team=team,
            **stats
        )

    def _parse_stats_row(self, row) -> dict:
        """Parse stats from table row."""
        headers = [e.find("div").get("title") for e in row.find_all("td")][1:]
        values = [e.get_text().lower() for e in row][1:]

        stats = {}
        column_map = {
            "passing_yards": "pass_yds",
            "td_pass": "pass_tds",
            "interceptions_thrown": "pass_ints",
            "rushing_yards": "rush_yds",
            "td_rush": "rush_tds",
            "each_reception": "receptions",
            "receiving_yards": "rec_yds",
            "td_reception": "rec_tds",
        }

        for header, value in zip(headers, values):
            if header is None:
                continue
            header = header.strip().lower().replace(" ", "_")

            if "/" in value:
                continue  # Skip compound values for now

            try:
                if value == "--" or value == "-":
                    continue
                parsed = float(value)
                if header in column_map:
                    stats[column_map[header]] = parsed
            except ValueError:
                continue

        return stats
```

**Tests:**

```python
# data/scrapers/tests/test_espn.py
import pytest
from unittest.mock import MagicMock, patch
from bs4 import BeautifulSoup

from scrapers.espn import ESPNScraper, DEFAULT_CONFIG

class TestESPNScraper:
    def test_default_config(self):
        scraper = ESPNScraper()
        assert scraper.config.name == "ESPN"
        assert scraper.config.weight == 1.0

    def test_custom_config(self):
        from scrapers.base import ScraperConfig
        config = ScraperConfig(name="ESPN-Test", weight=1.1)
        scraper = ESPNScraper(config)
        assert scraper.config.name == "ESPN-Test"

    def test_get_source_name(self):
        scraper = ESPNScraper()
        assert scraper.get_source_name() == "ESPN"

class TestESPNParsePlayer:
    @pytest.fixture
    def scraper(self):
        return ESPNScraper()

    def test_parse_regular_player(self, scraper):
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
        player_div = soup.select("div.full-projection-table")[0]

        proj = scraper._parse_player(player_div)

        assert proj is not None
        assert proj.name == "Patrick Mahomes"
        assert proj.pos == "QB"
        assert proj.team == "KC"

    def test_parse_dst(self, scraper):
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
        player_div = soup.select("div.full-projection-table")[0]

        proj = scraper._parse_player(player_div)

        assert proj is not None
        assert proj.pos == "DST"
        assert proj.team == "PHI"

    def test_skip_free_agent(self, scraper):
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
        player_div = soup.select("div.full-projection-table")[0]

        proj = scraper._parse_player(player_div)
        assert proj is None
```

---

## Task 4: Create CBS Scraper

**Files:**
- Create: `data/scrapers/cbs.py`
- Create: `data/scrapers/tests/test_cbs.py`

**Implementation:**

```python
# data/scrapers/cbs.py
"""CBS Sports fantasy football projections scraper."""

import logging
import time
import datetime
from typing import Optional

from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from bs4 import BeautifulSoup, NavigableString

from .base import BaseScraper, ScraperConfig, PlayerProjection
from .constants import normalize_team, normalize_position, create_player_key, TEAM_NAME_TO_ABBR

logger = logging.getLogger(__name__)

DEFAULT_CONFIG = ScraperConfig(
    name="CBS",
    weight=0.9,  # Conservative projections
    timeout=30,
    retry_count=3,
    headless=True
)

YEAR = datetime.datetime.now().year

class CBSScraper(BaseScraper):
    """Scraper for CBS Sports fantasy football projections."""

    BASE_URL = "https://www.cbssports.com/fantasy/football/stats"

    def __init__(self, config: Optional[ScraperConfig] = None):
        super().__init__(config or DEFAULT_CONFIG)

    def get_source_name(self) -> str:
        return "CBS"

    def _create_driver(self) -> webdriver.Chrome:
        """Create configured Chrome driver."""
        options = webdriver.ChromeOptions()
        options.add_argument("start-maximized")
        options.add_argument("--window-size=1200x900")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-gpu")
        if self.config.headless:
            options.add_argument("--headless")

        return webdriver.Chrome(
            options=options,
            service=Service(ChromeDriverManager().install())
        )

    def scrape(self) -> list[PlayerProjection]:
        """Scrape CBS projections for all positions."""
        logger.info("Starting CBS scrape")
        driver = self._create_driver()

        try:
            projections = []

            for pos in ["QB", "RB", "WR", "TE", "DST", "K"]:
                url = f"{self.BASE_URL}/{pos}/{YEAR}/season/projections/ppr/"
                logger.info(f"Scraping CBS {pos}: {url}")

                driver.get(url)
                time.sleep(2)
                self._scroll_page(driver)
                time.sleep(2)

                soup = BeautifulSoup(
                    driver.execute_script("return document.body.innerHTML"),
                    "html.parser"
                )

                pos_projections = self._parse_position_page(soup, pos)
                projections.extend(pos_projections)
                logger.info(f"CBS {pos}: {len(pos_projections)} players")

            logger.info(f"CBS scrape complete: {len(projections)} players")
            return projections

        finally:
            driver.quit()

    def _scroll_page(self, driver: webdriver.Chrome) -> None:
        """Scroll to bottom to load all content."""
        driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")

    def _parse_position_page(self, soup: BeautifulSoup, default_pos: str) -> list[PlayerProjection]:
        """Parse projections for a position page."""
        projections = []

        table = soup.select(".TableBase-table")
        if not table:
            logger.warning(f"No table found for {default_pos}")
            return projections

        table = table[0]
        headers = self._parse_headers(soup)

        table_body = table.find("tbody")
        for row in table_body.find_all("tr"):
            if isinstance(row, NavigableString):
                continue
            if not row.find_all("td"):
                continue

            try:
                proj = self._parse_row(row, headers, default_pos)
                if proj:
                    projections.append(proj)
            except Exception as e:
                logger.warning(f"Failed to parse CBS row: {e}")

        return projections

    def _parse_headers(self, soup: BeautifulSoup) -> list[str]:
        """Extract column headers."""
        header_row = soup.find("thead").find_all("tr")[1]
        headers = [h.find("div").get_text().strip().lower().replace(" ", "_")
                   for h in header_row.find_all("th")[1:]]
        return ["name", "pos", "team"] + headers

    def _parse_row(self, row, headers: list[str], default_pos: str) -> Optional[PlayerProjection]:
        """Parse a single player row."""
        if default_pos != "DST":
            name_cell = row.select(".CellPlayerName--long")
            if not name_cell:
                return None
            name_cell = name_cell[0]

            if not name_cell.find("a"):
                return None

            name = name_cell.find("a").get_text().strip()
            pos_elem = name_cell.select(".CellPlayerName-position")
            team_elem = name_cell.select(".CellPlayerName-team")

            if not pos_elem or not team_elem:
                return None

            pos = normalize_position(pos_elem[0].get_text().strip())
            team = normalize_team(team_elem[0].get_text().strip())
        else:
            # DST parsing
            team_logo = row.select(".TeamLogoNameLockup")
            if not team_logo:
                return None
            team_abbr = team_logo[0].find("a").get("href").split("/")[3]
            team = normalize_team(team_abbr)
            name = team
            pos = "DST"

        # Parse stats
        stats = self._parse_stats(row, headers, pos)

        return PlayerProjection(
            key=create_player_key(name, pos, team),
            name=name,
            pos=pos,
            team=team,
            **stats
        )

    def _parse_stats(self, row, headers: list[str], pos: str) -> dict:
        """Parse stats from row cells."""
        column_map = {
            "passing_yards": "pass_yds",
            "touchdowns_passes": "pass_tds",
            "interceptions_thrown": "pass_ints",
            "rushing_yards": "rush_yds",
            "rushing_touchdowns": "rush_tds",
            "receptions": "receptions",
            "receiving_yards": "rec_yds",
            "receiving_touchdowns": "rec_tds",
            "fumbles_lost": "fumbles",
            "field_goals_1-19_yards": "kick_0_19",
            "field_goals_20-29_yards": "kick_20_29",
            "field_goals_30-39_yards": "kick_30_39",
            "field_goals_40-49_yards": "kick_40_49",
            "field_goals_50+_yards": "kick_50",
            "extra_points_made": "kick_xp",
            "sacks": "dst_sacks",
            "interceptions": "dst_ints",
            "defensive_fumbles_recovered": "dst_fumbles",
            "defensive_touchdowns": "dst_tds",
            "safeties": "dst_safeties",
            "points_allowed_per_game": "dst_pa_per_game",
        }

        stats = {}
        values = [td.get_text().strip().replace("—", "") for td in row.find_all("td")[1:]]

        for header, value in zip(headers[3:], values):
            if not value:
                continue
            try:
                parsed = float(value)
                if header in column_map:
                    stats[column_map[header]] = parsed
            except ValueError:
                continue

        return stats
```

**Tests:**

```python
# data/scrapers/tests/test_cbs.py
import pytest
from scrapers.cbs import CBSScraper, DEFAULT_CONFIG

class TestCBSScraper:
    def test_default_config(self):
        scraper = CBSScraper()
        assert scraper.config.name == "CBS"
        assert scraper.config.weight == 0.9

    def test_get_source_name(self):
        scraper = CBSScraper()
        assert scraper.get_source_name() == "CBS"

    def test_parse_stats(self):
        scraper = CBSScraper()
        headers = ["name", "pos", "team", "rushing_yards", "rushing_touchdowns"]

        class MockRow:
            def find_all(self, tag):
                if tag == "td":
                    return [
                        MockTd(""),  # Skip first
                        MockTd("1200"),
                        MockTd("12"),
                    ]
                return []

        class MockTd:
            def __init__(self, text):
                self._text = text
            def get_text(self):
                return self._text
            def strip(self):
                return self._text

        stats = scraper._parse_stats(MockRow(), headers, "RB")
        assert stats.get("rush_yds") == 1200.0
        assert stats.get("rush_tds") == 12.0
```

---

## Task 5: Create NFL Scraper

**Files:**
- Create: `data/scrapers/nfl.py`
- Create: `data/scrapers/tests/test_nfl.py`

**Implementation:**

```python
# data/scrapers/nfl.py
"""NFL.com fantasy football projections scraper."""

import logging
import time
import datetime
from typing import Optional

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from bs4 import BeautifulSoup, NavigableString

from .base import BaseScraper, ScraperConfig, PlayerProjection
from .constants import normalize_team, normalize_position, create_player_key, TEAM_NAME_TO_ABBR

logger = logging.getLogger(__name__)

DEFAULT_CONFIG = ScraperConfig(
    name="NFL",
    weight=0.8,  # Official but less analytical
    timeout=30,
    retry_count=3,
    headless=True
)

YEAR = datetime.datetime.now().year

class NFLScraper(BaseScraper):
    """Scraper for NFL.com fantasy football projections."""

    PAGES = [
        # (url, position_filter, column_headers)
        (
            f"https://fantasy.nfl.com/research/projections?position=O&sort=projectedPts&statCategory=projectedStats&statSeason={YEAR}&statType=seasonProjectedStats",
            None,  # All offensive positions
            ["pass_yds", "pass_tds", "pass_ints", "rush_yds", "rush_tds",
             "receptions", "rec_yds", "rec_tds", "ret_td", "fum_td", "two_pts", "fumbles"]
        ),
        (
            f"https://fantasy.nfl.com/research/projections?position=7&statCategory=projectedStats&statSeason={YEAR}&statType=seasonProjectedStats",
            "K",
            ["kick_xp", "kick_0_19", "kick_20_29", "kick_30_39", "kick_40_49", "kick_50"]
        ),
        (
            f"https://fantasy.nfl.com/research/projections?position=8&statCategory=projectedStats&statSeason={YEAR}&statType=seasonProjectedStats",
            "DST",
            ["dst_sacks", "dst_ints", "dst_fumbles", "dst_safeties", "dst_tds",
             "def_2pt_ret", "ret_td", "pts_allow"]
        ),
    ]

    def __init__(self, config: Optional[ScraperConfig] = None):
        super().__init__(config or DEFAULT_CONFIG)

    def get_source_name(self) -> str:
        return "NFL"

    def _create_driver(self) -> webdriver.Chrome:
        """Create configured Chrome driver."""
        options = webdriver.ChromeOptions()
        options.add_argument("start-maximized")
        options.add_argument("--window-size=1200x900")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-gpu")
        if self.config.headless:
            options.add_argument("--headless")

        return webdriver.Chrome(
            options=options,
            service=Service(ChromeDriverManager().install())
        )

    def scrape(self) -> list[PlayerProjection]:
        """Scrape NFL.com projections."""
        logger.info("Starting NFL scrape")
        driver = self._create_driver()

        try:
            projections = []

            for url, pos_filter, headers in self.PAGES:
                page_projections = self._scrape_page(driver, url, pos_filter, headers)
                projections.extend(page_projections)

            logger.info(f"NFL scrape complete: {len(projections)} players")
            return projections

        finally:
            driver.quit()

    def _scrape_page(self, driver: webdriver.Chrome, url: str,
                     pos_filter: Optional[str], headers: list[str]) -> list[PlayerProjection]:
        """Scrape a single page with pagination."""
        driver.get(url)
        time.sleep(1)
        self._scroll_page(driver)
        time.sleep(1)

        projections = []
        page = 0

        for _ in range(50):  # Max pages safety limit
            soup = BeautifulSoup(
                driver.execute_script("return document.body.innerHTML"),
                "html.parser"
            )

            table = soup.find("tbody")
            if not table:
                break

            for row in table.find_all("tr"):
                if isinstance(row, NavigableString):
                    continue
                if not row.find_all("td"):
                    continue

                try:
                    proj = self._parse_row(row, headers, pos_filter)
                    if proj:
                        projections.append(proj)
                except Exception as e:
                    logger.warning(f"Failed to parse NFL row: {e}")

            # Try next page
            if not self._go_to_next_page(driver):
                break

            page += 1
            if page % 5 == 0:
                logger.info(f"NFL: page={page}, players={len(projections)}")

        return projections

    def _scroll_page(self, driver: webdriver.Chrome) -> None:
        """Scroll to bottom to load all content."""
        driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")

    def _go_to_next_page(self, driver: webdriver.Chrome) -> bool:
        """Attempt to navigate to next page."""
        try:
            next_button = driver.find_element(By.CLASS_NAME, 'next')
            ActionChains(driver).click(next_button).perform()
            time.sleep(0.5)
            self._scroll_page(driver)
            time.sleep(0.5)
            return True
        except Exception:
            return False

    def _parse_row(self, row, headers: list[str], pos_filter: Optional[str]) -> Optional[PlayerProjection]:
        """Parse a single player row."""
        cells = row.find_all("td")
        if len(cells) < 4:
            return None

        name_cell = cells[0]
        name_elem = name_cell.select(".playerNameFull")
        if not name_elem:
            return None

        name = name_elem[0].get_text().strip()
        pos_team = name_cell.find("em").get_text().strip()
        pos_team_parts = [v.strip() for v in pos_team.split("-")]

        if pos_filter == "DST":
            # DST name is like "Eagles Defense"
            team_name = name.split(" ")[-1] if " " in name else name
            if team_name == "Defense":
                team_name = name.split(" ")[0]
            try:
                team = TEAM_NAME_TO_ABBR.get(team_name) or normalize_team(team_name)
            except ValueError:
                return None
            pos = "DST"
            name = team
        elif len(pos_team_parts) == 1:
            # Free agent
            return None
        else:
            pos = normalize_position(pos_team_parts[0])
            team = normalize_team(pos_team_parts[1])

        # Parse stats
        stats = {}
        stat_cells = [td.get_text().strip() for td in cells[3:]]

        for header, value in zip(headers, stat_cells):
            if value == "-" or not value:
                continue
            try:
                stats[header] = float(value)
            except ValueError:
                continue

        # Map to standard names
        mapped_stats = {
            "pass_yds": stats.get("pass_yds", 0.0),
            "pass_tds": stats.get("pass_tds", 0.0),
            "pass_ints": stats.get("pass_ints", 0.0),
            "rush_yds": stats.get("rush_yds", 0.0),
            "rush_tds": stats.get("rush_tds", 0.0),
            "receptions": stats.get("receptions", 0.0),
            "rec_yds": stats.get("rec_yds", 0.0),
            "rec_tds": stats.get("rec_tds", 0.0),
            "fumbles": stats.get("fumbles", 0.0),
            "two_pts": stats.get("two_pts", 0.0),
            "kick_xp": stats.get("kick_xp", 0.0),
            "kick_0_19": stats.get("kick_0_19", 0.0),
            "kick_20_29": stats.get("kick_20_29", 0.0),
            "kick_30_39": stats.get("kick_30_39", 0.0),
            "kick_40_49": stats.get("kick_40_49", 0.0),
            "kick_50": stats.get("kick_50", 0.0),
            "dst_sacks": stats.get("dst_sacks", 0.0),
            "dst_ints": stats.get("dst_ints", 0.0),
            "dst_fumbles": stats.get("dst_fumbles", 0.0),
            "dst_tds": stats.get("dst_tds", 0.0),
            "dst_safeties": stats.get("dst_safeties", 0.0),
            "dst_pa_per_game": stats.get("pts_allow", 0.0) / 17.0 if stats.get("pts_allow") else 0.0,
        }

        return PlayerProjection(
            key=create_player_key(name, pos, team),
            name=name,
            pos=pos,
            team=team,
            **{k: v for k, v in mapped_stats.items() if v != 0.0}
        )
```

**Tests:**

```python
# data/scrapers/tests/test_nfl.py
import pytest
from scrapers.nfl import NFLScraper, DEFAULT_CONFIG

class TestNFLScraper:
    def test_default_config(self):
        scraper = NFLScraper()
        assert scraper.config.name == "NFL"
        assert scraper.config.weight == 0.8

    def test_get_source_name(self):
        scraper = NFLScraper()
        assert scraper.get_source_name() == "NFL"

    def test_pages_defined(self):
        scraper = NFLScraper()
        assert len(scraper.PAGES) == 3  # Offense, K, DST
```

---

## Task 6: Create FantasyPros ADP Scraper

**Files:**
- Create: `data/scrapers/fantasypros.py`
- Create: `data/scrapers/tests/test_fantasypros.py`

**Implementation:**

```python
# data/scrapers/fantasypros.py
"""FantasyPros ADP and consensus rankings scraper."""

import logging
import time
import datetime
from typing import Optional
from dataclasses import dataclass

from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from bs4 import BeautifulSoup

from .base import BaseScraper, ScraperConfig
from .constants import normalize_team, normalize_position, create_player_key, TEAM_NAME_TO_ABBR

logger = logging.getLogger(__name__)

DEFAULT_CONFIG = ScraperConfig(
    name="FantasyPros",
    weight=1.2,  # Best consensus - combines 100+ experts
    timeout=30,
    retry_count=3,
    headless=True
)

YEAR = datetime.datetime.now().year

@dataclass
class ADPData:
    """ADP data from FantasyPros."""
    key: str
    name: str
    pos: str
    team: str
    bye: int
    std: float  # Standard scoring ADP
    half_ppr: float  # Half-PPR ADP
    ppr: float  # Full PPR ADP

class FantasyProsScraper(BaseScraper):
    """Scraper for FantasyPros ADP and rankings."""

    URLS = {
        "std": "https://www.fantasypros.com/nfl/adp/overall.php",
        "half_ppr": "https://www.fantasypros.com/nfl/adp/half-point-ppr-overall.php",
        "ppr": "https://www.fantasypros.com/nfl/adp/ppr-overall.php",
    }

    def __init__(self, config: Optional[ScraperConfig] = None):
        super().__init__(config or DEFAULT_CONFIG)

    def get_source_name(self) -> str:
        return "FantasyPros"

    def _create_driver(self) -> webdriver.Chrome:
        """Create configured Chrome driver."""
        options = webdriver.ChromeOptions()
        options.add_argument("start-maximized")
        options.add_argument("--window-size=1200x900")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-gpu")
        if self.config.headless:
            options.add_argument("--headless")

        return webdriver.Chrome(
            options=options,
            service=Service(ChromeDriverManager().install())
        )

    def scrape(self) -> list[ADPData]:
        """Scrape ADP from all scoring formats."""
        logger.info("Starting FantasyPros ADP scrape")
        driver = self._create_driver()

        try:
            # Collect ADP by player key
            adp_by_key: dict[str, dict] = {}

            for ppr_type, url in self.URLS.items():
                logger.info(f"Scraping FantasyPros {ppr_type}: {url}")

                driver.get(url)
                time.sleep(1.5)
                self._scroll_page(driver)
                time.sleep(1.5)

                soup = BeautifulSoup(
                    driver.execute_script("return document.body.innerHTML"),
                    "html.parser"
                )

                self._parse_adp_page(soup, ppr_type, adp_by_key)

            # Convert to ADPData objects
            adp_list = []
            for key, data in adp_by_key.items():
                adp_list.append(ADPData(
                    key=key,
                    name=data.get("name", ""),
                    pos=data.get("pos", ""),
                    team=data.get("team", ""),
                    bye=data.get("bye", 0),
                    std=data.get("std", 999.0),
                    half_ppr=data.get("half_ppr", 999.0),
                    ppr=data.get("ppr", 999.0),
                ))

            logger.info(f"FantasyPros scrape complete: {len(adp_list)} players")
            return adp_list

        finally:
            driver.quit()

    def _scroll_page(self, driver: webdriver.Chrome) -> None:
        """Scroll to bottom to load all content."""
        driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")

    def _parse_adp_page(self, soup: BeautifulSoup, ppr_type: str,
                        adp_by_key: dict[str, dict]) -> None:
        """Parse ADP page and update player dictionary."""
        table = soup.select(".player-table")
        if not table:
            logger.warning(f"No table found for {ppr_type}")
            return

        table_body = table[0].find("tbody")

        for tr in table_body.find_all("tr"):
            try:
                tds = tr.find_all("td")
                if len(tds) < 4:
                    continue

                name_team_bye = tds[1]
                if len(name_team_bye.find_all("small")) < 1:
                    continue

                name = name_team_bye.find_all("a")[0].get_text().strip()
                team_elem = name_team_bye.find_all("small")[0].get_text().strip()
                bye_elem = name_team_bye.find_all("small")[-1].get_text().strip()
                bye = int(bye_elem[1:-1]) if bye_elem.startswith("(") else 0

                # Get position (remove number suffix like WR15)
                pos_text = tds[2].get_text().strip()
                pos = "".join([c for c in pos_text if not c.isdigit()])

                # Handle DST
                if pos == "DST":
                    team_name = name.split(" ")[-2] if " " in name else name
                    try:
                        team = TEAM_NAME_TO_ABBR.get(team_name) or normalize_team(team_name)
                    except ValueError:
                        continue
                    name = team
                else:
                    try:
                        team = normalize_team(team_elem)
                        pos = normalize_position(pos)
                    except ValueError:
                        continue

                # Get ADP value
                adp_text = tds[-2].get_text().strip().replace(",", "")
                try:
                    adp = float(adp_text)
                except ValueError:
                    continue

                key = create_player_key(name, pos, team)

                if key not in adp_by_key:
                    adp_by_key[key] = {
                        "name": name,
                        "pos": pos,
                        "team": team,
                        "bye": bye,
                    }

                adp_by_key[key][ppr_type] = adp

            except Exception as e:
                logger.warning(f"Failed to parse FantasyPros row: {e}")
```

**Tests:**

```python
# data/scrapers/tests/test_fantasypros.py
import pytest
from scrapers.fantasypros import FantasyProsScraper, ADPData, DEFAULT_CONFIG

class TestFantasyProsScraper:
    def test_default_config(self):
        scraper = FantasyProsScraper()
        assert scraper.config.name == "FantasyPros"
        assert scraper.config.weight == 1.2

    def test_get_source_name(self):
        scraper = FantasyProsScraper()
        assert scraper.get_source_name() == "FantasyPros"

    def test_urls_defined(self):
        scraper = FantasyProsScraper()
        assert "std" in scraper.URLS
        assert "half_ppr" in scraper.URLS
        assert "ppr" in scraper.URLS

class TestADPData:
    def test_adp_data_creation(self):
        adp = ADPData(
            key="chase_wr_cin",
            name="Ja'Marr Chase",
            pos="WR",
            team="CIN",
            bye=12,
            std=5.2,
            half_ppr=4.8,
            ppr=4.1
        )
        assert adp.key == "chase_wr_cin"
        assert adp.std == 5.2
        assert adp.ppr == 4.1
```

---

## Task 7: Create Risk Calculator Processor

**Files:**
- Create: `data/processors/__init__.py`
- Create: `data/processors/risk_calculator.py`
- Create: `data/processors/tests/__init__.py`
- Create: `data/processors/tests/test_risk_calculator.py`

**Implementation:**

```python
# data/processors/risk_calculator.py
"""Risk calculation for fantasy football players.

Calculates injury risk and consistency scores based on historical data.
"""

import logging
from dataclasses import dataclass
from typing import Optional

logger = logging.getLogger(__name__)

@dataclass
class RiskProfile:
    """Complete risk profile for a player."""
    injury_score: int  # 0-100, higher = more risky
    consistency_score: float  # 0-1, higher = more consistent
    floor: float  # Projected floor points
    ceiling: float  # Projected ceiling points
    weekly_variance: float  # Standard deviation of weekly points
    games_played_history: tuple[int, int, int]  # Last 3 seasons
    current_status: str  # "healthy", "questionable", "injured"
    age: Optional[int] = None

# Age thresholds by position (after this age, risk increases)
AGE_THRESHOLDS = {
    "QB": 35,
    "RB": 27,
    "WR": 30,
    "TE": 30,
    "K": 38,
    "DST": 99,  # No age factor for team defense
}

# Position base risk (RBs get hurt more often)
POSITION_RISK = {
    "QB": 0.2,
    "RB": 0.7,
    "WR": 0.4,
    "TE": 0.5,
    "K": 0.1,
    "DST": 0.1,
}

# Status risk multipliers
STATUS_RISK = {
    "healthy": 0.0,
    "questionable": 0.3,
    "out": 0.5,
    "injured": 0.5,
    "ir": 0.8,
}

def calculate_injury_score(
    games_played: tuple[int, int, int],
    age: Optional[int],
    position: str,
    current_status: str = "healthy"
) -> int:
    """Calculate injury risk score (0-100).

    Formula:
    Injury Risk = (Historical Injury Rate × 0.4) + (Age Factor × 0.25) +
                  (Position Risk × 0.2) + (Current Status × 0.15)

    Args:
        games_played: Games played in last 3 seasons (newest first)
        age: Player's current age
        position: Player's position
        current_status: Current injury status

    Returns:
        Injury score 0-100 (higher = more injury risk)
    """
    # Historical injury rate: games missed / 51 possible games (3 seasons × 17 games)
    total_games = sum(games_played)
    possible_games = 51
    historical_rate = (possible_games - total_games) / possible_games

    # Age factor: increases after position threshold
    age_factor = 0.0
    if age is not None:
        threshold = AGE_THRESHOLDS.get(position, 30)
        if age > threshold:
            # Increase 5% per year over threshold, max 50%
            age_factor = min(0.5, (age - threshold) * 0.05)

    # Position risk
    pos_risk = POSITION_RISK.get(position, 0.3)

    # Current status
    status_risk = STATUS_RISK.get(current_status.lower(), 0.0)

    # Weighted combination
    score = (
        historical_rate * 0.4 +
        age_factor * 0.25 +
        pos_risk * 0.2 +
        status_risk * 0.15
    )

    # Convert to 0-100 scale
    return int(min(100, max(0, score * 100)))

def calculate_consistency_score(
    weekly_points: list[float],
    games_played: int = 17
) -> float:
    """Calculate consistency score (0-1).

    Formula:
    Consistency = 1 - (Standard Deviation of Weekly Points / Mean Weekly Points)

    - 0.8+: Rock solid (Davante Adams, Travis Kelce)
    - 0.5-0.8: Moderate variance (most players)
    - <0.5: Boom/bust (deep threats, volatile RBs)

    Args:
        weekly_points: List of weekly fantasy point totals
        games_played: Number of games (for normalization)

    Returns:
        Consistency score 0-1 (higher = more consistent)
    """
    if not weekly_points or len(weekly_points) < 3:
        return 0.5  # Default to moderate

    import statistics

    mean = statistics.mean(weekly_points)
    if mean == 0:
        return 0.5

    std_dev = statistics.stdev(weekly_points)
    coefficient_of_variation = std_dev / mean

    # Invert so higher = more consistent
    consistency = 1 - min(1, coefficient_of_variation)

    return round(max(0, min(1, consistency)), 2)

def calculate_floor_ceiling(
    projected_points: float,
    consistency_score: float,
    injury_score: int
) -> tuple[float, float]:
    """Calculate floor and ceiling projections.

    Args:
        projected_points: Season projection
        consistency_score: 0-1 consistency score
        injury_score: 0-100 injury risk

    Returns:
        Tuple of (floor, ceiling) season projections
    """
    # Higher consistency = tighter range
    # Higher injury risk = lower floor

    variance_factor = 1 - consistency_score  # 0-1
    injury_factor = injury_score / 100  # 0-1

    # Floor: reduce by variance and injury risk
    floor_reduction = 0.15 + (variance_factor * 0.15) + (injury_factor * 0.1)
    floor = projected_points * (1 - floor_reduction)

    # Ceiling: increase by variance (boom potential)
    ceiling_increase = 0.1 + (variance_factor * 0.2)
    ceiling = projected_points * (1 + ceiling_increase)

    return round(floor, 1), round(ceiling, 1)

def create_risk_profile(
    projected_points: float,
    games_played: tuple[int, int, int] = (17, 17, 17),
    weekly_points: Optional[list[float]] = None,
    age: Optional[int] = None,
    position: str = "WR",
    current_status: str = "healthy"
) -> RiskProfile:
    """Create complete risk profile for a player.

    Args:
        projected_points: Season point projection
        games_played: Games played in last 3 seasons
        weekly_points: Historical weekly point totals
        age: Player's current age
        position: Player's position
        current_status: Current injury status

    Returns:
        Complete RiskProfile
    """
    injury_score = calculate_injury_score(games_played, age, position, current_status)

    if weekly_points:
        consistency = calculate_consistency_score(weekly_points)
        weekly_variance = round(
            __import__("statistics").stdev(weekly_points) if len(weekly_points) > 1 else 0,
            2
        )
    else:
        consistency = 0.5
        weekly_variance = projected_points / 17 * 0.3  # Estimate

    floor, ceiling = calculate_floor_ceiling(projected_points, consistency, injury_score)

    return RiskProfile(
        injury_score=injury_score,
        consistency_score=consistency,
        floor=floor,
        ceiling=ceiling,
        weekly_variance=round(weekly_variance, 2),
        games_played_history=games_played,
        current_status=current_status,
        age=age
    )
```

**Tests:**

```python
# data/processors/tests/test_risk_calculator.py
import pytest
from processors.risk_calculator import (
    calculate_injury_score,
    calculate_consistency_score,
    calculate_floor_ceiling,
    create_risk_profile,
    RiskProfile
)

class TestCalculateInjuryScore:
    def test_healthy_player_low_risk(self):
        score = calculate_injury_score(
            games_played=(17, 17, 17),
            age=25,
            position="WR",
            current_status="healthy"
        )
        assert score < 30  # Low risk

    def test_injury_prone_player_high_risk(self):
        score = calculate_injury_score(
            games_played=(10, 8, 12),
            age=28,
            position="RB",
            current_status="questionable"
        )
        assert score > 50  # High risk

    def test_old_rb_increased_risk(self):
        young = calculate_injury_score((17, 17, 17), 24, "RB")
        old = calculate_injury_score((17, 17, 17), 30, "RB")
        assert old > young

    def test_position_affects_risk(self):
        rb = calculate_injury_score((17, 17, 17), 25, "RB")
        qb = calculate_injury_score((17, 17, 17), 25, "QB")
        assert rb > qb  # RBs are riskier

    def test_current_status_affects_risk(self):
        healthy = calculate_injury_score((17, 17, 17), 25, "WR", "healthy")
        injured = calculate_injury_score((17, 17, 17), 25, "WR", "injured")
        assert injured > healthy

class TestCalculateConsistencyScore:
    def test_consistent_player(self):
        # Low variance points
        weekly = [15, 14, 16, 15, 14, 15, 16, 14, 15, 15, 14, 16, 15, 14, 15, 16, 14]
        score = calculate_consistency_score(weekly)
        assert score > 0.8

    def test_boom_bust_player(self):
        # High variance points
        weekly = [5, 25, 8, 30, 3, 22, 6, 28, 4, 20, 7, 25, 5, 22, 8, 27, 6]
        score = calculate_consistency_score(weekly)
        assert score < 0.5

    def test_empty_returns_default(self):
        score = calculate_consistency_score([])
        assert score == 0.5

    def test_short_list_returns_default(self):
        score = calculate_consistency_score([10, 12])
        assert score == 0.5

class TestCalculateFloorCeiling:
    def test_consistent_player_tight_range(self):
        floor, ceiling = calculate_floor_ceiling(200, 0.9, 10)
        range_pct = (ceiling - floor) / 200
        assert range_pct < 0.4

    def test_volatile_player_wide_range(self):
        floor, ceiling = calculate_floor_ceiling(200, 0.3, 50)
        range_pct = (ceiling - floor) / 200
        assert range_pct > 0.4

    def test_floor_less_than_ceiling(self):
        floor, ceiling = calculate_floor_ceiling(200, 0.5, 30)
        assert floor < 200 < ceiling

class TestCreateRiskProfile:
    def test_creates_complete_profile(self):
        profile = create_risk_profile(
            projected_points=250,
            games_played=(16, 15, 17),
            age=26,
            position="WR",
            current_status="healthy"
        )

        assert isinstance(profile, RiskProfile)
        assert 0 <= profile.injury_score <= 100
        assert 0 <= profile.consistency_score <= 1
        assert profile.floor < 250 < profile.ceiling
        assert profile.games_played_history == (16, 15, 17)

    def test_with_weekly_points(self):
        weekly = [15.0] * 17
        profile = create_risk_profile(
            projected_points=250,
            weekly_points=weekly
        )
        assert profile.consistency_score > 0.8  # Consistent
```

---

## Task 8: Create Schedule Analyzer Processor

**Files:**
- Create: `data/processors/schedule_analyzer.py`
- Create: `data/processors/tests/test_schedule_analyzer.py`

**Implementation:**

```python
# data/processors/schedule_analyzer.py
"""Schedule analysis for fantasy football.

Calculates strength of schedule and playoff matchup quality.
"""

import logging
from dataclasses import dataclass
from typing import Optional

logger = logging.getLogger(__name__)

@dataclass
class ScheduleScore:
    """Schedule analysis for a player's team."""
    team: str
    sos_overall: float  # -1 to 1 (negative = easier, positive = harder)
    sos_playoffs: float  # Strength of playoff schedule (weeks 14-17)
    weekly_matchups: list[int]  # 1-5 rating per week (5 = toughest)
    bye_week: int
    dome_games: int

    def get_schedule_adjustment(self) -> float:
        """Get VOR adjustment based on schedule (-15 to +15)."""
        # Invert so easier schedule = positive adjustment
        base = -self.sos_overall * 10
        playoff_bonus = -self.sos_playoffs * 5
        return round(base + playoff_bonus, 1)

# Week weighting for schedule calculation
WEEK_WEIGHTS = {
    **{i: 0.8 for i in range(1, 5)},    # Weeks 1-4: warm-up
    **{i: 1.0 for i in range(5, 14)},   # Weeks 5-13: regular season
    **{i: 1.5 for i in range(14, 18)},  # Weeks 14-17: playoffs
}

# Defensive rankings template (1 = best defense, 32 = worst)
# This would be updated from real data
DEFAULT_DEF_RANKINGS = {
    "pass": {},  # Team -> rank
    "rush": {},
    "overall": {},
}

def matchup_rating(def_rank: int, is_dome: bool = False) -> int:
    """Convert defensive rank to matchup rating (1-5).

    Args:
        def_rank: Defensive ranking (1-32, 1 = best)
        is_dome: Whether game is in a dome

    Returns:
        Matchup rating 1-5 (5 = toughest matchup)
    """
    # Lower rank = better defense = tougher matchup
    if def_rank <= 6:
        rating = 5  # Elite defense
    elif def_rank <= 12:
        rating = 4  # Good defense
    elif def_rank <= 20:
        rating = 3  # Average
    elif def_rank <= 26:
        rating = 2  # Below average
    else:
        rating = 1  # Bad defense

    # Dome bonus (easier for passing)
    if is_dome:
        rating = max(1, rating - 1)

    return rating

def calculate_sos(
    weekly_matchups: list[int],
    weights: Optional[dict[int, float]] = None
) -> float:
    """Calculate weighted strength of schedule.

    Args:
        weekly_matchups: List of 1-5 matchup ratings per week
        weights: Optional week weights (default uses playoff emphasis)

    Returns:
        SOS score from -1 (easy) to 1 (hard)
    """
    if not weekly_matchups:
        return 0.0

    weights = weights or WEEK_WEIGHTS

    total_weighted = 0.0
    total_weight = 0.0

    for week, rating in enumerate(weekly_matchups, start=1):
        if rating == 0:  # Bye week
            continue
        weight = weights.get(week, 1.0)
        total_weighted += rating * weight
        total_weight += weight

    if total_weight == 0:
        return 0.0

    # Average rating (1-5 scale)
    avg_rating = total_weighted / total_weight

    # Convert to -1 to 1 scale (3 = neutral)
    return round((avg_rating - 3) / 2, 2)

def calculate_playoff_sos(weekly_matchups: list[int]) -> float:
    """Calculate strength of schedule for fantasy playoffs (weeks 14-17).

    Args:
        weekly_matchups: Full season matchup ratings

    Returns:
        Playoff SOS from -1 (easy) to 1 (hard)
    """
    if len(weekly_matchups) < 17:
        return 0.0

    playoff_matchups = weekly_matchups[13:17]  # Weeks 14-17 (0-indexed)

    # Filter out bye weeks
    valid_matchups = [m for m in playoff_matchups if m > 0]

    if not valid_matchups:
        return 0.0

    avg_rating = sum(valid_matchups) / len(valid_matchups)
    return round((avg_rating - 3) / 2, 2)

def create_schedule_score(
    team: str,
    weekly_matchups: list[int],
    bye_week: int,
    dome_games: int = 0
) -> ScheduleScore:
    """Create complete schedule analysis for a team.

    Args:
        team: Team abbreviation
        weekly_matchups: 1-5 ratings per week (0 for bye)
        bye_week: Bye week number
        dome_games: Number of dome games

    Returns:
        Complete ScheduleScore
    """
    return ScheduleScore(
        team=team,
        sos_overall=calculate_sos(weekly_matchups),
        sos_playoffs=calculate_playoff_sos(weekly_matchups),
        weekly_matchups=weekly_matchups,
        bye_week=bye_week,
        dome_games=dome_games
    )

def get_bye_week_penalty(bye_week: int) -> float:
    """Calculate penalty for unfavorable bye week.

    Week 14 bye is devastating for fantasy playoffs.
    Early byes (5-7) are preferred.

    Returns:
        Penalty adjustment (negative)
    """
    if bye_week == 14:
        return -3.0  # Playoff bye is bad
    elif bye_week in (15, 16, 17):
        return -2.0  # Late season bye less impactful
    elif bye_week in (5, 6, 7):
        return 0.5  # Early bye is good
    else:
        return 0.0
```

**Tests:**

```python
# data/processors/tests/test_schedule_analyzer.py
import pytest
from processors.schedule_analyzer import (
    matchup_rating,
    calculate_sos,
    calculate_playoff_sos,
    create_schedule_score,
    get_bye_week_penalty,
    ScheduleScore
)

class TestMatchupRating:
    def test_elite_defense(self):
        assert matchup_rating(1) == 5
        assert matchup_rating(6) == 5

    def test_bad_defense(self):
        assert matchup_rating(32) == 1
        assert matchup_rating(28) == 1

    def test_dome_reduces_rating(self):
        assert matchup_rating(6, is_dome=True) == 4
        assert matchup_rating(1, is_dome=True) == 4

    def test_dome_minimum_rating(self):
        assert matchup_rating(32, is_dome=True) == 1

class TestCalculateSOS:
    def test_tough_schedule(self):
        weekly = [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5]
        sos = calculate_sos(weekly)
        assert sos > 0  # Hard schedule

    def test_easy_schedule(self):
        weekly = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
        sos = calculate_sos(weekly)
        assert sos < 0  # Easy schedule

    def test_average_schedule(self):
        weekly = [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3]
        sos = calculate_sos(weekly)
        assert sos == 0  # Neutral

    def test_bye_week_excluded(self):
        weekly = [3, 3, 3, 0, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3]  # 0 = bye
        sos = calculate_sos(weekly)
        assert sos == 0

class TestCalculatePlayoffSOS:
    def test_tough_playoff_schedule(self):
        weekly = [3] * 13 + [5, 5, 5, 5]  # Hard weeks 14-17
        sos = calculate_playoff_sos(weekly)
        assert sos > 0

    def test_easy_playoff_schedule(self):
        weekly = [3] * 13 + [1, 1, 1, 1]  # Easy weeks 14-17
        sos = calculate_playoff_sos(weekly)
        assert sos < 0

class TestScheduleScore:
    def test_get_schedule_adjustment_easy(self):
        score = ScheduleScore(
            team="PHI",
            sos_overall=-0.5,
            sos_playoffs=-0.3,
            weekly_matchups=[2] * 17,
            bye_week=7,
            dome_games=8
        )
        adjustment = score.get_schedule_adjustment()
        assert adjustment > 0  # Easy schedule = positive

    def test_get_schedule_adjustment_hard(self):
        score = ScheduleScore(
            team="NE",
            sos_overall=0.5,
            sos_playoffs=0.3,
            weekly_matchups=[4] * 17,
            bye_week=10,
            dome_games=2
        )
        adjustment = score.get_schedule_adjustment()
        assert adjustment < 0  # Hard schedule = negative

class TestGetByeWeekPenalty:
    def test_week_14_bye_penalty(self):
        penalty = get_bye_week_penalty(14)
        assert penalty == -3.0

    def test_early_bye_bonus(self):
        penalty = get_bye_week_penalty(6)
        assert penalty > 0

    def test_normal_bye_no_penalty(self):
        penalty = get_bye_week_penalty(10)
        assert penalty == 0.0
```

---

## Task 9: Create Enhanced Aggregator

**Files:**
- Create: `data/processors/aggregator.py`
- Create: `data/processors/tests/test_aggregator.py`

**Implementation:**

```python
# data/processors/aggregator.py
"""Enhanced aggregator that combines multiple projection sources.

Applies source weighting, recency factors, and produces the final
player data JSON for the TypeScript application.
"""

import logging
import json
import datetime
from dataclasses import dataclass, asdict
from typing import Optional

import pandas as pd

from scrapers.base import PlayerProjection
from scrapers.fantasypros import ADPData
from .risk_calculator import RiskProfile, create_risk_profile
from .schedule_analyzer import ScheduleScore

logger = logging.getLogger(__name__)

YEAR = datetime.datetime.now().year

@dataclass
class EnhancedPlayer:
    """Complete player data for the TypeScript application."""
    key: str
    name: str
    pos: str
    team: str
    bye: int

    # ADP rankings
    adp_std: float
    adp_half_ppr: float
    adp_ppr: float

    # Projections
    pass_yds: float
    pass_tds: float
    pass_ints: float
    rush_yds: float
    rush_tds: float
    receptions: float
    rec_yds: float
    rec_tds: float
    fumbles: float
    two_pts: float

    # Advanced stats (when available)
    target_share: Optional[float] = None
    snap_pct: Optional[float] = None
    red_zone_targets: Optional[float] = None
    red_zone_carries: Optional[float] = None
    air_yards: Optional[float] = None

    # Risk profile
    injury_score: int = 30
    consistency_score: float = 0.5
    floor: float = 0.0
    ceiling: float = 0.0
    weekly_variance: float = 0.0
    games_played_3yr: tuple[int, int, int] = (17, 17, 17)

    # Schedule
    sos_overall: float = 0.0
    sos_playoffs: float = 0.0
    weekly_matchups: Optional[list[int]] = None

# Source weights for averaging
SOURCE_WEIGHTS = {
    "FantasyPros": 1.2,
    "ESPN": 1.0,
    "CBS": 0.9,
    "NFL": 0.8,
}

def aggregate_projections(
    projections_by_source: dict[str, list[PlayerProjection]],
    adp_data: list[ADPData],
    risk_profiles: Optional[dict[str, RiskProfile]] = None,
    schedule_scores: Optional[dict[str, ScheduleScore]] = None,
) -> list[EnhancedPlayer]:
    """Aggregate projections from multiple sources.

    Args:
        projections_by_source: Dict of source name -> projections
        adp_data: ADP data from FantasyPros
        risk_profiles: Optional risk profiles by player key
        schedule_scores: Optional schedule scores by team

    Returns:
        List of aggregated EnhancedPlayer objects
    """
    logger.info("Aggregating projections from %d sources", len(projections_by_source))

    # Build player key -> projections mapping
    by_key: dict[str, list[tuple[str, PlayerProjection]]] = {}
    for source, projections in projections_by_source.items():
        for proj in projections:
            if proj.key not in by_key:
                by_key[proj.key] = []
            by_key[proj.key].append((source, proj))

    # Build ADP lookup
    adp_lookup = {a.key: a for a in adp_data}

    # Aggregate each player
    players = []
    for key, source_projections in by_key.items():
        try:
            player = _aggregate_player(
                key,
                source_projections,
                adp_lookup.get(key),
                risk_profiles.get(key) if risk_profiles else None,
                schedule_scores
            )
            if player:
                players.append(player)
        except Exception as e:
            logger.warning(f"Failed to aggregate {key}: {e}")

    logger.info("Aggregated %d players", len(players))
    return players

def _aggregate_player(
    key: str,
    source_projections: list[tuple[str, PlayerProjection]],
    adp: Optional[ADPData],
    risk: Optional[RiskProfile],
    schedules: Optional[dict[str, ScheduleScore]]
) -> Optional[EnhancedPlayer]:
    """Aggregate a single player's projections."""
    if not source_projections:
        return None

    # Get player info from first source
    _, first = source_projections[0]
    name = first.name
    pos = first.pos
    team = first.team

    # Calculate weighted averages for stats
    stats = _weighted_average_stats(source_projections)

    # Get ADP or default
    if adp:
        adp_std = adp.std
        adp_half = adp.half_ppr
        adp_ppr = adp.ppr
        bye = adp.bye
    else:
        adp_std = adp_half = adp_ppr = 999.0
        bye = 0

    # Get risk profile or default
    if risk:
        injury_score = risk.injury_score
        consistency = risk.consistency_score
        floor = risk.floor
        ceiling = risk.ceiling
        variance = risk.weekly_variance
        games = risk.games_played_history
    else:
        # Create default risk profile
        projected = stats.get("rec_yds", 0) + stats.get("rush_yds", 0) + stats.get("pass_yds", 0) * 0.04
        default = create_risk_profile(projected, position=pos)
        injury_score = default.injury_score
        consistency = default.consistency_score
        floor = default.floor
        ceiling = default.ceiling
        variance = default.weekly_variance
        games = default.games_played_history

    # Get schedule info
    sos_overall = 0.0
    sos_playoffs = 0.0
    matchups = None
    if schedules and team in schedules:
        sched = schedules[team]
        sos_overall = sched.sos_overall
        sos_playoffs = sched.sos_playoffs
        matchups = sched.weekly_matchups

    return EnhancedPlayer(
        key=key,
        name=name,
        pos=pos,
        team=team,
        bye=bye,
        adp_std=adp_std,
        adp_half_ppr=adp_half,
        adp_ppr=adp_ppr,
        pass_yds=stats.get("pass_yds", 0.0),
        pass_tds=stats.get("pass_tds", 0.0),
        pass_ints=stats.get("pass_ints", 0.0),
        rush_yds=stats.get("rush_yds", 0.0),
        rush_tds=stats.get("rush_tds", 0.0),
        receptions=stats.get("receptions", 0.0),
        rec_yds=stats.get("rec_yds", 0.0),
        rec_tds=stats.get("rec_tds", 0.0),
        fumbles=stats.get("fumbles", 0.0),
        two_pts=stats.get("two_pts", 0.0),
        target_share=stats.get("target_share"),
        snap_pct=stats.get("snap_pct"),
        red_zone_targets=stats.get("red_zone_targets"),
        red_zone_carries=stats.get("red_zone_carries"),
        air_yards=stats.get("air_yards"),
        injury_score=injury_score,
        consistency_score=consistency,
        floor=floor,
        ceiling=ceiling,
        weekly_variance=variance,
        games_played_3yr=games,
        sos_overall=sos_overall,
        sos_playoffs=sos_playoffs,
        weekly_matchups=matchups,
    )

def _weighted_average_stats(
    source_projections: list[tuple[str, PlayerProjection]]
) -> dict[str, float]:
    """Calculate weighted average of stats across sources."""
    stat_fields = [
        "pass_yds", "pass_tds", "pass_ints", "rush_yds", "rush_tds",
        "receptions", "rec_yds", "rec_tds", "fumbles", "two_pts",
        "target_share", "snap_pct", "red_zone_targets", "red_zone_carries", "air_yards"
    ]

    totals: dict[str, float] = {}
    weights: dict[str, float] = {}

    for source, proj in source_projections:
        weight = SOURCE_WEIGHTS.get(source, 1.0)

        for field in stat_fields:
            value = getattr(proj, field, None)
            if value is not None and value != 0:
                totals[field] = totals.get(field, 0) + value * weight
                weights[field] = weights.get(field, 0) + weight

    return {
        field: round(totals[field] / weights[field], 1)
        for field in totals
        if weights.get(field, 0) > 0
    }

def save_to_json(players: list[EnhancedPlayer], output_path: str) -> None:
    """Save players to JSON file for TypeScript app."""
    data = {
        "meta": {
            "updated": datetime.datetime.now().isoformat(),
            "season": YEAR,
            "player_count": len(players),
        },
        "players": [asdict(p) for p in players]
    }

    with open(output_path, "w") as f:
        json.dump(data, f, indent=2)

    logger.info(f"Saved {len(players)} players to {output_path}")
```

**Tests:**

```python
# data/processors/tests/test_aggregator.py
import pytest
from processors.aggregator import (
    aggregate_projections,
    _weighted_average_stats,
    EnhancedPlayer,
    SOURCE_WEIGHTS
)
from scrapers.base import PlayerProjection
from scrapers.fantasypros import ADPData

class TestWeightedAverageStats:
    def test_single_source(self):
        proj = PlayerProjection(
            key="test_wr_phi",
            name="Test",
            pos="WR",
            team="PHI",
            rec_yds=1000.0,
            rec_tds=8.0
        )

        result = _weighted_average_stats([("ESPN", proj)])
        assert result["rec_yds"] == 1000.0
        assert result["rec_tds"] == 8.0

    def test_multiple_sources_weighted(self):
        espn = PlayerProjection(
            key="test_wr_phi", name="Test", pos="WR", team="PHI",
            rec_yds=1000.0
        )
        cbs = PlayerProjection(
            key="test_wr_phi", name="Test", pos="WR", team="PHI",
            rec_yds=1200.0
        )

        # ESPN weight: 1.0, CBS weight: 0.9
        result = _weighted_average_stats([("ESPN", espn), ("CBS", cbs)])

        # Expected: (1000*1.0 + 1200*0.9) / (1.0 + 0.9) = 2080 / 1.9 ≈ 1094.7
        assert 1090 < result["rec_yds"] < 1100

class TestAggregateProjections:
    def test_aggregates_single_player(self):
        projections = {
            "ESPN": [
                PlayerProjection(
                    key="chase_wr_cin",
                    name="Ja'Marr Chase",
                    pos="WR",
                    team="CIN",
                    rec_yds=1300.0,
                    rec_tds=10.0
                )
            ]
        }

        adp = [
            ADPData(
                key="chase_wr_cin",
                name="Ja'Marr Chase",
                pos="WR",
                team="CIN",
                bye=12,
                std=5.0,
                half_ppr=4.5,
                ppr=4.0
            )
        ]

        result = aggregate_projections(projections, adp)

        assert len(result) == 1
        assert result[0].key == "chase_wr_cin"
        assert result[0].rec_yds == 1300.0
        assert result[0].adp_ppr == 4.0

class TestEnhancedPlayer:
    def test_dataclass_fields(self):
        player = EnhancedPlayer(
            key="test_qb_kc",
            name="Test QB",
            pos="QB",
            team="KC",
            bye=10,
            adp_std=1.0,
            adp_half_ppr=1.0,
            adp_ppr=1.0,
            pass_yds=4500.0,
            pass_tds=35.0,
            pass_ints=10.0,
            rush_yds=300.0,
            rush_tds=3.0,
            receptions=0.0,
            rec_yds=0.0,
            rec_tds=0.0,
            fumbles=3.0,
            two_pts=1.0,
        )

        assert player.pass_yds == 4500.0
        assert player.injury_score == 30  # Default
```

---

## Task 10: Create Data Validator

**Files:**
- Create: `data/validators/__init__.py`
- Create: `data/validators/data_quality.py`
- Create: `data/validators/tests/__init__.py`
- Create: `data/validators/tests/test_data_quality.py`

**Implementation:**

```python
# data/validators/data_quality.py
"""Data quality validation for scraped fantasy football data."""

import logging
from dataclasses import dataclass
from typing import Optional

from scrapers.base import PlayerProjection
from scrapers.fantasypros import ADPData

logger = logging.getLogger(__name__)

@dataclass
class ValidationResult:
    """Result of data validation."""
    is_valid: bool
    errors: list[str]
    warnings: list[str]
    stats: dict

# Minimum player counts by position for strict validation
MIN_COUNTS_STRICT = {
    "QB": 32,
    "RB": 64,
    "WR": 64,
    "TE": 28,
    "K": 15,
    "DST": 32,
}

# Relaxed counts (1/3 of strict)
MIN_COUNTS_RELAXED = {k: v // 3 for k, v in MIN_COUNTS_STRICT.items()}

# Valid NFL teams
VALID_TEAMS = {
    "ARI", "ATL", "BAL", "BUF", "CAR", "CHI", "CIN", "CLE",
    "DAL", "DEN", "DET", "GB", "HOU", "IND", "JAX", "KC",
    "LAC", "LAR", "LV", "MIA", "MIN", "NE", "NO", "NYG",
    "NYJ", "PHI", "PIT", "SEA", "SF", "TB", "TEN", "WSH"
}

def validate_projections(
    projections: list[PlayerProjection],
    strict: bool = True
) -> ValidationResult:
    """Validate scraped projections.

    Args:
        projections: List of player projections
        strict: Use strict minimum counts

    Returns:
        ValidationResult with errors and warnings
    """
    errors = []
    warnings = []

    min_counts = MIN_COUNTS_STRICT if strict else MIN_COUNTS_RELAXED

    # Count by position
    pos_counts = {}
    for proj in projections:
        pos_counts[proj.pos] = pos_counts.get(proj.pos, 0) + 1

    # Check minimum counts
    for pos, min_count in min_counts.items():
        actual = pos_counts.get(pos, 0)
        if actual < min_count:
            msg = f"Insufficient {pos}s: {actual} (need {min_count})"
            if strict:
                errors.append(msg)
            else:
                warnings.append(msg)

    # Check for invalid teams
    invalid_teams = set()
    for proj in projections:
        if proj.team not in VALID_TEAMS:
            invalid_teams.add(proj.team)

    if invalid_teams:
        errors.append(f"Invalid teams found: {invalid_teams}")

    # Check for duplicate keys
    keys = [p.key for p in projections]
    if len(keys) != len(set(keys)):
        duplicates = [k for k in keys if keys.count(k) > 1]
        warnings.append(f"Duplicate player keys: {set(duplicates)}")

    stats = {
        "total_players": len(projections),
        "by_position": pos_counts,
        "teams_found": len(set(p.team for p in projections)),
    }

    return ValidationResult(
        is_valid=len(errors) == 0,
        errors=errors,
        warnings=warnings,
        stats=stats
    )

def validate_adp(adp_data: list[ADPData]) -> ValidationResult:
    """Validate ADP data."""
    errors = []
    warnings = []

    if len(adp_data) < 150:
        errors.append(f"Insufficient ADP data: {len(adp_data)} players")

    # Check for missing ADP values
    missing_std = sum(1 for a in adp_data if a.std >= 999)
    missing_ppr = sum(1 for a in adp_data if a.ppr >= 999)

    if missing_std > len(adp_data) * 0.1:
        warnings.append(f"Many players missing std ADP: {missing_std}")
    if missing_ppr > len(adp_data) * 0.1:
        warnings.append(f"Many players missing PPR ADP: {missing_ppr}")

    stats = {
        "total_players": len(adp_data),
        "with_std_adp": len(adp_data) - missing_std,
        "with_ppr_adp": len(adp_data) - missing_ppr,
    }

    return ValidationResult(
        is_valid=len(errors) == 0,
        errors=errors,
        warnings=warnings,
        stats=stats
    )

def validate_stat_ranges(projections: list[PlayerProjection]) -> ValidationResult:
    """Validate that stats are within reasonable ranges."""
    errors = []
    warnings = []

    RANGES = {
        "pass_yds": (0, 6000),
        "pass_tds": (0, 60),
        "rush_yds": (0, 2500),
        "rush_tds": (0, 30),
        "rec_yds": (0, 2200),
        "rec_tds": (0, 20),
        "receptions": (0, 200),
    }

    for proj in projections:
        for field, (min_val, max_val) in RANGES.items():
            value = getattr(proj, field, 0)
            if value < min_val or value > max_val:
                warnings.append(
                    f"{proj.name}: {field}={value} outside range [{min_val}, {max_val}]"
                )

    return ValidationResult(
        is_valid=True,  # Range issues are warnings, not errors
        errors=errors,
        warnings=warnings,
        stats={"checked_fields": list(RANGES.keys())}
    )
```

**Tests:**

```python
# data/validators/tests/test_data_quality.py
import pytest
from validators.data_quality import (
    validate_projections,
    validate_adp,
    validate_stat_ranges,
    ValidationResult,
    MIN_COUNTS_STRICT
)
from scrapers.base import PlayerProjection
from scrapers.fantasypros import ADPData

class TestValidateProjections:
    def create_valid_projections(self) -> list[PlayerProjection]:
        projections = []
        teams = list("ARI ATL BAL BUF CAR CHI CIN CLE DAL DEN DET GB HOU IND JAX KC".split())

        for pos, count in MIN_COUNTS_STRICT.items():
            for i in range(count):
                projections.append(PlayerProjection(
                    key=f"player{i}_{pos.lower()}_{teams[i % len(teams)].lower()}",
                    name=f"Player {pos} {i}",
                    pos=pos,
                    team=teams[i % len(teams)]
                ))
        return projections

    def test_valid_projections_pass(self):
        projections = self.create_valid_projections()
        result = validate_projections(projections, strict=True)
        assert result.is_valid
        assert len(result.errors) == 0

    def test_insufficient_players_fails_strict(self):
        projections = [
            PlayerProjection(key="test_qb_phi", name="Test", pos="QB", team="PHI")
        ]
        result = validate_projections(projections, strict=True)
        assert not result.is_valid
        assert any("QB" in e for e in result.errors)

    def test_insufficient_players_relaxed_mode(self):
        # Create enough for relaxed but not strict
        projections = []
        for pos, strict_count in MIN_COUNTS_STRICT.items():
            relaxed = strict_count // 3 + 1
            for i in range(relaxed):
                projections.append(PlayerProjection(
                    key=f"p{i}_{pos.lower()}_phi",
                    name=f"P {i}",
                    pos=pos,
                    team="PHI"
                ))

        result = validate_projections(projections, strict=False)
        assert result.is_valid

    def test_invalid_team_fails(self):
        projections = self.create_valid_projections()
        projections[0] = PlayerProjection(
            key="bad_qb_xxx",
            name="Bad Team",
            pos="QB",
            team="XXX"  # Invalid team
        )
        result = validate_projections(projections, strict=True)
        assert not result.is_valid
        assert any("Invalid teams" in e for e in result.errors)

class TestValidateADP:
    def test_sufficient_adp_passes(self):
        adp = [
            ADPData(f"p{i}_wr_phi", f"Player {i}", "WR", "PHI", 10, float(i), float(i), float(i))
            for i in range(200)
        ]
        result = validate_adp(adp)
        assert result.is_valid

    def test_insufficient_adp_fails(self):
        adp = [
            ADPData(f"p{i}_wr_phi", f"Player {i}", "WR", "PHI", 10, float(i), float(i), float(i))
            for i in range(50)
        ]
        result = validate_adp(adp)
        assert not result.is_valid

class TestValidateStatRanges:
    def test_valid_stats_pass(self):
        projections = [
            PlayerProjection(
                key="mahomes_qb_kc",
                name="Patrick Mahomes",
                pos="QB",
                team="KC",
                pass_yds=4500.0,
                pass_tds=35.0
            )
        ]
        result = validate_stat_ranges(projections)
        assert result.is_valid

    def test_out_of_range_warns(self):
        projections = [
            PlayerProjection(
                key="fake_qb_phi",
                name="Fake QB",
                pos="QB",
                team="PHI",
                pass_yds=10000.0  # Unrealistic
            )
        ]
        result = validate_stat_ranges(projections)
        assert len(result.warnings) > 0
```

---

## Task 11: Create Main Pipeline Runner

**Files:**
- Modify: `data/main.py`
- Create: `data/pipeline.py`
- Create: `data/tests/test_pipeline.py`

**Implementation:**

```python
# data/pipeline.py
"""Main data pipeline orchestration."""

import logging
import os
import datetime
from typing import Optional

from scrapers.espn import ESPNScraper
from scrapers.cbs import CBSScraper
from scrapers.nfl import NFLScraper
from scrapers.fantasypros import FantasyProsScraper
from processors.aggregator import aggregate_projections, save_to_json
from validators.data_quality import validate_projections, validate_adp

logger = logging.getLogger(__name__)

YEAR = datetime.datetime.now().year
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "processed")

class DataPipeline:
    """Orchestrates the full data scraping and processing pipeline."""

    def __init__(self, output_dir: Optional[str] = None):
        self.output_dir = output_dir or OUTPUT_DIR
        os.makedirs(self.output_dir, exist_ok=True)

    def run(self, validate: bool = True, strict: bool = False) -> str:
        """Run the full pipeline.

        Args:
            validate: Whether to validate scraped data
            strict: Use strict validation (fail on insufficient data)

        Returns:
            Path to output JSON file
        """
        logger.info("Starting data pipeline")

        # Scrape all sources
        projections = self._scrape_projections()
        adp_data = self._scrape_adp()

        # Validate
        if validate:
            self._validate(projections, adp_data, strict)

        # Aggregate
        players = aggregate_projections(
            projections,
            adp_data,
            risk_profiles=None,  # TODO: Add risk data source
            schedule_scores=None,  # TODO: Add schedule data source
        )

        # Save output
        output_path = os.path.join(self.output_dir, f"Projections-{YEAR}.json")
        save_to_json(players, output_path)

        logger.info(f"Pipeline complete: {output_path}")
        return output_path

    def _scrape_projections(self) -> dict:
        """Scrape projections from all sources."""
        scrapers = [
            ESPNScraper(),
            CBSScraper(),
            NFLScraper(),
        ]

        projections = {}
        for scraper in scrapers:
            try:
                name = scraper.get_source_name()
                logger.info(f"Scraping {name}")
                projections[name] = scraper.scrape()
            except Exception as e:
                logger.error(f"Failed to scrape {scraper.get_source_name()}: {e}")

        return projections

    def _scrape_adp(self) -> list:
        """Scrape ADP data."""
        try:
            scraper = FantasyProsScraper()
            return scraper.scrape()
        except Exception as e:
            logger.error(f"Failed to scrape ADP: {e}")
            return []

    def _validate(self, projections: dict, adp_data: list, strict: bool) -> None:
        """Validate scraped data."""
        for source, projs in projections.items():
            result = validate_projections(projs, strict=strict)
            if not result.is_valid:
                raise ValueError(f"{source} validation failed: {result.errors}")
            if result.warnings:
                for w in result.warnings:
                    logger.warning(f"{source}: {w}")

        result = validate_adp(adp_data)
        if not result.is_valid:
            raise ValueError(f"ADP validation failed: {result.errors}")

def run_pipeline(validate: bool = True, strict: bool = False) -> str:
    """Convenience function to run pipeline."""
    return DataPipeline().run(validate=validate, strict=strict)
```

**Updated main.py:**

```python
# data/main.py
"""Main entry point for data pipeline."""

import logging
import os
import sys

# Add data directory to path for imports
sys.path.insert(0, os.path.dirname(__file__))

from pipeline import run_pipeline
import upload

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s:%(name)s:%(message)s"
)


def run():
    """Main entry point for data pipeline."""
    if not os.environ.get("S3_BUCKET") or not os.environ.get("AWS_ACCESS_KEY_ID"):
        logging.fatal("missing env vars: S3_BUCKET and AWS_ACCESS_KEY_ID required")
        raise RuntimeError("missing env vars")

    try:
        output_path = run_pipeline(validate=True, strict=False)
        upload.upload()
        logging.info(f"Pipeline complete: {output_path}")
    except KeyboardInterrupt:
        logging.info("Pipeline interrupted by user")
        raise
    except Exception:
        logging.exception("Failed to update data")
        raise


if __name__ == "__main__":
    run()
```

**Tests:**

```python
# data/tests/test_pipeline.py
import pytest
from unittest.mock import MagicMock, patch
import os
import tempfile

class TestDataPipeline:
    @patch('pipeline.ESPNScraper')
    @patch('pipeline.CBSScraper')
    @patch('pipeline.NFLScraper')
    @patch('pipeline.FantasyProsScraper')
    def test_pipeline_calls_all_scrapers(
        self, mock_fp, mock_nfl, mock_cbs, mock_espn
    ):
        from pipeline import DataPipeline
        from scrapers.base import PlayerProjection
        from scrapers.fantasypros import ADPData

        # Setup mocks
        mock_espn.return_value.scrape.return_value = []
        mock_espn.return_value.get_source_name.return_value = "ESPN"
        mock_cbs.return_value.scrape.return_value = []
        mock_cbs.return_value.get_source_name.return_value = "CBS"
        mock_nfl.return_value.scrape.return_value = []
        mock_nfl.return_value.get_source_name.return_value = "NFL"
        mock_fp.return_value.scrape.return_value = []

        with tempfile.TemporaryDirectory() as tmpdir:
            pipeline = DataPipeline(output_dir=tmpdir)
            pipeline.run(validate=False)

        mock_espn.return_value.scrape.assert_called_once()
        mock_cbs.return_value.scrape.assert_called_once()
        mock_nfl.return_value.scrape.assert_called_once()
        mock_fp.return_value.scrape.assert_called_once()
```

---

## Task 12: Update Requirements and Documentation

**Files:**
- Modify: `data/requirements.txt`
- Create: `data/README.md`

**requirements.txt:**

```
# Core dependencies
boto3>=1.28.0
beautifulsoup4>=4.12.0
numpy>=2.0.1
pandas>=2.0.0
requests>=2.31.0
selenium>=4.10.0
webdriver-manager>=4.0.2

# Testing
pytest>=7.4.0
pytest-cov>=4.1.0

# Type checking (optional)
mypy>=1.5.0
```

**README.md:**

```markdown
# Fantasy Football Data Pipeline

Modular data scraping and processing system for fantasy football projections.

## Structure

```
data/
├── scrapers/           # Source-specific scrapers
│   ├── base.py         # Base scraper class
│   ├── espn.py         # ESPN projections
│   ├── cbs.py          # CBS projections
│   ├── nfl.py          # NFL.com projections
│   └── fantasypros.py  # FantasyPros ADP
├── processors/         # Data processing
│   ├── aggregator.py   # Multi-source aggregation
│   ├── risk_calculator.py    # Injury/consistency scoring
│   └── schedule_analyzer.py  # SOS calculations
├── validators/         # Data quality checks
│   └── data_quality.py
├── pipeline.py         # Pipeline orchestration
└── main.py             # Entry point
```

## Usage

```bash
# Run full pipeline
python main.py

# Run tests
pytest tests/ -v
```

## Output

Produces `processed/Projections-{YEAR}.json` with:
- Player projections (weighted average from multiple sources)
- ADP rankings (standard, half-PPR, PPR)
- Risk profiles (injury score, consistency, floor/ceiling)
- Schedule analysis (SOS overall, playoffs)
```

---

## Execution Summary

| Task | Component | Files | Tests |
|------|-----------|-------|-------|
| 1 | Base Scraper Class | 4 | 6 |
| 2 | Constants & Utilities | 2 | 9 |
| 3 | ESPN Scraper | 2 | 5 |
| 4 | CBS Scraper | 2 | 3 |
| 5 | NFL Scraper | 2 | 3 |
| 6 | FantasyPros Scraper | 2 | 4 |
| 7 | Risk Calculator | 2 | 12 |
| 8 | Schedule Analyzer | 2 | 9 |
| 9 | Enhanced Aggregator | 2 | 5 |
| 10 | Data Validator | 2 | 8 |
| 11 | Pipeline Runner | 3 | 2 |
| 12 | Requirements & Docs | 2 | 0 |

**Total new tests:** ~66 tests
**Total new files:** ~27 files (including tests)
