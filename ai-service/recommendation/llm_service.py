import os
import json
from google import genai
from .prompts import RECOMMENDATION_PROMPT

def generate_explanation_and_insights(skin_analysis: dict, skin_profile: dict, routine: dict) -> dict:
    prompt = RECOMMENDATION_PROMPT.format(
        skin_analysis=json.dumps(skin_analysis, indent=2),
        skin_profile=json.dumps(skin_profile, indent=2),
        routine=json.dumps(routine, indent=2)
    )
    
    client = genai.Client()
    
    response = client.models.generate_content(
        model='gemini-2.5-flash',
        contents=prompt,
        config={
            "response_mime_type": "application/json"
        }
    )
    
    try:
        data = json.loads(response.text)
        return data
    except Exception as e:
        return {
            "explanation": "We generated a routine based on your skin type and specific concerns. *Disclaimer: This is not medical advice. Please consult a dermatologist for medical concerns.*",
            "insights": ["Always patch test new products.", "Consistency is key for skincare routines."]
        }
