import os
import sys

# Add backend directory to sys.path so app modules resolve seamlessly from root
backend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.main import app

main = app
