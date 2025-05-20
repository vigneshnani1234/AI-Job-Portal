# flask_server/app.py
import os
import sys
import logging # Ensure logging is imported if used early

# If running this script directly from flask_server/,
# its parent directory (project_root) needs to be on the path
# for imports like 'from user.models import User' in other files
# if they were to use absolute imports from flask_server.
# However, with relative imports (from .user, from ..config) this
# specific sys.path manipulation here might not be the primary fix
# for the original ModuleNotFoundError if those relative imports
# are set up correctly within the submodules.
# The main issue was app.py trying `from flask_server import create_app`

# The create_app factory should now be directly importable if it's in __init__.py
# and app.py is in the same directory as __init__.py
# No, that's not right. If app.py is at the same level as user/, auth/, etc.
# it should use relative imports for them or they should be structured to be
# importable assuming flask_server/ is the "root" for this execution.

# Let's assume create_app is in __init__.py of the current directory (flask_server)
try:
    from . import create_app # This imports create_app from flask_server/__init__.py
except ImportError:
    # This fallback might be needed if __init__.py is not being picked up correctly
    # when app.py is the main script. This is getting complex and indicates
    # the run method is fighting the package structure.
    # For this to work, create_app must be in __init__.py
    # and __init__.py must be in the same directory as this app.py
    if __package__ is None or __package__ == '':
        # If run as a script, __package__ is None or empty.
        # We need to make the current directory act like a package.
        current_dir_path = os.path.dirname(os.path.abspath(__file__))
        sys.path.insert(0, os.path.dirname(current_dir_path)) # Add parent (project_root) to path
        # Now try importing flask_server as a module
        import flask_server
        create_app = flask_server.create_app
    else:
        raise


# Create the Flask app instance
app = create_app()

if __name__ == '__main__':
    # This block allows running the app directly with `python app.py`
    # from *within* the `flask_server` directory.
    app.logger.info(f"Starting Flask development server directly from app.py for app '{app.name}'...")
    app.run(host='127.0.0.1', port=5002, debug=True)