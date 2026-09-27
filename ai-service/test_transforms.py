"""
Unit tests for transform_facepp and transform_acne04 modules.
Ensures both paths strictly conform to the shared SkinAnalysisResponse contract.
"""

from app.schemas import SkinAnalysisResponse
from app.services.transform_acne04 import transform_acne04_response
from app.services.transform_facepp import transform_facepp_response


def test_transform_facepp():
    mock_facepp_payload = {
        "result": {
            "acne": {"value": 1, "confidence": 0.88},
            "skin_spot": {"value": 1, "confidence": 0.72},
            "mole": {"value": 0, "confidence": 0.10},
            "dark_circle": {"value": 1, "confidence": 0.65},
            "blackhead": {"value": 1, "confidence": 0.55},
            "forehead_wrinkle": {"value": 0, "confidence": 0.15},
            "crows_feet": {"value": 0, "confidence": 0.10},
            "eye_finelines": {"value": 0, "confidence": 0.05},
            "glabella_wrinkle": {"value": 0, "confidence": 0.05},
            "nasolabial_fold": {"value": 1, "confidence": 0.62},
            "pores_forehead": {"value": 1, "confidence": 0.75},
            "pores_left_cheek": {"value": 1, "confidence": 0.85},
            "pores_right_cheek": {"value": 1, "confidence": 0.80},
            "pores_jaw": {"value": 0, "confidence": 0.20},
            "skin_type": {"skin_type": 3},  # 3 = combination
        }
    }

    result = transform_facepp_response(mock_facepp_payload)
    validated = SkinAnalysisResponse(**result)

    assert validated.skinType == "combination"
    assert 0 <= validated.skinScore <= 100
    assert "acne" in validated.subscores
    assert "pigmentation" in validated.subscores
    assert "darkCircles" in validated.subscores
    assert "wrinkles" in validated.subscores
    assert "texture" in validated.subscores
    assert "oilBalance" in validated.subscores

    acne_issue = next(i for i in validated.detectedIssues if i.issue == "Acne")
    assert acne_issue.present is True
    assert acne_issue.severity in ["low", "medium", "high"]

    left_cheek = next(p for p in validated.poresDetected if p.region == "Left Cheek")
    assert left_cheek.present is True
    assert left_cheek.severity in ["low", "medium", "high"]
    print("PASS: test_transform_facepp")


def test_transform_acne04_hybrid():
    mock_acne_out = {
        "max_confidence": 0.87,
        "detections": [
            {
                "class": 2,  # severity high
                "confidence": 0.87,
                "bbox": [100, 150, 150, 200],
            }
        ],
    }
    mock_signals = {
        "structure": 75.0,
        "hydration": 62.0,
        "elasticity": 68.0,
        "texture": 72.0,
        "sunDamage": 35.0,
    }

    result = transform_acne04_response(mock_acne_out, mock_signals)
    validated = SkinAnalysisResponse(**result)

    assert 0 <= validated.skinScore <= 100
    acne_issue = next(i for i in validated.detectedIssues if i.issue == "Acne")
    assert acne_issue.present is True
    assert acne_issue.severity == "high"
    assert acne_issue.confidence == 0.87
    print("PASS: test_transform_acne04_hybrid")


def test_transform_acne04_standalone():
    mock_acne_out = {
        "max_confidence": 0.48,
        "detections": [
            {
                "class": "mild",
                "confidence": 0.48,
                "bbox": [50, 50, 80, 80],
            }
        ],
    }

    result = transform_acne04_response(mock_acne_out, signals=None)
    validated = SkinAnalysisResponse(**result)

    assert 0 <= validated.skinScore <= 100
    acne_issue = next(i for i in validated.detectedIssues if i.issue == "Acne")
    assert acne_issue.present is True
    assert acne_issue.severity == "low"

    # In standalone mode, non-evaluated fields are explicitly present=False with 0.0 confidence
    pigmentation = next(i for i in validated.detectedIssues if i.issue == "Pigmentation")
    assert pigmentation.present is False
    assert pigmentation.confidence == 0.0
    print("PASS: test_transform_acne04_standalone")


if __name__ == "__main__":
    test_transform_facepp()
    test_transform_acne04_hybrid()
    test_transform_acne04_standalone()
    print("All transform tests passed successfully!")
