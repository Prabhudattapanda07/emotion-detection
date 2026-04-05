# Admin JWT — optional until ADMIN_PASSWORD is set in environment.

import os
from datetime import datetime, timedelta, timezone
from typing import Optional

import jwt
from jwt.exceptions import ExpiredSignatureError, InvalidTokenError
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

security = HTTPBearer(auto_error=False)

JWT_ALG = "HS256"
JWT_EXPIRE_HOURS = 12


def admin_auth_enabled() -> bool:
    return bool(os.getenv("ADMIN_PASSWORD", "").strip())


def _jwt_secret() -> str:
    secret = os.getenv("ADMIN_JWT_SECRET", "").strip()
    if secret:
        return secret
    # Single-env dev fallback: derive from password (set ADMIN_JWT_SECRET in production)
    pwd = os.getenv("ADMIN_PASSWORD", "").strip()
    if pwd:
        return "emoticloud-admin:" + pwd
    return ""


def create_admin_token() -> str:
    secret = _jwt_secret()
    if not secret:
        raise RuntimeError("Cannot issue token without ADMIN_PASSWORD / secret")
    now = datetime.now(timezone.utc)
    payload = {
        "sub": "admin",
        "iat": now,
        "exp": now + timedelta(hours=JWT_EXPIRE_HOURS),
    }
    return jwt.encode(payload, secret, algorithm=JWT_ALG)


def decode_admin_token(token: str) -> dict:
    secret = _jwt_secret()
    return jwt.decode(token, secret, algorithms=[JWT_ALG])


async def require_admin(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> None:
    """Skip auth when ADMIN_PASSWORD is unset (local dev). Otherwise require Bearer JWT."""
    if not admin_auth_enabled():
        return
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        decode_admin_token(credentials.credentials)
    except (ExpiredSignatureError, InvalidTokenError):
        raise HTTPException(status_code=401, detail="Invalid or expired token")
