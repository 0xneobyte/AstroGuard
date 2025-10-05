import requests
import json

# Test the AI summary endpoint
url = "http://localhost:5000/api/ai/summary"
data = {
    "context": {
        "asteroid": {
            "name": "Test Asteroid 2024 XY",
            "diameter_min": 100,
            "diameter_max": 200,
            "is_hazardous": True,
            "velocity": 20,
            "close_approach_date": "2024-12-15"
        }
    }
}

print("Testing AI Summary endpoint...")
print(f"URL: {url}")
print(f"Request data: {json.dumps(data, indent=2)}")
print("\nSending request...")

try:
    response = requests.post(url, json=data)
    print(f"\nStatus Code: {response.status_code}")
    
    if response.status_code == 200:
        print("\n✅ SUCCESS!")
        result = response.json()
        print(f"\nAI Summary:\n{result.get('summary', 'No summary')}")
    else:
        print(f"\n❌ ERROR!")
        print(f"Response: {response.text}")
        
except Exception as e:
    print(f"\n❌ REQUEST FAILED!")
    print(f"Error: {str(e)}")
