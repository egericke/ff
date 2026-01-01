"""Main data pipeline orchestration."""

import datetime
import logging
import os
from typing import Optional

from scrapers.espn import ESPNScraper
from scrapers.cbs import CBSScraper
from scrapers.nfl import NFLScraper
from scrapers.fantasypros import FantasyProsScraper
from processors.aggregator import aggregate_projections, export_to_json
from validators.data_quality import validate_projections, validate_adp

logger = logging.getLogger(__name__)

YEAR = datetime.datetime.now().year
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "processed")


class DataPipeline:
    """Orchestrates the full data scraping and processing pipeline."""

    def __init__(self, output_dir: Optional[str] = None):
        """Initialize the data pipeline.

        Args:
            output_dir: Optional output directory. Defaults to data/processed.
        """
        self.output_dir = output_dir or OUTPUT_DIR
        os.makedirs(self.output_dir, exist_ok=True)

    def run(self, validate: bool = True, strict: bool = False) -> str:
        """Run the full pipeline.

        Args:
            validate: Whether to validate scraped data.
            strict: Use strict validation (fail on insufficient data).

        Returns:
            Path to output JSON file.
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
        export_to_json(players, output_path)

        logger.info(f"Pipeline complete: {output_path}")
        return output_path

    def _scrape_projections(self) -> dict:
        """Scrape projections from all sources.

        Returns:
            Dictionary of source name -> list of projections.
        """
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
        """Scrape ADP data.

        Returns:
            List of ADP data.
        """
        try:
            scraper = FantasyProsScraper()
            return scraper.scrape()
        except Exception as e:
            logger.error(f"Failed to scrape ADP: {e}")
            return []

    def _validate(self, projections: dict, adp_data: list, strict: bool) -> None:
        """Validate scraped data.

        Args:
            projections: Dictionary of source -> projections.
            adp_data: List of ADP data.
            strict: Use strict validation.

        Raises:
            ValueError: If validation fails.
        """
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
    """Convenience function to run pipeline.

    Args:
        validate: Whether to validate scraped data.
        strict: Use strict validation.

    Returns:
        Path to output JSON file.
    """
    return DataPipeline().run(validate=validate, strict=strict)
