from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4

from repositories import SupabaseScriptRepository
from schemas.script_schema import (
    AuthLoginRequest,
    AuthResponse,
    AuthRegisterRequest,
    User,
    UserPublic,
)


class AuthService:
    _repository: Optional[SupabaseScriptRepository] = None
    _redeemable_codes = {
        "SCRIPTFORGE100": 100,
        "BETA50": 50,
        "WELCOME20": 20,
    }

    @classmethod
    def _get_repository(cls) -> SupabaseScriptRepository:
        if cls._repository is None:
            cls._repository = SupabaseScriptRepository()
        return cls._repository

    @staticmethod
    def _hash_password(password: str, salt: str) -> str:
        return hashlib.sha256(f"{salt}:{password}".encode("utf-8")).hexdigest()

    @staticmethod
    def _generate_token(user: UserPublic) -> str:
        payload = {
            "sub": user.id,
            "email": user.email,
            "iat": int(datetime.now(timezone.utc).timestamp()),
        }
        secret = os.getenv("APP_SECRET", "scriptforge-dev-secret")
        encoded = base64.urlsafe_b64encode(json.dumps(payload).encode("utf-8")).decode("utf-8")
        signature = hmac.new(secret.encode("utf-8"), encoded.encode("utf-8"), hashlib.sha256).hexdigest()
        return f"{encoded}.{signature}"

    @classmethod
    async def register(cls, request: AuthRegisterRequest) -> AuthResponse:
        existing = cls._get_repository().get_user_by_email(request.email)
        if existing:
            raise ValueError("该邮箱已注册")

        salt = uuid4().hex
        user = User(
            id=str(uuid4()),
            email=request.email,
            password_salt=salt,
            password_hash=cls._hash_password(request.password, salt),
        )
        cls._get_repository().create_user(user)
        user_public = UserPublic(
            id=user.id,
            email=user.email,
            credits=user.credits,
            credits_used=user.credits_used,
            created_at=user.created_at,
        )
        return AuthResponse(token=cls._generate_token(user_public), user=user_public)

    @classmethod
    async def login(cls, request: AuthLoginRequest) -> AuthResponse:
        user = cls._get_repository().get_user_by_email(request.email)
        if not user:
            raise ValueError("用户不存在")

        password_hash = cls._hash_password(request.password, user.password_salt)
        if password_hash != user.password_hash:
            raise ValueError("密码错误")

        user_public = UserPublic(
            id=user.id,
            email=user.email,
            credits=user.credits,
            credits_used=user.credits_used,
            created_at=user.created_at,
        )
        return AuthResponse(token=cls._generate_token(user_public), user=user_public)

    @classmethod
    async def me(cls, user_id: str) -> Optional[UserPublic]:
        user = cls._get_repository().get_user(user_id)
        if not user:
            return None
        return UserPublic(
            id=user.id,
            email=user.email,
            credits=user.credits,
            credits_used=user.credits_used,
            created_at=user.created_at,
        )

    @classmethod
    async def credits(cls, user_id: str) -> Optional[dict[str, int]]:
        user = cls._get_repository().get_user(user_id)
        if not user:
            return None
        return {
            "credits": user.credits,
            "credits_used": user.credits_used,
        }

    @classmethod
    async def redeem_credits(cls, user_id: str, code: str) -> Optional[dict[str, int | str]]:
        normalized_code = code.strip().upper()
        user = cls._get_repository().get_user(user_id)
        if not user:
            return None
        amount = cls._redeemable_codes.get(normalized_code)
        if amount is None:
            raise ValueError("兑换码无效")

        updated = cls._get_repository().update_user(
            user_id,
            {"credits": user.credits + amount},
        )
        if not updated:
            return None
        return {
            "credits": updated.credits,
            "credits_used": updated.credits_used,
            "message": f"兑换成功，已增加 {amount} 点额度",
        }
