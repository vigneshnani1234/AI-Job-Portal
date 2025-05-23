# # flask_server/user/models.py
# from flask_login import UserMixin

# # In-memory user store (Replace with DB in production)
# _users_db = {}

# class User(UserMixin):
#     def __init__(self, id, name=None, email=None, profile_pic=None):
#         self.id = id
#         self.name = name
#         self.email = email
#         self.profile_pic = profile_pic

#     @staticmethod
#     def get(user_id):
#         return _users_db.get(user_id)

#     # @staticmethod
#     # def create_or_update(id, name=None, email=None, profile_pic=None):
#     #     user = User(id, name, email, profile_pic)
#     #     _users_db[id] = user
#     #     return user
#     @staticmethod
#     def create_or_update(id, name=None, email=None, profile_pic=None):
#         user = User(id, name, email, profile_pic)
#         _users_db[id] = user
#         # Log after adding to the db
#         current_app.logger.info(f"User '{id}' added/updated in _users_db. _users_db now has keys: {list(_users_db.keys())}")
#         return user
    




    # flask_server/user/models.py
from flask_login import UserMixin
from flask_sqlalchemy import SQLAlchemy
from flask import current_app # For logging within static methods if needed

# Initialize SQLAlchemy. This 'db' object will be properly configured
# with the Flask app instance in flask_server/__init__.py
db = SQLAlchemy()

class User(UserMixin, db.Model):
    __tablename__ = 'jobber_users' # Optional: specify table name

    id = db.Column(db.String, primary_key=True) # Google's 'sub' is a string
    name = db.Column(db.String(100), nullable=True)
    email = db.Column(db.String(100), unique=True, nullable=True) # Email might not always be provided or unique if users can change it
    profile_pic = db.Column(db.String(255), nullable=True)

    def __repr__(self):
        return f'<User {self.email or self.id}>'

    @staticmethod
    def get(user_id):
        # current_app.logger.info(f"User.get called for user_id: {user_id}")
        return User.query.get(user_id)

    @staticmethod
    def create_or_update(id, name=None, email=None, profile_pic=None):
        user = User.query.get(id)
        if user:
            # Update existing user
            # current_app.logger.info(f"Updating existing user: {id}")
            if name is not None: user.name = name
            if email is not None: user.email = email # Consider email uniqueness conflicts if it changes
            if profile_pic is not None: user.profile_pic = profile_pic
        else:
            # Create new user
            # current_app.logger.info(f"Creating new user: {id}")
            user = User(id=id, name=name, email=email, profile_pic=profile_pic)
            db.session.add(user)
        
        try:
            db.session.commit()
            # current_app.logger.info(f"User {id} committed to database.")
        except Exception as e:
            db.session.rollback()
            current_app.logger.error(f"Error committing user {id} to database: {e}", exc_info=True)
            raise # Re-raise the exception to be handled by the caller
        return user