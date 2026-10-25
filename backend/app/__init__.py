# A24 Healthcare Backend Package
from app.main import app

# Alias main to app so that `uvicorn app:main --reload`, `uvicorn app:app --reload`,
# and `uvicorn app.main:app --reload` all work seamlessly!
main = app

__all__ = ["app", "main"]
