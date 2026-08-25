def generate_routine(skin_analysis: dict) -> dict:
    skin_type = skin_analysis.get("skinType", "neutral")
    issues = skin_analysis.get("detectedIssues", [])
    
    routine = {
        "morning": [],
        "night": [],
        "weekly": []
    }
    
    # Base Routine based on Skin Type
    if skin_type == "oily":
        routine["morning"].append({"step": "Cleanser", "product": "Foaming Gel Cleanser"})
        routine["morning"].append({"step": "Moisturizer", "product": "Lightweight Oil-Free Gel"})
        routine["night"].append({"step": "Cleanser", "product": "Foaming Gel Cleanser"})
        routine["night"].append({"step": "Moisturizer", "product": "Lightweight Oil-Free Gel"})
    elif skin_type == "dry":
        routine["morning"].append({"step": "Cleanser", "product": "Hydrating Milky Cleanser"})
        routine["morning"].append({"step": "Moisturizer", "product": "Rich Ceramide Cream"})
        routine["night"].append({"step": "Cleanser", "product": "Hydrating Milky Cleanser"})
        routine["night"].append({"step": "Moisturizer", "product": "Rich Ceramide Cream"})
    else:
        routine["morning"].append({"step": "Cleanser", "product": "Gentle Cleanser"})
        routine["morning"].append({"step": "Moisturizer", "product": "Daily Lotion"})
        routine["night"].append({"step": "Cleanser", "product": "Gentle Cleanser"})
        routine["night"].append({"step": "Moisturizer", "product": "Daily Lotion"})
        
    routine["morning"].append({"step": "Sunscreen", "product": "SPF 30+ Broad Spectrum"})
    
    # Target specific issues
    for issue_obj in issues:
        if issue_obj.get("present") and issue_obj.get("confidence", 0) > 0.5:
            issue_name = issue_obj.get("issue", "").lower()
            if issue_name == "acne":
                routine["night"].append({"step": "Treatment", "product": "2% Salicylic Acid or Benzoyl Peroxide"})
            elif issue_name == "dark circles":
                routine["morning"].append({"step": "Eye Care", "product": "Caffeine Eye Cream"})
            elif issue_name == "pigmentation":
                routine["morning"].append({"step": "Treatment", "product": "Vitamin C Serum"})
            elif issue_name == "wrinkles":
                routine["night"].append({"step": "Treatment", "product": "Retinol Serum"})
            elif issue_name == "blackheads":
                routine["weekly"].append({"step": "Exfoliation", "product": "BHA Liquid Exfoliant"})

    return routine
