# flask_server/course_recommender/routes.py
from flask import Blueprint, request, jsonify, current_app
from .service import get_model_status, get_predictions # Relative import

course_bp = Blueprint('course_recommender', __name__, url_prefix='/api')

@course_bp.route('/course_predict', methods=['POST'])
def predict_courses_route_handler(): # Renamed to avoid clashes if you combine files later
    model_status = get_model_status()
    if model_status["status"] == "DOWN":
        current_app.logger.error(f"Course prediction endpoint: TF-IDF Model service is down. Reason: {model_status['message']}")
        return jsonify({"error": model_status["message"]}), 503

    data = request.get_json()
    if not data: return jsonify({"error": "No input data"}), 400
    job_title = data.get('job_title', '')
    job_description = data.get('job_description', '')
    if not job_title and not job_description:
        return jsonify({"error": "Job title or description required"}), 400

    current_app.logger.info(f"Course prediction request for: '{job_title}'")
    recommendations, message = get_predictions(job_title, job_description)

    if not recommendations and "error" in message.lower():
        current_app.logger.error(f"Error from course recommender service: {message}")
        return jsonify({"error": message, "courses": []}), 500
    
    return jsonify({"courses": recommendations, "message": message}), 200

@course_bp.route('/health_recommender', methods=['GET'])
def health_check_recommender():
    status_info = get_model_status()
    return jsonify(status_info), 200 if status_info["status"] == "UP" else 503