"""Tests for exception handling in the data pipeline."""

import pytest
from unittest.mock import patch, MagicMock


class TestKeyboardInterruptPropagation:
    """Test that KeyboardInterrupt propagates correctly and is not caught."""

    def test_main_run_propagates_keyboard_interrupt(self):
        """KeyboardInterrupt should not be caught by the exception handler in main.run()."""
        with patch.dict('os.environ', {'S3_BUCKET': 'test', 'AWS_ACCESS_KEY_ID': 'test'}):
            with patch('scrape.scrape', side_effect=KeyboardInterrupt):
                import main
                with pytest.raises(KeyboardInterrupt):
                    main.run()

    def test_scrape_propagates_keyboard_interrupt(self):
        """KeyboardInterrupt should not be caught by the exception handler in scrape.scrape()."""
        with patch('scrape.scrape_espn', side_effect=KeyboardInterrupt):
            with patch('scrape.DRIVER') as mock_driver:
                import scrape
                with pytest.raises(KeyboardInterrupt):
                    scrape.scrape()
                # Driver should still be quit in finally block
                mock_driver.quit.assert_called()

    def test_upload_propagates_keyboard_interrupt(self):
        """KeyboardInterrupt should not be caught by the exception handler in upload.upload()."""
        with patch('boto3.client') as mock_client:
            mock_s3 = MagicMock()
            mock_s3.upload_file.side_effect = KeyboardInterrupt
            mock_client.return_value = mock_s3
            with patch.dict('os.environ', {'S3_BUCKET': 'test'}):
                import upload
                with pytest.raises(KeyboardInterrupt):
                    upload.upload()


class TestExceptionReRaising:
    """Test that exceptions are re-raised after logging."""

    def test_main_run_reraises_runtime_error(self):
        """RuntimeError should be re-raised after logging in main.run()."""
        with patch.dict('os.environ', {'S3_BUCKET': 'test', 'AWS_ACCESS_KEY_ID': 'test'}):
            with patch('scrape.scrape', side_effect=RuntimeError("test error")):
                import main
                with pytest.raises(RuntimeError, match="test error"):
                    main.run()

    def test_scrape_reraises_exception(self):
        """Exception should be re-raised after logging in scrape.scrape()."""
        with patch('scrape.scrape_espn', side_effect=ValueError("scrape error")):
            with patch('scrape.DRIVER') as mock_driver:
                import scrape
                with pytest.raises(ValueError, match="scrape error"):
                    scrape.scrape()
                # Driver should be quit in finally block
                mock_driver.quit.assert_called()

    def test_upload_reraises_exception(self):
        """Exception should be re-raised after logging in upload.upload()."""
        with patch('boto3.client') as mock_client:
            mock_s3 = MagicMock()
            mock_s3.upload_file.side_effect = ValueError("upload error")
            mock_client.return_value = mock_s3
            with patch.dict('os.environ', {'S3_BUCKET': 'test'}):
                import upload
                with pytest.raises(ValueError, match="upload error"):
                    upload.upload()


class TestMissingEnvVars:
    """Test behavior when environment variables are missing."""

    def test_main_raises_on_missing_s3_bucket(self):
        """main.run() should raise RuntimeError when S3_BUCKET is missing."""
        with patch.dict('os.environ', {'AWS_ACCESS_KEY_ID': 'test'}, clear=True):
            import main
            with pytest.raises(RuntimeError, match="missing env vars"):
                main.run()

    def test_main_raises_on_missing_aws_key(self):
        """main.run() should raise RuntimeError when AWS_ACCESS_KEY_ID is missing."""
        with patch.dict('os.environ', {'S3_BUCKET': 'test'}, clear=True):
            import main
            with pytest.raises(RuntimeError, match="missing env vars"):
                main.run()
