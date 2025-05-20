# flask_server/auth/services.py
from authlib.integrations.flask_client import OAuth

oauth_clients = OAuth() # Global OAuth object for this module

def init_app(app):
    """Initializes OAuth clients for the given app using app.config."""
    oauth_clients.init_app(app) # Initialize with the Flask app instance
    google_client_id = app.config.get('GOOGLE_CLIENT_ID')
    google_client_secret = app.config.get('GOOGLE_CLIENT_SECRET')

    if not google_client_id or not google_client_secret:
        app.logger.error("Google OAuth client credentials (ID or Secret) not found in app.config.")
        # Depending on strictness, you might raise an error or just let it fail later
        return

    oauth_clients.register(
        name='google',
        client_id=google_client_id,
        client_secret=google_client_secret,
        server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
        client_kwargs={'scope': 'openid email profile'}
    )
    app.logger.info("Google OAuth client registered.")