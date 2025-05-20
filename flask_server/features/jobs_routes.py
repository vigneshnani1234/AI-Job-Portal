# flask_server/features/jobs_routes.py
from flask import Blueprint, request, jsonify, current_app
from ..pages.fetch_data import fetch_adzuna_jobs # Assuming fetch_data remains in 'pages'

jobs_bp = Blueprint('jobs', __name__, url_prefix='/api')

@jobs_bp.route('/fetch_jobs', methods=['GET'])
def fetch_jobs_route_handler():
    try:
        keywords = request.args.get('keywords', "software engineer")
        location = request.args.get('location', "usa")
        page = request.args.get('page', 1, type=int)
        country = request.args.get('country', 'us') # Default to US if not specified

        app_id = current_app.config.get('ADZUNA_APP_ID')
        app_key = current_app.config.get('ADZUNA_APP_KEY')

        current_app.logger.info(f"Fetching Adzuna jobs: kw='{keywords}', loc='{location}', page={page}, country={country}")
        jobs_data, total = fetch_adzuna_jobs(
            app_id, app_key, current_app.logger,
            country_code=country, page=page, keywords=keywords, location=location
        )
        return jsonify({"total_results": total, "jobs": jobs_data})
    except Exception as e:
        current_app.logger.error(f"Error in /fetch_jobs: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500