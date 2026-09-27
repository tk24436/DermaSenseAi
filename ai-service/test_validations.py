"""
Tests for OpenCV rejection (no-face, too-small, too-dark, invalid format).
Ensures 400 Bad Request is returned instead of crashing.
"""

import io
import requests
import numpy as np
from PIL import Image

url = "http://127.0.0.1:8000/api/ai/analyze"


def test_too_small_image():
    # 50x50 image (below 150x150 minimum)
    img = Image.new("RGB", (50, 50), color="white")
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)

    res = requests.post(url, files={"file": ("small.jpg", buf.getvalue(), "image/jpeg")})
    assert res.status_code == 400, f"Expected 400, got {res.status_code}"
    assert "resolution too small" in res.json()["detail"].lower()
    print("PASS: test_too_small_image ->", res.json()["detail"])


def test_too_dark_image():
    # 200x200 pitch black image
    img = Image.new("RGB", (200, 200), color="black")
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)

    res = requests.post(url, files={"file": ("dark.jpg", buf.getvalue(), "image/jpeg")})
    assert res.status_code == 400, f"Expected 400, got {res.status_code}"
    assert "too dark" in res.json()["detail"].lower()
    print("PASS: test_too_dark_image ->", res.json()["detail"])


def test_no_face_image():
    # 300x300 gradient / scenery without face
    arr = np.zeros((300, 300, 3), dtype=np.uint8)
    arr[:, :] = [180, 180, 180]  # gray background
    img = Image.fromarray(arr)
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)

    res = requests.post(url, files={"file": ("noface.jpg", buf.getvalue(), "image/jpeg")})
    assert res.status_code == 400, f"Expected 400, got {res.status_code}"
    assert "no face detected" in res.json()["detail"].lower()
    print("PASS: test_no_face_image ->", res.json()["detail"])


if __name__ == "__main__":
    test_too_small_image()
    test_too_dark_image()
    test_no_face_image()
    print("All image validation checks passed successfully!")
