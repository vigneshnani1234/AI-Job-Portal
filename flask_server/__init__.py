# flask_server/__init__.py
import os
import logging
from flask import Flask, jsonify, request # Ensure 'request' is imported
from flask_cors import CORS

# Use relative imports because these files are part of the 'flask_server' package
from .config import Config
from .user.services import init_app as init_user_login_services # From user/services.py
from .user.models import db as user_db                       # From user/models.py (SQLAlchemy instance)
from .auth.services import init_app as init_auth_oauth_services # From auth/services.py
from .auth import auth_bp                                     # From auth/__init__.py
from .course_recommender import course_bp                     # From course_recommender/__init__.py
from .features.jobs_routes import jobs_bp                     # From features/jobs_routes.py
from .features.resume_tools_routes import resume_tools_bp     # From features/resume_tools_routes.py
from .features.ai_practice_routes import ai_practice_bp       # From features/ai_practice_routes.py
from .pages.load_model import load_bert_model                 # From pages/load_model.py

# This is the application factory
def create_app(config_class=Config):
    app = Flask("flask_server") # Or app = Flask(__name__)
    app.config.from_object(config_class)

    # Configure logging
    log_level = logging.DEBUG if app.debug or os.getenv('FLASK_ENV') == 'development' else logging.INFO
    if not app.logger.handlers: # Avoid adding duplicate handlers if create_app is called multiple times
        stream_handler = logging.StreamHandler()
        # More detailed formatter for better debugging
        formatter = logging.Formatter('%(asctime)s %(levelname)s %(name)s [%(module)s.%(funcName)s l:%(lineno)d]: %(message)s')
        stream_handler.setFormatter(formatter)
        app.logger.addHandler(stream_handler)
    app.logger.setLevel(log_level)
    
    config_class.validate_config(app.logger) # Validate essential configurations

    # --- CORS Configuration ---
    frontend_url_from_config = app.config.get('FRONTEND_URL')
    app.logger.info(f"CORS: Raw FRONTEND_URL from app.config is: '{frontend_url_from_config}'")

    cors_origins_to_use = []
    if frontend_url_from_config:
        if frontend_url_from_config == "*":
            cors_origins_to_use = "*"
            app.logger.warning("CORS: FRONTEND_URL is '*', allowing all origins. Not recommended for production unless fully intended.")
        else:
            # Handles a single URL or a comma-separated list of URLs
            cors_origins_to_use = [origin.strip() for origin in frontend_url_from_config.split(',')]
            app.logger.info(f"CORS: Using specific origin(s): {cors_origins_to_use}")
    else:
        # This should ideally not be reached if Config.py has a default for FRONTEND_URL
        app.logger.error("CORS: FRONTEND_URL was unexpectedly None or empty after config load. Review config.py and env vars. Defaulting to no CORS origin.")
        # Flask-CORS with an empty list might be very restrictive.
        # A better fallback might be your known local development URL if this state is possible.
        # For now, relying on Config.py to provide a default.
        cors_origins_to_use = app.config.get('FRONTEND_URL_DEFAULT_FOR_CORS_IF_UNSET', []) # Example if you add this to Config

    CORS(app, 
         origins=cors_origins_to_use,
         supports_credentials=True,
         methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"], 
         allow_headers=["Content-Type", "Authorization", "X-Requested-With", "X-CSRF-Token", "ngrok-skip-browser-warning"], # Added ngrok header for local dev if needed
         expose_headers=["Content-Type", "Link"]
    )
    app.logger.info(f"Flask-CORS initialized. Effective origins: '{cors_origins_to_use}', supports_credentials=True")
    # --- End CORS Configuration ---

    # --- Initialize Database (SQLAlchemy) ---
    user_db.init_app(app) # Initialize SQLAlchemy with the Flask app instance
    # Create database tables if they don't exist. This needs an application context.
    with app.app_context():
        try:
            user_db.create_all() # Creates tables defined in user.models.py (and other models if any)
            app.logger.info("Database tables checked/created (if necessary via SQLAlchemy user_db.create_all()).")
        except Exception as e:
            app.logger.error(f"Error creating/checking database tables: {e}", exc_info=True)
    # --- End Initialize Database ---

    # Initialize Flask-Login (uses the User model which now uses SQLAlchemy)
    init_user_login_services(app)
    
    # Initialize Authlib OAuth clients
    init_auth_oauth_services(app)

    # SBERT Model Loading
    # sbert_model, sbert_loaded = load_bert_model(app.logger)
    # app.config['SBERT_MODEL'] = sbert_model
    # app.config['SBERT_MODEL_LOADED'] = sbert_loaded
    # if not sbert_loaded:
    #     app.logger.warning("SBERT model failed to load or was disabled. Related features will be affected.")
    # else:
    #     app.logger.info(f"SBERT Model Loaded and attached to app.config: {sbert_loaded}")
    
    # Course Recommender TF-IDF Model Status Check (loaded in its own service module)
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

    # Register Blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(course_bp)
    app.register_blueprint(jobs_bp)
    app.register_blueprint(resume_tools_bp)
    app.register_blueprint(ai_practice_bp)
    app.logger.info("All application blueprints registered.")

    # Root Route
    @app.route('/')
    def root_api_welcome():
        app.logger.debug(f"Root route / accessed by {request.remote_addr}") # 'request' is now imported
        sbert_status = "Loaded" if app.config.get('SBERT_MODEL_LOADED') else "Not Loaded"
        course_status_msg = "Unknown"
        try:
            # Re-import locally or ensure it's loaded if check is frequent
            from .course_recommender.service import get_model_status as get_cr_status_dynamic 
            course_status_msg = get_cr_status_dynamic().get("status", "Unknown")
        except Exception:
            pass # Avoid crashing welcome route if recommender service has issues
        
        return jsonify({
            "message": "API Welcome (v2.3 - PostgreSQL User Store Active)", # Updated message for clarity
            "sbert_model_status": sbert_status,
            "course_recommender_status": course_status_msg,
            "configured_frontend_url_for_cors": app.config.get('FRONTEND_URL')
        })

    app.logger.info("Flask application '%s' (with SQLAlchemy) created successfully and ready.", app.name)
    return app