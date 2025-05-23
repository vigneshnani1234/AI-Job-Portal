# flask_server/__init__.py
import os
import logging
from flask import Flask, jsonify, request # Ensure 'request' is imported for root_api_welcome
from flask_cors import CORS

from .config import Config
from .user.services import init_app as init_user_login_services
from .auth.services import init_app as init_auth_oauth_services
from .auth import auth_bp
from .course_recommender import course_bp
from .features.jobs_routes import jobs_bp
from .features.resume_tools_routes import resume_tools_bp
from .features.ai_practice_routes import ai_practice_bp
from .pages.load_model import load_bert_model # Assuming this only loads SBERT

def create_app(config_class=Config):
    app = Flask("flask_server")
    app.config.from_object(config_class)

    log_level = logging.DEBUG if app.debug or os.getenv('FLASK_ENV') == 'development' else logging.INFO
    if not app.logger.handlers:
        stream_handler = logging.StreamHandler()
        formatter = logging.Formatter('%(asctime)s %(levelname)s %(name)s %(module)s [%(funcName)s]: %(message)s')
        stream_handler.setFormatter(formatter)
        app.logger.addHandler(stream_handler)
    app.logger.setLevel(log_level)
    
    config_class.validate_config(app.logger)

    # --- CORS Configuration ---
    frontend_url_from_config = app.config.get('FRONTEND_URL')
    app.logger.info(f"CORS: Raw FRONTEND_URL from app.config is: '{frontend_url_from_config}'")

    cors_origins_to_use = []
    if frontend_url_from_config:
        # Ensure it's a list, Flask-CORS can take a string or a list of strings/regex
        # If it's "*", pass "*"
        if frontend_url_from_config == "*":
            cors_origins_to_use = "*"
            app.logger.warning("CORS: FRONTEND_URL is '*', allowing all origins. Not recommended for production unless intended.")
        else:
            # Assume it's a specific URL (or comma-separated list, though you use a single one)
            cors_origins_to_use = frontend_url_from_config # Flask-CORS handles a single string origin
            app.logger.info(f"CORS: Using specific origin(s): {cors_origins_to_use}")
    else:
        # Fallback if FRONTEND_URL is not set at all (should not happen if config default is present)
        cors_origins_to_use = "http://localhost:5173" # Or some very restrictive default
        app.logger.warning(f"CORS: FRONTEND_URL not set in app.config, defaulting to '{cors_origins_to_use}'.")

    CORS(app, 
         origins=cors_origins_to_use,  # *** USE THE DETERMINED VARIABLE HERE ***
         supports_credentials=True,
         methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"], 
         allow_headers=["Content-Type", "Authorization", "X-Requested-With", "X-CSRF-Token"], 
         expose_headers=["Content-Type", "Link"]
    )
    app.logger.info(f"Flask-CORS initialized. Effective origins: '{cors_origins_to_use}', supports_credentials=True")
    # --- End CORS Configuration ---

    init_user_login_services(app)
    init_auth_oauth_services(app)

    # SBERT Model Loading (keep disabled if it caused OOM, or manage memory)
    # sbert_model, sbert_loaded = load_bert_model(app.logger)
    # app.config['SBERT_MODEL'] = sbert_model
    # app.config['SBERT_MODEL_LOADED'] = sbert_loaded
    # if not sbert_loaded:
    #     app.logger.warning("SBERT model failed to load or was disabled. Related features affected.")
    # else:
    #     app.logger.info(f"SBERT Model Loaded: {sbert_loaded}")
    
    try:
        from .course_recommender.service import get_model_status as get_course_recommender_status
        cr_status = get_course_recommender_status()
        app.logger.info(f"Course Recommender TF-IDF Model Status: {cr_status['status']} - {cr_status['message']}")
        if cr_status['status'] == "DOWN":
             app.logger.error("CRITICAL: Course Recommender TF-IDF Model failed to load.")
    except ImportError:
        app.logger.error("Could not import course_recommender.service to check status.")
    except Exception as e:
        app.logger.error(f"Error checking course recommender status: {e}", exc_info=True)

    app.register_blueprint(auth_bp)
    app.register_blueprint(course_bp)
    app.register_blueprint(jobs_bp)
    app.register_blueprint(resume_tools_bp)
    app.register_blueprint(ai_practice_bp)
    app.logger.info("All blueprints registered.")

    @app.route('/')
    def root_api_welcome():
        app.logger.debug(f"Root route / accessed by {request.remote_addr}")
        sbert_status = "Loaded" if app.config.get('SBERT_MODEL_LOADED') else "Not Loaded"
        course_status_msg = "Unknown"
        try:
            from .course_recommender.service import get_model_status as get_cr_status_dynamic 
            course_status_msg = get_cr_status_dynamic().get("status", "Unknown")
        except Exception:
            pass
        return jsonify({
            "message": "API Welcome (v2.1 - CORS fix attempt)", # Updated message for quick check
            "sbert_model_status": sbert_status,
            "course_recommender_status": course_status_msg,
            "configured_frontend_url_for_cors": app.config.get('FRONTEND_URL')
        })

    app.logger.info("Flask application created successfully.")
    return app