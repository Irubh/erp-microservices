import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from app.services.auth import verify_google_token, resolve_role, create_jwt, decode_jwt
from app.dependencies import get_current_user
from fastapi import Depends

load_dotenv()

app = FastAPI(title="Auth Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5500", "http://127.0.0.1:5500"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class GoogleLoginBody(BaseModel):
    credential: str   # raw JWT string sent by Google to the frontend

@app.get("/health")
def health():
    """Quick check that service is running."""
    return {"status": "ok", "service": "auth-service"}


@app.post("/auth/google/callback")
def google_callback(body: GoogleLoginBody):
    """
    Called by frontend immediately after Google login.

    Flow:
    1. Verify Google's token is genuine
    2. Extract email from it
    3. Determine role (employee domain vs vendor in DB)
    4. Issue our own JWT with role embedded
    """

    # Verify with Google
    try:
        google_user = verify_google_token(body.credential)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=f"Invalid Google token: {str(e)}")

    email = google_user.get("email")
    name  = google_user.get("name", email)

    if not email:
        raise HTTPException(status_code=400, detail="Google account has no email.")

    # Resolve role
    user_role = resolve_role(email)

    if not user_role:
        raise HTTPException(
            status_code=403,
            detail="Access denied. You are not registered in this system. Contact your admin."
        )

    # Issue JWT
    token = create_jwt(
        email=email,
        name=name,
        role=user_role["role"],
        vendor_id=user_role["vendor_id"],
        vendor_name=user_role["vendor_name"]
    )

    return {
        "access_token": token,
        "token_type":   "bearer",
        "role":         user_role["role"],
        "name":         name,
        "email":        email
    }


@app.get("/auth/me")
def get_me(user: dict = Depends(get_current_user)):
    """
    Returns the current logged-in user info from JWT.
    Frontend calls this to restore session on page refresh.
    """
    return {
        "email":       user["sub"],
        "name":        user["name"],
        "role":        user["role"],
        "vendor_id":   user.get("vendor_id"),
        "vendor_name": user.get("vendor_name")
    }


