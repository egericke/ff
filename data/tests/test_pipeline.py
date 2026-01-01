"""Tests for the data pipeline orchestration."""

import datetime
import json
import os
import tempfile
from unittest.mock import MagicMock, patch

import pytest


class TestDataPipeline:
    """Tests for DataPipeline class."""

    @patch('pipeline.ESPNScraper')
    @patch('pipeline.CBSScraper')
    @patch('pipeline.NFLScraper')
    @patch('pipeline.FantasyProsScraper')
    def test_pipeline_calls_all_scrapers(
        self, mock_fp, mock_nfl, mock_cbs, mock_espn
    ):
        """Verify pipeline calls all scrapers."""
        from pipeline import DataPipeline

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

    @patch('pipeline.ESPNScraper')
    @patch('pipeline.CBSScraper')
    @patch('pipeline.NFLScraper')
    @patch('pipeline.FantasyProsScraper')
    def test_pipeline_creates_output_directory(
        self, mock_fp, mock_nfl, mock_cbs, mock_espn
    ):
        """Verify pipeline creates output directory if it doesn't exist."""
        from pipeline import DataPipeline

        # Setup mocks
        for mock in [mock_espn, mock_cbs, mock_nfl]:
            mock.return_value.scrape.return_value = []
            mock.return_value.get_source_name.return_value = "Test"
        mock_fp.return_value.scrape.return_value = []

        with tempfile.TemporaryDirectory() as tmpdir:
            output_dir = os.path.join(tmpdir, "new_dir", "nested")
            pipeline = DataPipeline(output_dir=output_dir)
            pipeline.run(validate=False)
            assert os.path.exists(output_dir)

    @patch('pipeline.ESPNScraper')
    @patch('pipeline.CBSScraper')
    @patch('pipeline.NFLScraper')
    @patch('pipeline.FantasyProsScraper')
    def test_pipeline_returns_output_path(
        self, mock_fp, mock_nfl, mock_cbs, mock_espn
    ):
        """Verify pipeline returns path to output file."""
        from pipeline import DataPipeline

        # Setup mocks
        for mock in [mock_espn, mock_cbs, mock_nfl]:
            mock.return_value.scrape.return_value = []
            mock.return_value.get_source_name.return_value = "Test"
        mock_fp.return_value.scrape.return_value = []

        with tempfile.TemporaryDirectory() as tmpdir:
            pipeline = DataPipeline(output_dir=tmpdir)
            result = pipeline.run(validate=False)

            year = datetime.datetime.now().year
            expected = os.path.join(tmpdir, f"Projections-{year}.json")
            assert result == expected
            assert os.path.exists(result)

    @patch('pipeline.ESPNScraper')
    @patch('pipeline.CBSScraper')
    @patch('pipeline.NFLScraper')
    @patch('pipeline.FantasyProsScraper')
    def test_pipeline_handles_scraper_failure(
        self, mock_fp, mock_nfl, mock_cbs, mock_espn
    ):
        """Verify pipeline continues if one scraper fails."""
        from pipeline import DataPipeline

        # Setup mocks - ESPN fails
        mock_espn.return_value.scrape.side_effect = Exception("ESPN down")
        mock_espn.return_value.get_source_name.return_value = "ESPN"
        mock_cbs.return_value.scrape.return_value = []
        mock_cbs.return_value.get_source_name.return_value = "CBS"
        mock_nfl.return_value.scrape.return_value = []
        mock_nfl.return_value.get_source_name.return_value = "NFL"
        mock_fp.return_value.scrape.return_value = []

        with tempfile.TemporaryDirectory() as tmpdir:
            pipeline = DataPipeline(output_dir=tmpdir)
            # Should not raise - continues with other scrapers
            result = pipeline.run(validate=False)
            assert os.path.exists(result)

    @patch('pipeline.ESPNScraper')
    @patch('pipeline.CBSScraper')
    @patch('pipeline.NFLScraper')
    @patch('pipeline.FantasyProsScraper')
    @patch('pipeline.validate_projections')
    @patch('pipeline.validate_adp')
    def test_pipeline_validates_when_enabled(
        self, mock_validate_adp, mock_validate_proj,
        mock_fp, mock_nfl, mock_cbs, mock_espn
    ):
        """Verify validation is called when validate=True."""
        from pipeline import DataPipeline
        from validators.data_quality import ValidationResult

        # Setup mocks
        for mock in [mock_espn, mock_cbs, mock_nfl]:
            mock.return_value.scrape.return_value = []
            mock.return_value.get_source_name.return_value = "Test"
        mock_fp.return_value.scrape.return_value = []

        mock_validate_proj.return_value = ValidationResult(True, [], [], {})
        mock_validate_adp.return_value = ValidationResult(True, [], [], {})

        with tempfile.TemporaryDirectory() as tmpdir:
            pipeline = DataPipeline(output_dir=tmpdir)
            pipeline.run(validate=True)

        assert mock_validate_proj.called
        assert mock_validate_adp.called

    @patch('pipeline.ESPNScraper')
    @patch('pipeline.CBSScraper')
    @patch('pipeline.NFLScraper')
    @patch('pipeline.FantasyProsScraper')
    @patch('pipeline.validate_projections')
    @patch('pipeline.validate_adp')
    def test_pipeline_skips_validation_when_disabled(
        self, mock_validate_adp, mock_validate_proj,
        mock_fp, mock_nfl, mock_cbs, mock_espn
    ):
        """Verify validation is skipped when validate=False."""
        from pipeline import DataPipeline

        # Setup mocks
        for mock in [mock_espn, mock_cbs, mock_nfl]:
            mock.return_value.scrape.return_value = []
            mock.return_value.get_source_name.return_value = "Test"
        mock_fp.return_value.scrape.return_value = []

        with tempfile.TemporaryDirectory() as tmpdir:
            pipeline = DataPipeline(output_dir=tmpdir)
            pipeline.run(validate=False)

        mock_validate_proj.assert_not_called()
        mock_validate_adp.assert_not_called()

    @patch('pipeline.ESPNScraper')
    @patch('pipeline.CBSScraper')
    @patch('pipeline.NFLScraper')
    @patch('pipeline.FantasyProsScraper')
    @patch('pipeline.validate_projections')
    def test_pipeline_raises_on_validation_failure(
        self, mock_validate_proj,
        mock_fp, mock_nfl, mock_cbs, mock_espn
    ):
        """Verify pipeline raises ValueError on validation failure."""
        from pipeline import DataPipeline
        from validators.data_quality import ValidationResult

        # Setup mocks
        mock_espn.return_value.scrape.return_value = [MagicMock()]
        mock_espn.return_value.get_source_name.return_value = "ESPN"
        mock_cbs.return_value.scrape.return_value = []
        mock_cbs.return_value.get_source_name.return_value = "CBS"
        mock_nfl.return_value.scrape.return_value = []
        mock_nfl.return_value.get_source_name.return_value = "NFL"
        mock_fp.return_value.scrape.return_value = []

        mock_validate_proj.return_value = ValidationResult(
            False, ["Not enough players"], [], {}
        )

        with tempfile.TemporaryDirectory() as tmpdir:
            pipeline = DataPipeline(output_dir=tmpdir)
            with pytest.raises(ValueError, match="ESPN validation failed"):
                pipeline.run(validate=True, strict=True)


class TestRunPipeline:
    """Tests for run_pipeline convenience function."""

    @patch('pipeline.DataPipeline')
    def test_run_pipeline_creates_and_runs_pipeline(self, mock_pipeline_class):
        """Verify run_pipeline creates DataPipeline and calls run."""
        from pipeline import run_pipeline

        mock_instance = MagicMock()
        mock_instance.run.return_value = "/path/to/output.json"
        mock_pipeline_class.return_value = mock_instance

        result = run_pipeline(validate=True, strict=False)

        mock_pipeline_class.assert_called_once()
        mock_instance.run.assert_called_once_with(validate=True, strict=False)
        assert result == "/path/to/output.json"

    @patch('pipeline.DataPipeline')
    def test_run_pipeline_passes_arguments(self, mock_pipeline_class):
        """Verify run_pipeline passes validate and strict arguments."""
        from pipeline import run_pipeline

        mock_instance = MagicMock()
        mock_pipeline_class.return_value = mock_instance

        run_pipeline(validate=False, strict=True)

        mock_instance.run.assert_called_once_with(validate=False, strict=True)
