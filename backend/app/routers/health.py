from fastapi import APIRouter, Depends

from app.core.security import AuthUser, get_current_user

router = APIRouter(tags=["health"])


@router.get("/health")
async def healthcheck(_: AuthUser = Depends(get_current_user)) -> dict[str, str]:
    return {"status": "ok"}
