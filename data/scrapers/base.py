from abc import ABC, abstractmethod
from dataclasses import asdict, dataclass
from typing import Any, Optional
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
        self._driver: Optional[Any] = None

    @abstractmethod
    def scrape(self) -> list[PlayerProjection]:
        """Scrape projections from the source.

        Subclasses must implement this method to fetch player projection data
        from their specific source (e.g., ESPN, Yahoo, FantasyPros).

        Returns:
            list[PlayerProjection]: A list of PlayerProjection objects containing
                the scraped projection data for all available players.

        Raises:
            ScraperError: If the scraping operation fails due to network issues,
                parsing errors, or other problems.
        """
        pass

    @abstractmethod
    def get_source_name(self) -> str:
        """Return the source name for logging and identification.

        Subclasses must implement this method to provide a unique identifier
        for the data source, used in logging and data aggregation.

        Returns:
            str: A human-readable source name (e.g., 'ESPN', 'FantasyPros').
        """
        pass

    def to_dataframe(self, projections: list[PlayerProjection]) -> pd.DataFrame:
        """Convert projections to DataFrame.

        Args:
            projections: List of PlayerProjection objects to convert.

        Returns:
            pd.DataFrame: A DataFrame with one row per player, containing
                all projection fields as columns.
        """
        if not projections:
            return pd.DataFrame()
        return pd.DataFrame([asdict(p) for p in projections])

    def validate(self, df: pd.DataFrame, strict: bool = True) -> bool:
        """Validate scraped data meets minimum requirements.

        Args:
            df: DataFrame containing scraped projection data.
            strict: If True, apply stricter validation rules.

        Returns:
            bool: True if validation passes, False otherwise.

        Note:
            Full validation logic will be implemented in the Validator module.
        """
        return True
