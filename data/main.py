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
