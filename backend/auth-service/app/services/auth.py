import os
from datetime import datetime, timedelta
from dotenv import load_dotenv

from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from jose import jwt, JWTError

from app.database.db import find_vendor_by_email

load_dotenv()

GOOGLE_CLIENT_ID  = os.getenv("GOOGLE_CLIENT_ID")
JWT_SECRET        = os.getenv("JWT_SECRET")
JWT_ALGORITHM     = os.getenv("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_HOURS  = int(os.getenv("JWT_EXPIRE_HOURS", 8))
EMPLOYEE_DOMAIN   = os.getenv("EMPLOYEE_DOMAIN", "iv-innovations.com")


def verify_google_token(credential: str) -> dict:
    """
    Sends Google's JWT to Google's servers to verify it's genuine.
    Returns the decoded user info (email, name, picture, etc.)
    Raises ValueError if token is fake or expired.
    """
    user_info = id_token.verify_oauth2_token(
        credential,
        google_requests.Request(),
        GOOGLE_CLIENT_ID
    )
    return user_info


def resolve_role(email: str) -> dict | None:
    """
    Determines if the email belongs to an employee or a vendor.

    Logic:
      - If email domain matches EMPLOYEE_DOMAIN → employee
      - Else → look up vendors table by email
      - If not found in either → return None (will cause 403)

    Returns dict: { role, vendor_id, vendor_name }
    """
    domain = email.split("@")[-1].lower()

    # Employee check 
    if domain == EMPLOYEE_DOMAIN:
        return {
            "role":        "employee",
            "vendor_id":   None,
            "vendor_name": None
        }

    # Vendor check
    vendor = find_vendor_by_email(email)
    if vendor:
        return {
            "role":        "vendor",
            "vendor_id":   vendor["id"],
            "vendor_name": vendor["name"]
        }

    # --- Unknown user ---
    return None


def create_jwt(email: str, name: str, role: str, vendor_id, vendor_name) -> str:
    """
    Issues your own application JWT.
    This token is what all your other services will validate.
    """
    expire = datetime.utcnow() + timedelta(hours=JWT_EXPIRE_HOURS)

    payload = {
        "sub":         email,          # subject (user identifier)
        "name":        name,
        "role":        role,           # "employee" or "vendor"
        "vendor_id":   vendor_id,      # None for employees
        "vendor_name": vendor_name,    # None for employees
        "exp":         expire          # expiry timestamp
    }

    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_jwt(token: str) -> dict:
    """
    Decodes and validates your application JWT.
    Used by /auth/me endpoint and other services.
    Raises JWTError if invalid or expired.
    """
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])