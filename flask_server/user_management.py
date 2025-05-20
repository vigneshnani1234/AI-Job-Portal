# flask_server/user_management.py
from flask_login import LoginManager, UserMixin

# In-memory user store for simplicity (Replace with a database in production)
users_db = {} # This will be reset every time the server restarts.

class User(UserMixin):
    def __init__(self, id, name=None, email=None, profile_pic=None):
        self.id = id
        self.name = name
        self.email = email
        self.profile_pic = profile_pic

    @staticmethod
    def get(user_id):
        return users_db.get(user_id)

    @staticmethod
    def create_or_update(id, name=None, email=None, profile_pic=None):
        user = User(id, name, email, profile_pic)
        users_db[id] = user
        return user

    # You can add more methods here if needed, e.g., to_dict for serialization

login_manager = LoginManager()

@login_manager.user_loader
def load_user(user_id):
    return User.get(user_id)

def init_login_manager(app):
    """Initializes Flask-Login manager for the given app."""
    login_manager.init_app(app)
    # You can set login_view here if you have a dedicated login page route
    # login_manager.login_view = 'auth.login_page_route_name' # if auth is a blueprint