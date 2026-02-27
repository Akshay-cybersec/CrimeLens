from pydantic import BaseModel

from app.core.security import Role


class UserDocument(BaseModel):
    id: str
    username: str
    role: Role
    password_hash: str
    is_active: bool = True
