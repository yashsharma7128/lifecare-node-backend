import time
import random
import requests
from datetime import datetime

# CONFIGURATION
API_URL = "https://lifecare-node-backend.onrender.com/api/auth/login/"
IDENTIFIER = "ping_keeper"  # Can be username or email (doesn't need to be valid to keep server awake)
PASSWORD = "random_dummy_password"

def ping_server():
    payload = {
        "identifier": IDENTIFIER,
        "password": PASSWORD
    }
    
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{now}] Sending keep-awake request to login API...")
    
    try:
        # We send a POST request to the login endpoint
        response = requests.post(API_URL, json=payload, timeout=15)
        # Even a 401 Unauthorized or 200 OK means the server is awake and processed the request
        print(f"[{now}] Server responded with status code: {response.status_code}")
    except requests.exceptions.RequestException as e:
        print(f"[{now}] Error connecting to server: {e}")

def main():
    print("Starting LifeCare Keep-Awake script...")
    print(f"Target URL: {API_URL}")
    print("Press Ctrl+C to stop.\n")
    
    # Ping immediately on startup
    ping_server()
    
    while True:
        # Generate a random interval between 5 and 10 minutes (300 to 600 seconds)
        interval = random.randint(300, 600)
        minutes = interval / 60
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{now}] Waiting for {minutes:.2f} minutes before next request...")
        
        time.sleep(interval)
        ping_server()

if __name__ == "__main__":
    main()
