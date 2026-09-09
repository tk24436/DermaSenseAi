import json
import logging
import os
import uuid

import boto3
from botocore.exceptions import ClientError, NoCredentialsError

logger = logging.getLogger(__name__)

# Maximum image size: 10 MB
MAX_IMAGE_SIZE = 10 * 1024 * 1024


from botocore.config import Config

class StorageService:
    def __init__(self):
        self.s3_client = boto3.client(
            "s3",
            aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID", "admin"),
            aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY", "password123"),
            region_name=os.getenv("AWS_REGION", "us-east-1"),
            endpoint_url=os.getenv("S3_ENDPOINT_URL", "http://localhost:9000"),
            config=Config(connect_timeout=2, read_timeout=2, retries={'max_attempts': 0})
        )
        self.bucket_name = os.getenv("S3_BUCKET_NAME", "dermasense-images")

    def ensure_bucket_exists(self):
        """Create the bucket if it doesn't exist. Called lazily, not at startup."""
        try:
            self.s3_client.head_bucket(Bucket=self.bucket_name)
        except ClientError:
            try:
                self.s3_client.create_bucket(Bucket=self.bucket_name)
                policy = {
                    "Version": "2012-10-17",
                    "Statement": [
                        {
                            "Sid": "PublicReadGetObject",
                            "Effect": "Allow",
                            "Principal": "*",
                            "Action": ["s3:GetObject"],
                            "Resource": [f"arn:aws:s3:::{self.bucket_name}/*"],
                        }
                    ],
                }
                self.s3_client.put_bucket_policy(
                    Bucket=self.bucket_name, Policy=json.dumps(policy)
                )
                logger.info("Created bucket: %s", self.bucket_name)
            except Exception as e:
                logger.error("Failed to create bucket %s: %s", self.bucket_name, e)
                raise RuntimeError(f"Storage unavailable: could not create bucket") from e

    def upload_image(self, file_content: bytes, filename: str, content_type: str = "image/jpeg") -> str:
        """Upload image bytes to S3/MinIO and return the public URL."""
        if len(file_content) > MAX_IMAGE_SIZE:
            raise ValueError(f"Image exceeds maximum size of {MAX_IMAGE_SIZE // (1024*1024)} MB")

        # Sanitize filename — keep only alphanumeric, dots, hyphens, underscores
        safe_filename = "".join(c for c in filename if c.isalnum() or c in ".-_")
        if not safe_filename:
            safe_filename = "upload.jpg"
        unique_filename = f"{uuid.uuid4()}_{safe_filename}"

        try:
            self.ensure_bucket_exists()
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=unique_filename,
                Body=file_content,
                ContentType=content_type,
            )
            endpoint = os.getenv("S3_ENDPOINT_URL", "http://localhost:9000")
            return f"{endpoint}/{self.bucket_name}/{unique_filename}"
        except NoCredentialsError:
            logger.error("S3 credentials not available")
            raise RuntimeError("Storage credentials not configured")
        except Exception as e:
            logger.error("Failed to upload image: %s", e)
            raise RuntimeError("Failed to upload image to storage") from e
