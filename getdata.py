import requests
import json
import os # For environment variables

# --- Configuration ---
# BEST PRACTICE: Store these in environment variables or a config file, not directly in code.
# ADZUNA_APP_ID = os.environ.get("34e7bede") # Or replace with your actual ID for testing
# ADZUNA_APP_KEY = os.environ.get("760b8aca97cbbc4774056bcb01b3cd81	") # Or replace with your actual KEY for testing

ADZUNA_APP_ID = "34e7bede" # Or replace with your actual ID for testing
ADZUNA_APP_KEY ="760b8aca97cbbc4774056bcb01b3cd81	"

if not ADZUNA_APP_ID or not ADZUNA_APP_KEY:
    print("Error: ADZUNA_APP_ID and ADZUNA_APP_KEY must be set as environment variables.")
    exit()

BASE_URL = "http://api.adzuna.com/v1/api/jobs"
COUNTRY_CODE = "in"  # Example: Great Britain. Use 'us' for USA, 'ca' for Canada, etc.
PAGE_NUMBER = 1      # Start with the first page

# --- Search Parameters ---
search_params = {
    "app_id": ADZUNA_APP_ID,
    "app_key": ADZUNA_APP_KEY,
    "results_per_page": 20,  # Request up to 50 (check Adzuna docs for max)
    "what": "python developer", # Keywords for job search
    "where": "india",         # Location
    "sort_by": "date",         # Sort by date to get latest first
    "content-type": "application/json" # Explicitly request JSON
}

def fetch_adzuna_jobs(page=1):
    """Fetches jobs from Adzuna API for a given page."""
    url = f"{BASE_URL}/{COUNTRY_CODE}/search/{page}"
    print(f"Fetching Adzuna jobs from: {url} with params: {search_params}")

    try:
        response = requests.get(url, params=search_params)
        response.raise_for_status()  # Raises an HTTPError for bad responses (4XX or 5XX)

        data = response.json()
        jobs = data.get("results", [])
        total_results = data.get("count", 0)

        print(f"Found {len(jobs)} jobs on page {page}. Total results: {total_results}")

        # Process jobs
        for job in jobs:
            print("--- JOB ---")
            print(f"Title: {job.get('title')}")
            print(f"Company: {job.get('company', {}).get('display_name')}")
            print(f"Location: {job.get('location', {}).get('display_name')}")
            print(f"Description Snippet: {job.get('description')[:150]}...") # Show first 150 chars
            print(f"Posted Date: {job.get('created')}")
            print(f"Apply URL: {job.get('redirect_url')}") # Adzuna provides a redirect URL
            print(f"Adzuna ID: {job.get('id')}")
            print("-" * 10)
        
        return jobs, total_results

    except requests.exceptions.RequestException as e:
        print(f"Error fetching jobs from Adzuna: {e}")
        return [], 0
    except json.JSONDecodeError:
        print(f"Error decoding JSON response from Adzuna. Response text: {response.text[:500]}") # Print first 500 chars of response
        return [], 0

if __name__ == "__main__":
    # Fetch the first page
    jobs_page_1, total_jobs_available = fetch_adzuna_jobs(page=PAGE_NUMBER)

    # --- Example: Basic Pagination (fetch a few more pages if needed) ---
    # You'd need more robust logic for full pagination, respecting rate limits
    # max_pages_to_fetch = (total_jobs_available // search_params['results_per_page']) + 1
    # for current_page in range(2, min(5, max_pages_to_fetch + 1)): # Fetch up to 4 more pages for example
    #     print(f"\nFetching page {current_page}...")
    #     more_jobs, _ = fetch_adzuna_jobs(page=current_page)
    #     # Add more_jobs to your collection
