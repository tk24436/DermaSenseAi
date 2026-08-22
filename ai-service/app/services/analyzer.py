from abc import ABC, abstractmethod
import os
import requests
from app.schemas import SkinAnalysisResponse, DetectedIssue, PoreDetected

class BaseAnalyzer(ABC):
    @abstractmethod
    def analyze(self, image_bytes: bytes) -> SkinAnalysisResponse:
        pass

class FacePPAnalyzer(BaseAnalyzer):
    def analyze(self, image_bytes: bytes) -> SkinAnalysisResponse:
        api_key = os.getenv("FACEPP_API_KEY")
        api_secret = os.getenv("FACEPP_API_SECRET")
        base_url = os.getenv("FACEPP_BASE_URL", "https://api-us.faceplusplus.com/facepp/v1/skinanalyze")
        
        if not api_key or not api_secret:
            raise ValueError("Face++ API credentials not set.")
            
        data = {
            "api_key": api_key,
            "api_secret": api_secret,
        }
        files = {"image_file": image_bytes}
        
        response = requests.post(base_url, data=data, files=files, timeout=30)
        
        if response.status_code != 200:
            raise RuntimeError(f"Face++ API returned error: {response.text}")
            
        result = response.json()
        
        # Transform logic
        detected_issues = []
        subscores = {}
        skin_score = 100
        
        # Helper to process issues
        def add_issue(issue_name, data_key, score_key, penalty_weight):
            nonlocal skin_score
            if data_key in result:
                item_data = result[data_key]
                # Face++ format often has value/confidence or similar, adjusting based on typical shape
                # This is a robust fallback if it's just a number
                confidence = float(item_data.get('confidence', 0.8) if isinstance(item_data, dict) else 0.8)
                present = confidence > 0.5
                severity = "high" if confidence > 0.8 else ("medium" if confidence > 0.5 else "none")
                
                detected_issues.append(DetectedIssue(
                    issue=issue_name, present=present, confidence=confidence, severity=severity
                ))
                subscore = int(100 - (confidence * 100) * penalty_weight) if present else 100
                subscores[score_key] = max(0, subscore)
                if present:
                    skin_score -= (confidence * 100) * penalty_weight * 0.2 # 20% weight overall per issue roughly
        
        add_issue("Acne", "acne", "acne", 1.0)
        add_issue("Stain/Pigmentation", "stain", "pigmentation", 0.8)
        add_issue("Dark Circles", "dark_circle", "darkCircles", 0.6)
        add_issue("Wrinkles", "wrinkle", "wrinkles", 0.7)
        
        # Pores mock or map if facepp supports it
        pores = [
            PoreDetected(region="Left Cheek", present=False, confidence=0.0, severity="none"),
            PoreDetected(region="Right Cheek", present=False, confidence=0.0, severity="none")
        ]
        
        skin_type = result.get('skin_type', {}).get('skin_type', 0)
        skin_type_str = "combination"
        if skin_type == 1: skin_type_str = "dry"
        elif skin_type == 2: skin_type_str = "oily"
        elif skin_type == 3: skin_type_str = "neutral"
        
        # Ensure subscores has defaults
        for k in ["acne", "pigmentation", "darkCircles", "wrinkles", "texture", "oilBalance"]:
            if k not in subscores:
                subscores[k] = 100
                
        # Final formatting
        return SkinAnalysisResponse(
            detectedIssues=detected_issues,
            poresDetected=pores,
            skinType=skin_type_str,
            skinScore=max(0, min(100, int(skin_score))),
            subscores=subscores
        )

class ONNXAnalyzer(BaseAnalyzer):
    def analyze(self, image_bytes: bytes) -> SkinAnalysisResponse:
        # Placeholder for actual ONNX runtime logic (Glowlytics models)
        # We will mock the output to match the shape for now
        
        return SkinAnalysisResponse(
            detectedIssues=[
                DetectedIssue(issue="Acne", present=True, confidence=0.87, severity="high"),
                DetectedIssue(issue="Dark Circles", present=False, confidence=0.12, severity="none")
            ],
            poresDetected=[
                PoreDetected(region="Left Cheek", present=True, confidence=0.88, severity="high")
            ],
            skinType="oily",
            skinScore=82,
            subscores={
                "acne": 90, "pigmentation": 80,
                "darkCircles": 100, "wrinkles": 100,
                "texture": 82, "oilBalance": 100
            }
        )

def get_analyzer() -> BaseAnalyzer:
    strategy = os.getenv("ACTIVE_ANALYZER", "facepp").lower()
    if strategy == "onnx":
        return ONNXAnalyzer()
    return FacePPAnalyzer()
