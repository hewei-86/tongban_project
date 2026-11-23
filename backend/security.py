"""密码哈希、JWT 与鉴权依赖。"""

import hashlib
import hmac
import os
import secrets
from datetime import datetime, timedelta, timezone

import jwt
from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from database import get_db
from models import User, UserStatus

load_dotenv()

PBKDF2_ITERATIONS = 120_000
JWT_ALGORITHM = "HS256"
TOKEN_DAYS = int(os.getenv("TOKEN_DAYS", "30"))

JWT_SECRET = os.getenv("JWT_SECRET", "").strip()
if not JWT_SECRET:
    JWT_SECRET = "dev-insecure-secret-change-me"
    print("[security] WARNING: JWT_SECRET 未配置，正在使用开发默认值，请勿用于生产")

bearer_scheme = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), PBKDF2_ITERATIONS)
    return f"pbkdf2_sha256${PBKDF2_ITERATIONS}${salt}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        algorithm, iterations, salt, expected = (stored or "").split("$", 3)
        if algorithm != "pbkdf2_sha256":
            return False
        digest = hashlib.pbkdf2_hmac(
            "sha256", password.encode("utf-8"), salt.encode("utf-8"), int(iterations)
        )
        return hmac.compare_digest(digest.hex(), expected)
    except Exception:
        return False


def create_access_token(user_id: int) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(days=TOKEN_DAYS)).timestamp()),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def _unauthorized(detail: str = "请先登录") -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=detail,
        headers={"WWW-Authenticate": "Bearer"},
    )


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None or not credentials.credentials:
        raise _unauthorized()
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = int(payload.get("sub", 0))
    except jwt.ExpiredSignatureError:
        raise _unauthorized("登录已过期，请重新登录")
    except Exception:
        raise _unauthorized("登录状态无效，请重新登录")

    user = db.get(User, user_id)
    if not user:
        raise _unauthorized("账号不存在")

    status = db.get(UserStatus, user.id)
    if status and not status.is_active:
        raise HTTPException(status_code=403, detail="账号已被停用，请联系管理员")

    return user


def get_admin_user(user: User = Depends(get_current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="需要管理员权限")
    return user
