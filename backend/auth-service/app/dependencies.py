from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError
from app.services.auth import decode_jwt

bearer_scheme = HTTPBearer()

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)
) -> dict:
    """
    Dependency — inject into any route to require a valid JWT.
    Returns the decoded payload (sub, name, role, vendor_id, etc.)
    """
    try:
        payload = decode_jwt(credentials.credentials)
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token is invalid or has expired. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"}
        )


def require_employee(user: dict = Depends(get_current_user)) -> dict:
    """Only allow employees through."""
    if user.get("role") != "employee":
        raise HTTPException(status_code=403, detail="Employees only.")
    return user


def require_vendor(user: dict = Depends(get_current_user)) -> dict:
    """Only allow vendors through."""
    if user.get("role") != "vendor":
        raise HTTPException(status_code=403, detail="Vendors only.")
    return user