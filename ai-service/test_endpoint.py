import requests
import json

url = "http://127.0.0.1:8000/api/ai/analyze"
image_path = "C:/Users/TARUN/Desktop/3rd Year/5TH SEM/BEE/TEAMPROJ/TESTSCRIPTS/test.jpg"

print(f"Sending test image to {url}...")
try:
    with open(image_path, "rb") as f:
        response = requests.post(
            url, 
            files={"file": ("test.jpg", f, "image/jpeg")},
            timeout=10
        )
    print(f"Status Code: {response.status_code}")
    print(json.dumps(response.json(), indent=2))
except requests.exceptions.ConnectionError:
    print(f"Error: Could not connect to {url}. Is the FastAPI server running?")
except Exception as e:
    print(f"Error: {e}")
