import datetime
import logging
import os

import boto3

YEAR = datetime.datetime.now().year
DIR = os.path.dirname(__file__)
PROJECTIONS = os.path.join(DIR, "processed", f"Projections-{YEAR}.json")


def upload():
    """Upload projections to S3."""
    s3 = boto3.client("s3")

    logging.info(
        "uploading to S3: projections=%s bucket=%s",
        PROJECTIONS,
        os.environ["S3_BUCKET"],
    )

    try:
        s3.upload_file(
            PROJECTIONS,
            os.environ["S3_BUCKET"],
            "projections.json",
            ExtraArgs={"ACL": "public-read", "CacheControl": "max-age=7200,public"},
        )
        s3.upload_file(
            PROJECTIONS,
            os.environ["S3_BUCKET"],
            f"history/{datetime.datetime.now().strftime('%Y-%m-%d_%H-%M-%S')}.json",
        )
        logging.info("Upload completed successfully")
    except KeyboardInterrupt:
        logging.info("Upload interrupted by user")
        raise
    except Exception:
        logging.exception("failed to upload")
        raise
