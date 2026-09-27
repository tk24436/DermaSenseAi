# AI Analysis Service API Specification

**Base URL:** `http://localhost:8000`  
**Service:** AI Skin Health Analyzer (FastAPI + OpenCV + YOLOv8/ONNX + Face++ Fallback)

---

## 1. Overview

The AI Analysis Service receives user face photographs, performs OpenCV quality and face detection checks, and evaluates skin metrics across acne severity, pigmentation, wrinkles, texture, pore visibility, and overall skin health.

The analysis is powered by:
1. **Primary Local Pipeline:** YOLOv8s fine-tuned on the ACNE04 dataset (Roboflow Universe) exported to ONNX Runtime, integrated with Glowlytics facial signal models (structure, hydration, elasticity).
2. **Fallback Cloud Pipeline:** Face++ Skin Analyze API (`/facepp/v1/skinanalyze`) invoked if local detection confidence is low or when `ACTIVE_ANALYZER=facepp` is specified.

---

## 2. Endpoints

### 2.1 Health Check

```http
GET /health
```

#### Response (`200 OK`)
```json
{
  "status": "ok"
}
```

---

### 2.2 Analyze Skin Image

```http
POST /api/ai/analyze
```

Accepts a multipart file upload containing a face image, validates quality with OpenCV, performs inference, saves the image to MinIO/S3 and metadata to the database, and returns the standardized contract.

#### Headers
| Header | Value | Description |
|---|---|---|
| `Content-Type` | `multipart/form-data` | Required |

#### Request Body (Multipart Form)
| Form Field | Type | Required | Description |
|---|---|---|---|
| `file` | `binary` | Yes | Face photo image (`image/jpeg`, `image/png`, `image/webp`). Max 10 MB. |

#### Preprocessing & Validation Checks (HTTP 400)
The image is preprocessed using OpenCV:
- Rejects files where format cannot be decoded.
- Rejects images with resolution smaller than **150x150 pixels**.
- Rejects images that are too dark (mean grayscale brightness < 40/255).
- Rejects images where no frontal face is detected via Haar Cascade (`haarcascade_frontalface_default.xml`).

---

#### Response Contract (`200 OK`)

```json
{
  "detectedIssues": [
    {
      "issue": "Acne",
      "present": true,
      "confidence": 0.87,
      "severity": "high"
    },
    {
      "issue": "Pigmentation (Spots)",
      "present": true,
      "confidence": 0.65,
      "severity": "medium"
    },
    {
      "issue": "Dark Circles",
      "present": false,
      "confidence": 0.12,
      "severity": "none"
    },
    {
      "issue": "Wrinkles (Forehead)",
      "present": false,
      "confidence": 0.08,
      "severity": "none"
    }
  ],
  "poresDetected": [
    {
      "region": "Left Cheek",
      "present": true,
      "confidence": 0.88,
      "severity": "high"
    },
    {
      "region": "Right Cheek",
      "present": true,
      "confidence": 0.82,
      "severity": "high"
    },
    {
      "region": "Forehead",
      "present": true,
      "confidence": 0.75,
      "severity": "medium"
    },
    {
      "region": "Jaw",
      "present": false,
      "confidence": 0.15,
      "severity": "none"
    }
  ],
  "skinType": "combination",
  "skinScore": 82,
  "subscores": {
    "acne": 90,
    "pigmentation": 80,
    "darkCircles": 100,
    "wrinkles": 100,
    "texture": 82,
    "oilBalance": 100
  }
}
```

---

## 3. Attribute Provenance & Fallback Notes

| Field | ACNE04 Local Pipeline | Face++ Fallback Pipeline |
|---|---|---|
| **Acne** | YOLOv8s fine-tuned on ACNE04 (classes represent severity levels 0-3) | Face++ `acne` {value, confidence} |
| **Pores** | Glowlytics `structure_model.onnx` regional estimation | Face++ `pores_forehead`, `pores_left_cheek`, `pores_right_cheek`, `pores_jaw` |
| **Skin Type** | Glowlytics hydration & oil balance heuristic | Face++ `skin_type` enum (0=oily, 1=dry, 2=neutral, 3=combination) |
| **Pigmentation** | Glowlytics `sunDamage` signal | Face++ `skin_spot` and `mole` |
| **Wrinkles** | Glowlytics `elasticity_model.onnx` | Face++ `forehead_wrinkle`, `crows_feet`, `eye_finelines`, `glabella_wrinkle`, `nasolabial_fold` |
| **Dark Circles** | Evaluated in hybrid/Face++ mode | Face++ `dark_circle` |

*Note:* In standalone ACNE04 mode without Glowlytics models, only Acne is evaluated from detected bounding boxes; all non-evaluated issues are safely marked with `present=false`, `confidence=0.0`, and `severity="none"`.

---

## 4. Sample Requests

### cURL
```bash
curl -X POST "http://localhost:8000/api/ai/analyze" \
  -H "Accept: application/json" \
  -F "file=@face_sample.jpg"
```

### Python
```python
import requests

url = "http://localhost:8000/api/ai/analyze"
with open("face_sample.jpg", "rb") as f:
    files = {"file": ("face_sample.jpg", f, "image/jpeg")}
    response = requests.post(url, files=files)

print("Status:", response.status_code)
print(response.json())
```

---

## 5. Error Responses

| Status Code | Description | Example Payload |
|---|---|---|
| `400 Bad Request` | Invalid format / No face / Too dark / Too small | `{"detail": "No face detected in the image. Please upload a clear frontal face photo."}` |
| `413 Payload Too Large` | Image file exceeds 10 MB | `{"detail": "Image exceeds maximum size of 10 MB"}` |
| `502 Bad Gateway` | Upstream analysis service failure | `{"detail": "Skin analysis failed: Upstream service unavailable"}` |
| `503 Service Unavailable` | Analyzer configuration error (missing keys) | `{"detail": "Face++ API credentials not configured."}` |
