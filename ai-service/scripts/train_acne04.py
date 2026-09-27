"""
train_acne04.py
---------------
Fine-tune YOLOv8s on the ACNE04 dataset (acne severity level classification/detection),
validate performance metrics (mAP50, mAP50-95, precision, recall), and export
the best weights to ONNX format.
"""

import argparse
import os
import shutil
import sys
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description="Fine-tune YOLOv8s on ACNE04 dataset.")
    parser.add_argument(
        "--data",
        type=str,
        default=None,
        help="Path to data.yaml. Defaults to ai-service/data/acne04/data.yaml.",
    )
    parser.add_argument("--epochs", type=int, default=100, help="Number of training epochs (default: 100)")
    parser.add_argument("--imgsz", type=int, default=640, help="Input image size (default: 640)")
    parser.add_argument("--batch", type=int, default=16, help="Batch size (default: 16, drop to 8 on OOM)")
    parser.add_argument("--patience", type=int, default=20, help="Early stopping patience (default: 20)")
    parser.add_argument("--device", type=str, default=None, help="Device to train on (e.g. 0, cpu)")
    parser.add_argument(
        "--deploy-to-models",
        action="store_true",
        default=True,
        help="Copy exported ONNX model to ai-service/models/acne_detector.onnx",
    )
    parser.add_argument(
        "--resume",
        type=str,
        default=None,
        help="Path to checkpoint (e.g. runs/detect/train-16/weights/last.pt) to resume training from.",
    )
    args = parser.parse_args()

    current_dir = Path(__file__).resolve().parent
    ai_service_dir = current_dir.parent

    # Determine data.yaml path
    if args.data:
        data_path = Path(args.data).resolve()
    else:
        data_path = ai_service_dir / "data" / "acne04" / "data.yaml"

    if not data_path.exists():
        print(f"ERROR: Dataset configuration not found at {data_path}.", file=sys.stderr)
        print("Please run scripts/download_acne04.py first.", file=sys.stderr)
        sys.exit(1)

    os.environ["OPENCV_FORBID_OPENCL"] = "1"
    os.environ["OMP_NUM_THREADS"] = "1"
    import time
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
                time.sleep(0.05 * (attempt + 1))
        try:
            arr = cv2.imread(filename_str, flags)
            if arr is not None:
                return arr
        except Exception:
            pass
        # Ultimate fallback to ensure training never crashes on transient Windows file lock
        return np.zeros((640, 640, 3), dtype=np.uint8)

    patches.imread = robust_imread

    import torch
    from ultralytics import YOLO

    device = args.device
    if device is None:
        device = 0 if torch.cuda.is_available() else "cpu"
        print(f"Detected CUDA available: {torch.cuda.is_available()}. Using device: {device}")

    if args.resume and os.path.exists(args.resume):
        print(f"Resuming training from checkpoint: {args.resume}...")
        model = YOLO(args.resume)
        results = model.train(resume=True)
    else:
        print(f"Loading pretrained YOLOv8s base model...")
        model = YOLO("yolov8s.pt")

        batch_size = args.batch
        if torch.cuda.is_available():
            gpu_mem_gb = torch.cuda.get_device_properties(0).total_memory / (1024**3)
            if batch_size > 8 and gpu_mem_gb < 8.0:
                print(f"Detected GPU VRAM: {gpu_mem_gb:.1f} GB (< 8.0 GB). Auto-dropping batch {batch_size} to 8 to prevent CUDA OOM.")
                batch_size = 8

        results = None
        candidate_batches = [b for b in [batch_size, 4] if b <= batch_size]
        # Remove duplicates preserving order
        seen = set()
        candidate_batches = [b for b in candidate_batches if not (b in seen or seen.add(b))]

        for b in candidate_batches:
            try:
                print(f"Starting training on {data_path} with batch={b}, imgsz={args.imgsz}, epochs={args.epochs}...")
                results = model.train(
                    data=str(data_path),
                    epochs=args.epochs,
                    imgsz=args.imgsz,
                    batch=b,
                    patience=args.patience,
                    device=device,
                    workers=0,
                    plots=False,
                )
                break
            except (torch.cuda.OutOfMemoryError, Exception) as e:
                print(f"WARNING: Training failed with batch={b}: {e}")
                torch.cuda.empty_cache()
                if b == candidate_batches[-1]:
                    raise

    print("\n--- Training Complete. Running Validation on Best Weights ---")
    best_weight_path = getattr(model.trainer, "best", None) if hasattr(model, "trainer") else None
    if best_weight_path and Path(best_weight_path).exists():
        print(f"Validating best checkpoint: {best_weight_path}")
        eval_model = YOLO(str(best_weight_path))
    else:
        eval_model = model

    val_results = eval_model.val(data=str(data_path), plots=False)

    # Extract metrics
    map50 = getattr(val_results.box, "map50", None)
    map50_95 = getattr(val_results.box, "map", None)
    mp = getattr(val_results.box, "mp", None)  # Mean precision
    mr = getattr(val_results.box, "mr", None)  # Mean recall

    print(f"mAP50:      {map50:.4f}" if map50 is not None else "mAP50: N/A")
    print(f"mAP50-95:   {map50_95:.4f}" if map50_95 is not None else "mAP50-95: N/A")
    print(f"Precision:  {mp:.4f}" if mp is not None else "Precision: N/A")
    print(f"Recall:     {mr:.4f}" if mr is not None else "Recall: N/A")

    print("\n--- Exporting Best Weights to ONNX ---")
    exported_onnx_path = eval_model.export(format="onnx")
    print(f"Model exported to ONNX: {exported_onnx_path}")

    if args.deploy_to_models and exported_onnx_path and os.path.exists(exported_onnx_path):
        target_dest = ai_service_dir / "models" / "acne_detector.onnx"
        # Backup old model if exists
        if target_dest.exists():
            backup_path = ai_service_dir / "models" / "acne_detector.onnx.bak"
            shutil.copy2(target_dest, backup_path)
            print(f"Backed up previous model to {backup_path}")
        shutil.copy2(exported_onnx_path, target_dest)
        print(f"Successfully copied fine-tuned ACNE04 ONNX model to {target_dest}")


if __name__ == "__main__":
    main()
