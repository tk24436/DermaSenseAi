import os
import json
from main import recommend, RecommendRequest

mock_requests = [
    {
        "userId": "user123",
        "skinAnalysis": {
            "detectedIssues": [
                { "issue": "Acne", "present": True, "confidence": 0.87, "severity": "high" },
                { "issue": "Dark Circles", "present": False, "confidence": 0.12, "severity": "none" }
            ],
            "poresDetected": [
                { "region": "Left Cheek", "present": True, "confidence": 0.88, "severity": "high" }
            ],
            "skinType": "oily",
            "skinScore": 82,
            "subscores": {
                "acne": 90, "pigmentation": 80, "darkCircles": 100, "wrinkles": 100, "texture": 82, "oilBalance": 100
            }
        },
        "skinProfile": {
            "allergies": ["Salicylic Acid"]
        }
    },
    {
        "userId": "user456",
        "skinAnalysis": {
            "detectedIssues": [
                { "issue": "Wrinkles", "present": True, "confidence": 0.9, "severity": "high" },
                { "issue": "Pigmentation", "present": True, "confidence": 0.8, "severity": "medium" }
            ],
            "poresDetected": [],
            "skinType": "dry",
            "skinScore": 75,
            "subscores": {
                "acne": 100, "pigmentation": 60, "darkCircles": 100, "wrinkles": 50, "texture": 80, "oilBalance": 70
            }
        },
        "skinProfile": {
            "allergies": ["Vitamin C"]
        }
    },
    {
        "userId": "user789",
        "skinAnalysis": {
            "detectedIssues": [
                { "issue": "Blackheads", "present": True, "confidence": 0.85, "severity": "medium" }
            ],
            "poresDetected": [],
            "skinType": "combination",
            "skinScore": 88,
            "subscores": {
                "acne": 95, "pigmentation": 90, "darkCircles": 90, "wrinkles": 100, "texture": 80, "oilBalance": 80
            }
        },
        "skinProfile": {
            "allergies": []
        }
    },
    {
        "userId": "user999",
        "skinAnalysis": {
            "detectedIssues": [],
            "poresDetected": [],
            "skinType": "neutral",
            "skinScore": 95,
            "subscores": {
                "acne": 100, "pigmentation": 100, "darkCircles": 100, "wrinkles": 100, "texture": 90, "oilBalance": 95
            }
        },
        "skinProfile": {
            "allergies": []
        }
    }
]

async def run_mocks():
    for i, req_dict in enumerate(mock_requests):
        print(f"--- Running Mock {i+1} for user {req_dict['userId']} ---")
        req = RecommendRequest(**req_dict)
        try:
            res = await recommend(req)
            print("Routine:", json.dumps(res["routine"], indent=2))
            print("Explanation:", res["explanation"])
            print("Insights:", res["insights"])
            print("Disclaimer:", res["disclaimer"])
        except Exception as e:
            print(f"Error: {e}")
        print("\n")

if __name__ == "__main__":
    import asyncio
    # Make sure to set GEMINI_API_KEY in your environment before running this script
    asyncio.run(run_mocks())
