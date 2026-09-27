"""
evaluate_and_export.py
---------------------
Evaluate best ACNE04 YOLOv8s fine-tuned model checkpoint on validation set,
report final metrics (mAP50, mAP50-95, precision, recall),
and export to ONNX format deployed to ai-service/models/acne_detector.onnx.
"""

import os
import shutil
import sys
from pathlib import Path

# Prevent OpenCV / threading crashes
os.environ["OPENCV_FORBID_OPENCL"] = "1"
os.environ["OMP_NUM_THREADS"] = "1"
import cv2
cv2.setNumThreads(0)
from PIL import Image
import numpy as np
import ultralytics.utils.patches as patches

def robust_imread(filename, flags=cv2.IMREAD_COLOR):
    filename_str = str(filename)
    for attempt in range(10):
        try:
            img = Image.open(filename_str)
            img.load()
            if flags == cv2.IMREAD_GRAYSCALE:
                arr = np.asarray(img.convert("L"))[..., None]
            else:
                arr = np.asarray(img.convert("RGB"))[:, :, ::-1].copy()
            img.close()
            return arr
        except Exception:
            import time
            time.sleep(0.05 * (attempt + 1))
    try:
        arr = cv2.imread(filename_str, flags)
        if arr is not None:
            return arr
    except Exception:
        pass
    return np.zeros((640, 640, 3), dtype=np.uint8)

patches.imread = robust_imread

import torch
from ultralytics import YOLO

def main():
    current_dir = Path(__file__).resolve().parent
    ai_service_dir = current_dir.parent
    data_path = ai_service_dir / "data" / "acne04" / "data.yaml"
    best_pt = ai_service_dir.parent / "runs" / "detect" / "train-16" / "weights" / "best.pt"

    if not best_pt.exists():
        print(f"ERROR: Checkpoint not found at {best_pt}", file=sys.stderr)
        sys.exit(1)

    print(f"Loading best fine-tuned ACNE04 checkpoint: {best_pt}")
    model = YOLO(str(best_pt))

    print("\n--- Running Validation on ACNE04 Validation Set (workers=0) ---")
    val_results = model.val(data=str(data_path), workers=0, plots=False)

    map50 = getattr(val_results.box, "map50", None)
    map50_95 = getattr(val_results.box, "map", None)
    mp = getattr(val_results.box, "mp", None)
    mr = getattr(val_results.box, "mr", None)

    print("\n================ FINAL MODEL METRICS ================")
    print(f"mAP50:      {map50:.4f}" if map50 is not None else "mAP50: N/A")
    print(f"mAP50-95:   {map50_95:.4f}" if map50_95 is not None else "mAP50-95: N/A")
    print(f"Precision:  {mp:.4f}" if mp is not None else "Precision: N/A")
    print(f"Recall:     {mr:.4f}" if mr is not None else "Recall: N/A")
    print("=====================================================\n")

    print("--- Exporting Best Weights to ONNX Format ---")
    exported_onnx_path = model.export(format="onnx")
    print(f"Exported ONNX model: {exported_onnx_path}")

    target_dest = ai_service_dir / "models" / "acne_detector.onnx"
    if exported_onnx_path and os.path.exists(exported_onnx_path):
        if target_dest.exists():
            backup_path = ai_service_dir / "models" / "acne_detector.onnx.bak"
            shutil.copy2(target_dest, backup_path)
            print(f"Backed up previous model to {backup_path}")
        shutil.copy2(exported_onnx_path, target_dest)
        print(f"SUCCESS: Deployed fine-tuned model to {target_dest}")

if __name__ == "__main__":
    main()
