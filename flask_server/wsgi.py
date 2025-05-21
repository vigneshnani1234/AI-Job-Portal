# flask_server/wsgi.py
from . import create_app # Assuming create_app is in flask_server/__init__.py

app = create_app()