# flask_server/auth_routes.py
import os
from flask import Blueprint, redirect, url_for, session, jsonify, current_app
from flask_login import login_user, logout_user, current_user as flask_current_user # Renamed to avoid conflict
from authlib.integrations.flask_client import OAuth
from user_management import User # Import User class from user_management.py

# Create a Blueprint for authentication routes
auth_bp = Blueprint('auth', __name__, url_prefix='/auth') # All routes in this BP will start with /auth

oauth_clients = OAuth() # Initialize OAuth object, will be configured in create_app

def init_oauth(app):
    """Initializes OAuth clients for the given app."""
    oauth_clients.init_app(app)
    google_client_id = app.config.get('GOOGLE_CLIENT_ID')
    google_client_secret = app.config.get('GOOGLE_CLIENT_SECRET')

    if not google_client_id or not google_client_secret:
        app.logger.error("GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not configured for OAuth.")
        # You might want to raise an error or handle this more gracefully
        return

    oauth_clients.register(
        name='google',
        client_id=google_client_id,
        client_secret=google_client_secret,
        server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
        client_kwargs={
            'scope': 'openid email profile'
        }
    )

@auth_bp.route('/google/login')
def google_login():
    # The redirect_uri must match EXACTLY one of the URIs you registered
    # with Google for your OAuth client.
    # Note: 'auth.google_callback' refers to the 'google_callback' function within the 'auth' blueprint.
    redirect_uri = url_for('auth.google_callback', _external=True)
    current_app.logger.info(f"Attempting Google login, redirect_uri: {redirect_uri}")
    if not oauth_clients.google: # Check if google client is registered
        current_app.logger.error("Google OAuth client not registered/initialized.")
        return redirect(current_app.config.get('FRONTEND_URL', 'http://localhost:3000') + '/welcome?error=oauth_config_error')
    return oauth_clients.google.authorize_redirect(redirect_uri)

@auth_bp.route('/google/callback')
def google_callback():
    try:
        token = oauth_clients.google.authorize_access_token()
        current_app.logger.debug(f"Received token from Google.")
    except Exception as e:
        current_app.logger.error(f"Error authorizing access token with Google: {e}", exc_info=True)
        return redirect(current_app.config.get('FRONTEND_URL', 'http://localhost:3000') + '/welcome?error=oauth_failed')

    # Fetches user info using the token.
    # parse_id_token is generally preferred for OpenID Connect as it verifies the token signature.
    try:
        user_info = oauth_clients.google.parse_id_token(token)
        # If parse_id_token doesn't give all info, or you prefer userinfo endpoint:
        # user_info_endpoint = oauth_clients.google.userinfo(token=token)
    except Exception as e:
        current_app.logger.error(f"Error parsing ID token or fetching userinfo: {e}", exc_info=True)
        return redirect(current_app.config.get('FRONTEND_URL', 'http://localhost:3000') + '/welcome?error=user_info_failed')


    google_user_id = user_info.get('sub')
    user_email = user_info.get('email')
    user_name = user_info.get('name')
    user_profile_pic = user_info.get('picture')

    current_app.logger.info(f"Google user info: id={google_user_id}, email={user_email}, name={user_name}")

    if not google_user_id:
        current_app.logger.error("Could not retrieve unique ID (sub) from Google user info.")
        return redirect(current_app.config.get('FRONTEND_URL', 'http://localhost:3000') + '/welcome?error=user_info_failed')

    user = User.create_or_update(id=google_user_id, name=user_name, email=user_email, profile_pic=user_profile_pic)
    login_user(user, remember=True)
    current_app.logger.info(f"User {user_email} logged in successfully.")

    frontend_welcome_url = current_app.config.get('FRONTEND_URL', 'http://localhost:3000') + '/welcome'
    return redirect(frontend_welcome_url)

@auth_bp.route('/status')
def status():
    if flask_current_user.is_authenticated:
        current_app.logger.debug(f"Auth status check: User {flask_current_user.email} is authenticated.")
        return jsonify({
            "logged_in": True,
            "user": {
                "id": flask_current_user.id,
                "name": flask_current_user.name,
                "email": flask_current_user.email,
                "profile_pic": flask_current_user.profile_pic
            }
        })
    else:
        current_app.logger.debug("Auth status check: User is not authenticated.")
        return jsonify({"logged_in": False})

@auth_bp.route('/logout')
def logout():
    # @login_required is not strictly needed on the Blueprint route itself
    # if the entire Blueprint or specific actions are protected elsewhere,
    # but it's good practice if this endpoint should ONLY be accessible by logged-in users.
    # However, a logout link might be visible to anyone.
    user_email = flask_current_user.email if flask_current_user.is_authenticated else "Unknown user"
    logout_user()
    current_app.logger.info(f"User {user_email} logged out.")
    frontend_welcome_url = current_app.config.get('FRONTEND_URL', 'http://localhost:3000') + '/welcome'
    return redirect(frontend_welcome_url)