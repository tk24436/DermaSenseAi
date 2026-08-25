"""
Download ONNX models from HuggingFace for DermaSense AI
"""
import os
import sys
import urllib.request

MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")
BASE_URL = "https://huggingface.co/mufasabrownie/glowlytics-skin-models/resolve/main"

MODELS = [
    "acne_detector.onnx",
    "structure_model.onnx",
    "hydration_model.onnx",
    "elasticity_model.onnx",
]

def download_model(filename):
    dest = os.path.join(MODELS_DIR, filename)
    if os.path.exists(dest):
        size = os.path.getsize(dest)
        if size > 10000:  # >10KB means it's a real file, not an LFS pointer
            print(f"  [SKIP] {filename} already exists ({size // 1024}KB)")
            return True
    url = f"{BASE_URL}/{filename}"
    print(f"  [DOWNLOADING] {filename} from {url}")
    try:
        def reporthook(count, block_size, total_size):
            if total_size > 0:
                pct = int(count * block_size * 100 / total_size)
                mb_done = count * block_size / 1024 / 1024
                mb_total = total_size / 1024 / 1024
                print(f"\r    {pct}% ({mb_done:.1f}/{mb_total:.1f} MB)", end="", flush=True)
        urllib.request.urlretrieve(url, dest, reporthook)
        print()  # newline after progress
        print(f"  [DONE] {filename} saved ({os.path.getsize(dest) // 1024}KB)")
        return True
    except Exception as e:
        print(f"  [ERROR] Failed to download {filename}: {e}")
        return False

if __name__ == "__main__":
    os.makedirs(MODELS_DIR, exist_ok=True)
    print(f"Downloading models to: {MODELS_DIR}\n")
    success = []
    failed = []
    for model in MODELS:
        ok = download_model(model)
        (success if ok else failed).append(model)
    print(f"\n=== Done: {len(success)} downloaded, {len(failed)} failed ===")
    if failed:
        print("Failed:", failed)
        sys.exit(1)
