# flask_server/__init__.py
import os
import logging
from flask import Flask, jsonify,request
from flask_cors import CORS

# Use relative imports because these files are part of the 'flask_server' package
from .config import Config
from .user.services import init_app as init_user_login_services
from .auth.services import init_app as init_auth_oauth_services
from .auth import auth_bp
from .course_recommender import course_bp
from .features.jobs_routes import jobs_bp
from .features.resume_tools_routes import resume_tools_bp
from .features.ai_practice_routes import ai_practice_bp
from .pages.load_model import load_bert_model

# This is the application factory
def create_app(config_class=Config):
    app = Flask("flask_server")
    app.config.from_object(config_class)

    # Configure logging
    log_level = logging.DEBUG if app.debug or os.getenv('FLASK_ENV') == 'development' else logging.INFO
    if not app.logger.handlers:
        stream_handler = logging.StreamHandler()
        formatter = logging.Formatter('%(asctime)s %(levelname)s %(name)s %(module)s [%(funcName)s]: %(message)s') # Added funcName
        stream_handler.setFormatter(formatter)
        app.logger.addHandler(stream_handler)
    app.logger.setLevel(log_level)
    
    config_class.validate_config(app.logger)

    # --- CORS Configuration ---
    frontend_url_from_config = app.config.get('FRONTEND_URL')
    app.logger.info(f"CORS: FRONTEND_URL from app.config is: '{frontend_url_from_config}'")

    if frontend_url_from_config and frontend_url_from_config != 'http://localhost:5173' and frontend_url_from_config != "*":
        # For production, be specific. The value from Render env var should be used.
        cors_origins = frontend_url_from_config
        app.logger.info(f"CORS: Using specific origin: {cors_origins}")
    elif frontend_url_from_config == 'http://localhost:5173':
        # Explicitly allow localhost for local dev if that's the default from config.py
        cors_origins = 'http://localhost:5173'
        app.logger.info(f"CORS: Allowing specific localhost origin for development: {cors_origins}")
    else:
        # Fallback to "*" if FRONTEND_URL is not set or is explicitly "*"
        # This is less secure and should ideally not be hit in production if FRONTEND_URL is set.
        cors_origins = "*"
        app.logger.warning(f"CORS: FRONTEND_URL not specifically set or is '*', falling back to allowing all origins ('*'). This is not recommended for production.")

    CORS(app, 
         origins=cors_origins, 
         supports_credentials=True,
         methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"], # Be explicit
         allow_headers=["Content-Type", "Authorization", "X-Requested-With", "X-CSRF-Token"], # Add common headers
         expose_headers=["Content-Type", "Link"] # Add if your app uses these in responses
    )
    app.logger.info(f"Flask-CORS initialized with origins: '{cors_origins}', supports_credentials=True")
    # --- End CORS Configuration ---

    init_user_login_services(app)
    init_auth_oauth_services(app)

    # sbert_model, sbert_loaded = load_bert_model(app.logger) # Assuming load_model is correct
    # app.config['SBERT_MODEL'] = sbert_model
    # app.config['SBERT_MODEL_LOADED'] = sbert_loaded
    # app.logger.info(f"SBERT Model Loaded: {sbert_loaded}")
    
    try:
        from .course_recommender.service import get_model_status as get_course_recommender_status
        cr_status = get_course_recommender_status()
        app.logger.info(f"Course Recommender TF-IDF Model Status: {cr_status['status']} - {cr_status['message']}")
        if cr_status['status'] == "DOWN":
             app.logger.error("CRITICAL: Course Recommender TF-IDF Model failed to load.")
    except ImportError:
        app.logger.error("Could not import course_recommender.service in __init__ to check status.")
    except Exception as e:
        app.logger.error(f"Error checking course recommender status on startup in __init__: {e}", exc_info=True)

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
            # Re-import locally in case of module loading order issues during startup logging
            from .course_recommender.service import get_model_status as get_cr_status_dynamic 
            course_status_msg = get_cr_status_dynamic().get("status", "Unknown")
        except Exception:
            pass # Avoid crashing welcome route if recommender service has issues
        return jsonify({
            "message": "API Welcome from __init__ create_app v2",
            "sbert_model_status": sbert_status,
            "course_recommender_status": course_status_msg,
            "configured_frontend_url_for_cors": app.config.get('FRONTEND_URL') # Expose for debugging
        })

    app.logger.info("Flask application created via __init__.create_app")
    return app