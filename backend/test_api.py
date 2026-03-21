import requests
import time
import sys

BASE_URL = "http://localhost:8000"
session = requests.Session()

def test_auth():
    print("Testing Auth...")
    # Signup
    res = session.post(f"{BASE_URL}/auth/signup", json={
        "username": "api_test_user",
        "email": "api_test@example.com",
        "password": "password"
    })
    print("Signup:", res.status_code, res.text)

    # Login
    res = session.post(f"{BASE_URL}/auth/login", data={
        "username": "api_test@example.com",
        "password": "password"
    })
    print("Login:", res.status_code)
    if res.status_code == 200:
        token = res.json()["access_token"]
        session.headers.update({"Authorization": f"Bearer {token}"})
        return True
    return False

def test_history():
    print("Testing History...")
    res = session.get(f"{BASE_URL}/api/history/")
    print("History GET:", res.status_code)
    try:
        print("Metrics:", res.json().get("metrics"))
    except Exception as e:
        print("Error parsing history json:", e)

def test_pipeline_and_idempotency():
    claim_text = "The earth is definitely flat and carried by turtles."
    print(f"Testing Pipeline with claim: '{claim_text}'")
    
    # Needs to match AnalyzeClaimRequest format -> { "claim": ... }
    res = session.post(f"{BASE_URL}/api/fact-check/analyze-claim", json={"claim": claim_text})
    print("Analyze start:", res.status_code, res.text)
    
    if res.status_code != 200:
        return
        
    task_id = res.json().get("task_id")
    
    # Poll
    print("Polling status...")
    while True:
        status_res = session.get(f"{BASE_URL}/api/fact-check/analyze/{task_id}")
        data = status_res.json()
        claims = data.get("claims", [])
        if claims:
            # Analyze single claim only has one claim attached
            c_status = claims[0].get("status", "")
            print(f"Status: {c_status}")
            if c_status.startswith("Completed") or c_status.startswith("Failed"):
                print("Final output:", claims[0])
                break
        else:
            print("Status:", data.get("status"))
        time.sleep(2)
        
    print("\nTesting Idempotency: Submitting the identical claim again...")
    start_time = time.time()
    res2 = session.post(f"{BASE_URL}/api/fact-check/analyze-claim", json={"claim": claim_text})
    task_id_2 = res2.json().get("task_id")
    
    time.sleep(1) # Give it 1 sec to hit cache
    status_res2 = session.get(f"{BASE_URL}/api/fact-check/analyze/{task_id_2}")
    
    data2 = status_res2.json()
    claims2 = data2.get("claims", [])
    if claims2 and claims2[0].get("status", "").startswith("Completed"):
        print(f"Idempotency hit! Returned completed in {time.time()-start_time:.2f}s")
        print("Cached Summary:", claims2[0].get("summary"))
    else:
        print("Idempotency failed! Status is:", claims2[0].get("status") if claims2 else data2.get("status"))

if __name__ == "__main__":
    if test_auth():
        test_history()
        test_pipeline_and_idempotency()
        # Verify history updated
        test_history()
