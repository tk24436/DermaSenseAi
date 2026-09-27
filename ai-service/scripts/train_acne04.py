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

    import torch
    from ultralytics import YOLO

    device = args.device
    if device is None:
        device = 0 if torch.cuda.is_available() else "cpu"
        print(f"Detected CUDA available: {torch.cuda.is_available()}. Using device: {device}")

    print(f"Loading pretrained YOLOv8s base model...")
    model = YOLO("yolov8s.pt")

    batch_size = args.batch
    print(f"Starting training on {data_path} with batch={batch_size}, imgsz={args.imgsz}, epochs={args.epochs}...")

    try:
        results = model.train(
            data=str(data_path),
            epochs=args.epochs,
            imgsz=args.imgsz,
            batch=batch_size,
            patience=args.patience,
            device=device,
            plots=True,
        )
    except torch.cuda.OutOfMemoryError:
        print(f"WARNING: CUDA Out Of Memory with batch={batch_size}. Retrying with batch=8...")
        torch.cuda.empty_cache()
        batch_size = 8
        results = model.train(
            data=str(data_path),
            epochs=args.epochs,
            imgsz=args.imgsz,
            batch=batch_size,
            patience=args.patience,
            device=device,
            plots=True,
        )

    print("\n--- Training Complete. Running Validation ---")
    val_results = model.val()

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
    exported_onnx_path = model.export(format="onnx")
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
