import hashlib
import os
import secrets
from typing import Tuple

SECRET_SALT = "a24-health-salt-key-2026"

def hash_password(password: str) -> str:
    """Hashes password with SHA-256 and constant salt."""
    salted = f"{SECRET_SALT}:{password}".encode("utf-8")
    return hashlib.sha256(salted).hexdigest()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verifies plain password against stored hash."""
    return hash_password(plain_password) == hashed_password

def generate_session_token(username: str) -> str:
    """Generates a simple bearer session token."""
    random_part = secrets.token_hex(16)
    return f"usr_{username}_{random_part}"
