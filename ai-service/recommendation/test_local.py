import asyncio
import os
import sys

# Ensure google-genai is available if installed
try:
    from main import recommend, RecommendRequest
    from test_mocks import mock_requests
except ImportError:
    print("Please install requirements first: pip install -r requirements.txt")
    sys.exit(1)

async def run_tests():
    print(f"Running {len(mock_requests)} mock tests...\n")
    for i, req in enumerate(mock_requests):
        print(f"--- Testing Mock {i+1}: User {req['userId']} ---")
        request = RecommendRequest(**req)
        try:
            response = await recommend(request)
            print("Routine:", response["routine"])
            print("Explanation:", response["explanation"])
            print("Insights:", response["insights"])
        except Exception as e:
            print(f"Error: {e}")
        print("\n")

if __name__ == "__main__":
    asyncio.run(run_tests())
