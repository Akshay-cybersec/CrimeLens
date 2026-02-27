from pydantic import BaseModel, Field


class PageRequest(BaseModel):
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=50, ge=1, le=500)


class PageMeta(BaseModel):
    page: int
    page_size: int
    total: int


def skip_limit(page: int, page_size: int) -> tuple[int, int]:
    skip = (page - 1) * page_size
    return skip, page_size
