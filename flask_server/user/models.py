# flask_server/user/models.py
from flask_login import UserMixin

# In-memory user store (Replace with DB in production)
_users_db = {}

class User(UserMixin):
    def __init__(self, id, name=None, email=None, profile_pic=None):
        self.id = id
        self.name = name
        self.email = email
        self.profile_pic = profile_pic

    @staticmethod
    def get(user_id):
        return _users_db.get(user_id)

    @staticmethod
    def create_or_update(id, name=None, email=None, profile_pic=None):
        user = User(id, name, email, profile_pic)
        _users_db[id] = user
        return user