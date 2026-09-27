"""
download_acne04.py
------------------
Downloads the ACNE04 dataset from Roboflow Universe using credentials
from ai-service/.env and saves it into ai-service/data/acne04 (ignored by Git).
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Ensure .env is loaded from ai-service/.env
current_dir = Path(__file__).resolve().parent
ai_service_dir = current_dir.parent
env_path = ai_service_dir / ".env"
load_dotenv(dotenv_path=env_path)

api_key = os.getenv("ROBOFLOW_API_KEY")
if not api_key:
    print("ERROR: ROBOFLOW_API_KEY is not set in", env_path, file=sys.stderr)
    sys.exit(1)

from roboflow import Roboflow

print("Connecting to Roboflow workspace and downloading ACNE04 dataset...")
rf = Roboflow(api_key=api_key)
project = rf.workspace("andrei-dore-5lz05").project("acne04")
version = project.version(1)

target_location = str(ai_service_dir / "data" / "acne04")
dataset = version.download("yolov8", location=target_location)
print(f"Dataset successfully downloaded to: {target_location}")
