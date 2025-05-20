# flask_server/user/services.py
from flask_login import LoginManager
from .models import User

login_manager = LoginManager()

@login_manager.user_loader
def load_user(user_id):
    return User.get(user_id)

def init_app(app):
    """Initializes Flask-Login manager for the given app."""
    login_manager.init_app(app)
    # If you want unauthenticated users to be redirected to a specific login page:
    # login_manager.login_view = 'auth.google_login' # 'auth' is blueprint name, 'google_login' is route