import os
import json
from google import genai
try:
    from .prompts import RECOMMENDATION_PROMPT
except ImportError:
    from prompts import RECOMMENDATION_PROMPT

def generate_explanation_and_insights(skin_analysis: dict, skin_profile: dict, routine: dict) -> dict:
    prompt = RECOMMENDATION_PROMPT.format(
        skin_analysis=json.dumps(skin_analysis, indent=2),
        skin_profile=json.dumps(skin_profile, indent=2),
        routine=json.dumps(routine, indent=2)
    )
    
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return {
            "explanation": "We generated a tailored routine based on your skin type and specific concerns. *Disclaimer: This is not medical advice. Please consult a dermatologist for medical concerns.*",
            "insights": ["Always patch test new products.", "Consistency is key for skincare routines."]
        }
    
    try:
        client = genai.Client(api_key=api_key)
        
        # Try primary working model first, with fallbacks
        models_to_try = ['gemini-3-flash-preview', 'gemini-3.5-flash', 'gemini-3.8-flash']
        response = None
        for m in models_to_try:
            try:
                response = client.models.generate_content(
                    model=m,
                    contents=prompt,
                    config={
                        "response_mime_type": "application/json"
                    }
                )
                if response and response.text:
                    break
            except Exception as model_err:
                print(f"Gemini model {m} attempt failed: {model_err}")
                continue

        if not response or not response.text:
            raise ValueError("No response returned from any Gemini models.")

        raw_text = response.text.strip()
        # Clean any accidental markdown code fences
        if raw_text.startswith("```json"):
            raw_text = raw_text[7:]
        elif raw_text.startswith("```"):
            raw_text = raw_text[3:]
        if raw_text.endswith("```"):
            raw_text = raw_text[:-3]

        data = json.loads(raw_text.strip())
        return data
    except Exception as e:
        print(f"Gemini API request failed: {e}")
        return {
            "explanation": "We generated a routine based on your skin type and specific concerns. *Disclaimer: This is not medical advice. Please consult a dermatologist for medical concerns.*",
            "insights": ["Always patch test new products.", "Consistency is key for skincare routines."]
        }
