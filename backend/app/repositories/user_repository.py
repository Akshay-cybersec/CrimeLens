from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Optional

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo import ASCENDING
from pymongo.errors import DuplicateKeyError

from app.core.security import hash_password
from app.models.user import UserDocument


class UserRepository:
    def __init__(self, db: AsyncIOMotorDatabase[Any]) -> None:
        self.collection = db["users"]

    async def ensure_indexes(self) -> None:
        await self.collection.create_index([("email", ASCENDING)], unique=True)

    async def create_pending_user(self, email: str, password: str, full_name: str) -> UserDocument:
        user = UserDocument(
            email=email,
            password_hash=hash_password(password),
            full_name=full_name,
            role="INVESTIGATOR",
            status="PENDING",
            is_active=False,
        )
        payload = user.model_dump(by_alias=True, exclude_none=True)
        try:
            result = await self.collection.insert_one(payload)
        except DuplicateKeyError as exc:
            raise ValueError("Email is already registered.") from exc
        user.id = result.inserted_id
        return user

    async def get_by_email(self, email: str) -> Optional[UserDocument]:
        data = await self.collection.find_one({"email": email.lower()})
        return UserDocument(**data) if data else None

    async def get_by_id(self, user_id: str) -> Optional[UserDocument]:
        if not ObjectId.is_valid(user_id):
            return None
        data = await self.collection.find_one({"_id": ObjectId(user_id)})
        return UserDocument(**data) if data else None

    async def list_pending_users(self) -> list[UserDocument]:
        cursor = self.collection.find({"status": "PENDING"}).sort("created_at", ASCENDING)
        return [UserDocument(**row) async for row in cursor]

    async def approve_user(self, user_id: str, approver_id: str) -> bool:
        if not ObjectId.is_valid(user_id) or not ObjectId.is_valid(approver_id):
            return False
        result = await self.collection.update_one(
            {"_id": ObjectId(user_id)},
            {
                "$set": {
                    "status": "APPROVED",
                    "is_active": True,
                    "approved_by": ObjectId(approver_id),
                    "approved_at": datetime.now(timezone.utc),
                }
            },
        )
        return result.matched_count == 1

    async def reject_user(self, user_id: str) -> bool:
        if not ObjectId.is_valid(user_id):
            return False
        result = await self.collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": {"status": "REJECTED", "is_active": False}},
        )
        return result.matched_count == 1

    async def ensure_super_admin(self, email: str, password: str, full_name: str) -> None:
        normalized_email = email.lower()
        existing = await self.collection.find_one({"email": normalized_email})
        if existing:
            await self.collection.update_one(
                {"_id": existing["_id"]},
                {
                    "$set": {
                        "password_hash": hash_password(password),
                        "full_name": full_name,
                        "role": "SUPER_ADMIN",
                        "status": "APPROVED",
                        "is_active": True,
                        "approved_at": datetime.now(timezone.utc),
                    },
                },
            )
            return
        admin = UserDocument(
            email=normalized_email,
            password_hash=hash_password(password),
            full_name=full_name,
            role="SUPER_ADMIN",
            status="APPROVED",
            is_active=True,
            approved_at=datetime.now(timezone.utc),
        )
        await self.collection.insert_one(admin.model_dump(by_alias=True, exclude_none=True))
