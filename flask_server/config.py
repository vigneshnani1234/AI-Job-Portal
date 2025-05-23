# # flask_server/config.py
# import os
# from dotenv import load_dotenv

# # Load environment variables from .env file in the flask_server directory
# BASE_DIR = os.path.abspath(os.path.dirname(__file__))
# load_dotenv(os.path.join(BASE_DIR, '.env')) # Correct path to .env

# class Config:
#     SECRET_KEY = os.getenv('FLASK_APP_SECRET_KEY')
#     GOOGLE_CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID')
#     GOOGLE_CLIENT_SECRET = os.getenv('GOOGLE_CLIENT_SECRET')
#     FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:5173') # Default for Vite React

#     # Adzuna API Keys
#     ADZUNA_APP_ID = os.getenv('ADZUNA_APP_ID')
#     ADZUNA_APP_KEY = os.getenv('ADZUNA_APP_KEY')

#     # Add other configurations if needed

#     @staticmethod
#     def validate_config(app_logger):
#         if not Config.SECRET_KEY:
#             app_logger.critical("CRITICAL: No SECRET_KEY set for Flask application.")
#             raise ValueError("No SECRET_KEY set for Flask application.")
#         if not Config.GOOGLE_CLIENT_ID or not Config.GOOGLE_CLIENT_SECRET:
#             app_logger.warning("Google OAuth credentials not fully configured. Authentication may fail.")
#         if not Config.ADZUNA_APP_ID or not Config.ADZUNA_APP_KEY:
#             app_logger.warning("Adzuna API credentials not configured. Job fetching will fail.")





# flask_server/config.py
import os
from dotenv import load_dotenv

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
load_dotenv(os.path.join(BASE_DIR, '.env'))

class Config:
    SECRET_KEY = os.getenv('FLASK_APP_SECRET_KEY')
    GOOGLE_CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID')
    GOOGLE_CLIENT_SECRET = os.getenv('GOOGLE_CLIENT_SECRET')
    FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:5173')
    ADZUNA_APP_ID = os.getenv('ADZUNA_APP_ID')
    ADZUNA_APP_KEY = os.getenv('ADZUNA_APP_KEY')

    # --- Database Configuration ---
    # Render provides DATABASE_URL automatically when a DB is linked.
    # For local development, you might set a local PostgreSQL URL in your .env
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL', 'sqlite:///local_dev.db') # Fallback to SQLite for local dev if DATABASE_URL not set
    SQLALCHEMY_TRACK_MODIFICATIONS = False # Recommended to disable
    # --- End Database Configuration ---

    @staticmethod
    def validate_config(app_logger):
        if not Config.SECRET_KEY:
            app_logger.critical("CRITICAL: No SECRET_KEY set for Flask application.")
            raise ValueError("No SECRET_KEY set for Flask application.")
        # ... other validations ...
        if not Config.SQLALCHEMY_DATABASE_URI:
            app_logger.warning("SQLALCHEMY_DATABASE_URI is not set. Database functionality may fail.")
        elif Config.SQLALCHEMY_DATABASE_URI == 'sqlite:///local_dev.db':
            app_logger.info("Using local SQLite database for development.")