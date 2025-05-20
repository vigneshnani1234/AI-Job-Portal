# flask_server/pages/fetch_data.py
import requests
import json
import os
# from dotenv import load_dotenv # No need to load .env here, config.py does it

# ADZUNA_APP_ID and ADZUNA_APP_KEY will be accessed from app.config now

def fetch_adzuna_jobs(app_id, app_key, logger, country_code="in", page=1, keywords="python", location="india"):
    if not app_id or not app_key:
        logger.error("Error: ADZUNA_APP_ID and ADZUNA_APP_KEY must be provided.")
        return [], 0

    BASE_URL = "http://api.adzuna.com/v1/api/jobs"
    url = f"{BASE_URL}/{country_code}/search/{page}"

    search_params = {
        "app_id": app_id,
        "app_key": app_key,
        "results_per_page": 20,
        "what": keywords,
        "where": location,
        "sort_by": "date",
        "content-type": "application/json"
    }
    logger.info(f"Fetching Adzuna jobs from: {url} with params: {search_params}")
    try:
        response = requests.get(url, params=search_params)
        response.raise_for_status()
        data = response.json()
        return data.get("results", []), data.get("count", 0)
    except requests.exceptions.RequestException as e:
        logger.error(f"Error fetching jobs from Adzuna: {e}")
        return [], 0
    except json.JSONDecodeError:
        logger.error(f"Error decoding JSON from Adzuna.")
        return [], 0