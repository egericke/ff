import logging
import os

import aggregate
import scrape
import upload

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s:%(message)s")


def run():
    """Main entry point for data pipeline."""
    if not os.environ.get("S3_BUCKET") or not os.environ.get("AWS_ACCESS_KEY_ID"):
        logging.fatal("missing env vars: S3_BUCKET and AWS_ACCESS_KEY_ID required")
        raise RuntimeError("missing env vars")

    try:
        scrape.scrape()
        aggregate.aggregate()
        upload.upload()
    except KeyboardInterrupt:
        logging.info("Pipeline interrupted by user")
        raise
    except Exception:
        logging.exception("failed to update data")
        raise


if __name__ == "__main__":
    run()
