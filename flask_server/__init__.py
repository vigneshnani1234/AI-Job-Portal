# flask_server/__init__.py
import os
import logging
from flask import Flask, jsonify
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
    # app = Flask(__name__) # __name__ here will be 'flask_server' or 'flask_server.__init__'
    app = Flask("flask_server") # Explicitly name it for clarity, or use __name__ from the calling module if preferred
    app.config.from_object(config_class)

    # ... (rest of your create_app logic from the previous good example) ...
    # Ensure all imports within create_app that refer to other modules in flask_server
    # use relative imports like `from .user.models import User` if they were defined there.
    # Example:
    log_level = logging.DEBUG if app.debug or os.getenv('FLASK_ENV') == 'development' else logging.INFO
    if not app.logger.handlers:
        stream_handler = logging.StreamHandler()
        formatter = logging.Formatter('%(asctime)s %(levelname)s %(name)s %(module)s: %(message)s')
        stream_handler.setFormatter(formatter)
        app.logger.addHandler(stream_handler)
    app.logger.setLevel(log_level)
    
    config_class.validate_config(app.logger)
    CORS(app, supports_credentials=True, origins=app.config.get('FRONTEND_URL', "*"))
    init_user_login_services(app)
    init_auth_oauth_services(app)

    sbert_model, sbert_loaded = load_bert_model(app.logger)
    app.config['SBERT_MODEL'] = sbert_model
    app.config['SBERT_MODEL_LOADED'] = sbert_loaded
    app.logger.info(f"SBERT Model Loaded: {sbert_loaded}")
    
    try:
        from .course_recommender.service import get_model_status as get_course_recommender_status # Relative import
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

    @app.route('/') # This route defined in create_app will be part of the app
    def root_api_welcome():
        # ... (same as before) ...
        return jsonify({"message": "API Welcome from __init__ create_app"})

    app.logger.info("Flask application created via __init__.create_app")
    return app