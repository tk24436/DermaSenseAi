# Recommendation Engine API

**Endpoint**: `POST /api/recommend`

Generates a personalized skincare routine and educational explanation based on AI skin analysis and user profile.

## Request

**Headers**:
- `Content-Type: application/json`

**Body**:
```json
{
  "userId": "string",
  "skinAnalysis": {
    "detectedIssues": [
      {
        "issue": "string",
        "present": "boolean",
        "confidence": "float",
        "severity": "string"
      }
    ],
    "poresDetected": [
      {
        "region": "string",
        "present": "boolean",
        "confidence": "float",
        "severity": "string"
      }
    ],
    "skinType": "string (oily | dry | neutral | combination)",
    "skinScore": "integer",
    "subscores": {
      "acne": "integer",
      "pigmentation": "integer",
      "darkCircles": "integer",
      "wrinkles": "integer",
      "texture": "integer",
      "oilBalance": "integer"
    }
  },
  "skinProfile": {
    "allergies": ["string"]
  }
}
```

## Response

```json
{
  "routine": {
    "morning": [
      {
        "step": "string",
        "product": "string"
      }
    ],
    "night": [
      {
        "step": "string",
        "product": "string"
      }
    ],
    "weekly": [
      {
        "step": "string",
        "product": "string"
      }
    ]
  },
  "explanation": "string",
  "insights": ["string"],
  "disclaimer": "*Disclaimer: This is not medical advice. Please consult a dermatologist for medical concerns.*"
}
```

## Sample cURL

```bash
curl -X POST http://localhost:8000/recommend \
-H "Content-Type: application/json" \
-d '{
  "userId": "user123",
  "skinAnalysis": {
    "detectedIssues": [
      { "issue": "Acne", "present": true, "confidence": 0.87, "severity": "high" }
    ],
    "poresDetected": [],
    "skinType": "oily",
    "skinScore": 82,
    "subscores": {
      "acne": 90,
      "pigmentation": 80,
      "darkCircles": 100,
      "wrinkles": 100,
      "texture": 82,
      "oilBalance": 100
    }
  },
  "skinProfile": {
    "allergies": ["Salicylic Acid"]
  }
}'
```
