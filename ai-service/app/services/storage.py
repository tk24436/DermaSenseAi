import os
import boto3
from botocore.exceptions import NoCredentialsError
import uuid

class StorageService:
    def __init__(self):
        self.s3_client = boto3.client(
            's3',
            aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID", "admin"),
            aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY", "password123"),
            region_name=os.getenv("AWS_REGION", "us-east-1"),
            endpoint_url=os.getenv("S3_ENDPOINT_URL", "http://localhost:9000")
        )
        self.bucket_name = os.getenv("S3_BUCKET_NAME", "dermasense-images")
        self._ensure_bucket_exists()

    def _ensure_bucket_exists(self):
        try:
            self.s3_client.head_bucket(Bucket=self.bucket_name)
        except Exception:
            try:
                self.s3_client.create_bucket(Bucket=self.bucket_name)
                # Set public read policy for images
                policy = {
                    "Version": "2012-10-17",
                    "Statement": [
                        {
                            "Sid": "PublicReadGetObject",
                            "Effect": "Allow",
                            "Principal": "*",
                            "Action": ["s3:GetObject"],
                            "Resource": [f"arn:aws:s3:::{self.bucket_name}/*"]
                        }
                    ]
                }
                import json
                self.s3_client.put_bucket_policy(Bucket=self.bucket_name, Policy=json.dumps(policy))
            except Exception as e:
                print(f"Error creating bucket {self.bucket_name}: {e}")

    def upload_image(self, file_content: bytes, filename: str) -> str:
        unique_filename = f"{uuid.uuid4()}_{filename}"
        try:
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=unique_filename,
                Body=file_content,
                ContentType="image/jpeg" # Should be dynamic based on actual type
            )
            endpoint = os.getenv("S3_ENDPOINT_URL", "http://localhost:9000")
            return f"{endpoint}/{self.bucket_name}/{unique_filename}"
        except NoCredentialsError:
            print("Credentials not available")
            return ""
