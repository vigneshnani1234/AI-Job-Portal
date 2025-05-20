# flask_server/auth/routes.py
from flask import Blueprint, redirect, url_for, jsonify, current_app, session # Added session
from flask_login import login_user, logout_user, current_user as flask_login_current_user
from ..user.models import User
from .services import oauth_clients

auth_bp = Blueprint('auth', __name__, url_prefix='/auth')

@auth_bp.route('/google/login')
def google_login():
    redirect_uri = url_for('auth.google_callback', _external=True)
    current_app.logger.info(f"Attempting Google login, redirect_uri SENT TO GOOGLE: {redirect_uri}")
    if not hasattr(oauth_clients, 'google') or not oauth_clients.google.client_id:
        current_app.logger.error("Google OAuth client ('google') is not registered or configured.")
        return redirect(current_app.config.get('FRONTEND_URL') + '/?error=oauth_config_error')
    
    # Authlib typically handles nonce internally if the server metadata indicates support
    # and the scope 'openid' is used. For userinfo endpoint, explicit nonce handling by us is less critical.
    return oauth_clients.google.authorize_redirect(redirect_uri)

@auth_bp.route('/google/callback')
def google_callback():
    try:
        # This fetches the access token AND the ID token (if 'openid' scope was used)
        token = oauth_clients.google.authorize_access_token()
        current_app.logger.debug(f"Received token object from Google: {token.keys() if isinstance(token, dict) else 'Token received'}")
    except Exception as e:
        current_app.logger.error(f"Error authorizing access token with Google: {e}", exc_info=True)
        return redirect(current_app.config.get('FRONTEND_URL') + '/?error=oauth_failed')

    try:
        # Use the userinfo() endpoint. It uses the 'access_token' from the 'token' object.
        # Authlib will ensure the token is valid before making the request.
        user_info = oauth_clients.google.userinfo(token=token)
        # user_info will be a dictionary of claims like 'sub', 'name', 'email', 'picture'
        current_app.logger.debug(f"Userinfo received: {user_info}")

    except Exception as e:
        current_app.logger.error(f"Error fetching user information via userinfo() endpoint: {e}", exc_info=True)
        return redirect(current_app.config.get('FRONTEND_URL') + '/?error=user_info_failed')

    google_user_id = user_info.get('sub')
    user_email = user_info.get('email')
    user_name = user_info.get('name')
    user_profile_pic = user_info.get('picture')

    current_app.logger.info(f"Extracted Google user info: id={google_user_id}, email={user_email}, name={user_name}")

    if not google_user_id:
        current_app.logger.error("Could not retrieve unique ID (sub) from Google user info via userinfo().")
        return redirect(current_app.config.get('FRONTEND_URL') + '/?error=user_info_failed')

    user_obj = User.create_or_update(id=google_user_id, name=user_name, email=user_email, profile_pic=user_profile_pic)
    login_user(user_obj, remember=True)
    current_app.logger.info(f"User {user_email} logged in successfully.")
    return redirect(current_app.config.get('FRONTEND_URL') + '/')

# ... (status and logout routes remain the same) ...
@auth_bp.route('/status')
def status():
    if flask_login_current_user.is_authenticated:
        return jsonify({
            "logged_in": True,
            "user": {
                "id": flask_login_current_user.id,
                "name": flask_login_current_user.name,
                "email": flask_login_current_user.email,
                "profile_pic": flask_login_current_user.profile_pic
            }
        })
    return jsonify({"logged_in": False})

@auth_bp.route('/logout')
def logout():
    user_email = flask_login_current_user.email if flask_login_current_user.is_authenticated else "User"
    logout_user()
    current_app.logger.info(f"User {user_email} logged out.")
    return redirect(current_app.config.get('FRONTEND_URL') + '/')