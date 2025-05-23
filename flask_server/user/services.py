# # flask_server/user/services.py
# from flask_login import LoginManager
# from .models import User

# login_manager = LoginManager()

# # @login_manager.user_loader
# # def load_user(user_id):
# #     return User.get(user_id)

# @login_manager.user_loader
# def load_user(user_id):
#     current_app.logger.info(f"--- User Loader Invoked ---")
#     current_app.logger.info(f"Attempting to load user_id: '{user_id}'")
#     # Log the current state of _users_db for debugging this specific issue
#     from .models import _users_db # Import it here for logging
#     current_app.logger.info(f"Current _users_db keys: {list(_users_db.keys())}")
#     user = User.get(user_id) # User is defined in models.py
#     if user:
#         current_app.logger.info(f"User '{user_id}' FOUND in _users_db. User name: {user.name}")
#     else:
#         current_app.logger.warning(f"User '{user_id}' NOT FOUND in _users_db.")
#     return user

# def init_app(app):
#     """Initializes Flask-Login manager for the given app."""
#     login_manager.init_app(app)
#     # If you want unauthenticated users to be redirected to a specific login page:
#     # login_manager.login_view = 'auth.google_login' # 'auth' is blueprint name, 'google_login' is route




    # flask_server/user/services.py
from flask_login import LoginManager
from flask import current_app # For logging
from .models import User, db # Import db as well if you need to initialize it here (but usually done in __init__.py)

login_manager = LoginManager()

@login_manager.user_loader
def load_user(user_id):
    current_app.logger.info(f"--- User Loader (SQLAlchemy) ---")
    current_app.logger.info(f"load_user called with user_id: {user_id}")
    user = User.get(user_id) # This now calls User.query.get(user_id)
    if user:
        current_app.logger.info(f"User {user_id} found in database. Name: {user.name}")
    else:
        current_app.logger.warning(f"User {user_id} NOT FOUND in database.")
    return user

def init_app(app):
    """Initializes Flask-Login manager for the given app."""
    login_manager.init_app(app)
    app.logger.info("Flask-Login (for SQLAlchemy User model) initialized with app.")