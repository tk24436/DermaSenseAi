mock_requests = [
    {
        "userId": "user123",
        "skinAnalysis": {
            "detectedIssues": [
                { "issue": "Acne", "present": True, "confidence": 0.87, "severity": "high" },
                { "issue": "Dark Circles", "present": False, "confidence": 0.12, "severity": "none" }
            ],
            "skinType": "oily",
            "skinScore": 82
        },
        "skinProfile": {
            "age": 25,
            "gender": "female",
            "sensitivities": []
        }
    },
    {
        "userId": "user456",
        "skinAnalysis": {
            "detectedIssues": [
                { "issue": "Wrinkles", "present": True, "confidence": 0.9, "severity": "high" },
                { "issue": "Pigmentation", "present": True, "confidence": 0.8, "severity": "medium" }
            ],
            "skinType": "dry",
            "skinScore": 75
        },
        "skinProfile": {
            "age": 45,
            "gender": "male",
            "sensitivities": ["fragrance"]
        }
    },
    {
        "userId": "user789",
        "skinAnalysis": {
            "detectedIssues": [
                { "issue": "Blackheads", "present": True, "confidence": 0.85, "severity": "medium" }
            ],
            "skinType": "combination",
            "skinScore": 88
        },
        "skinProfile": {
            "age": 30,
            "gender": "female"
        }
    }
]
