from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class LoginPayload(BaseModel):
    username: str
    password: str


class UserPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    role: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserPublic


class PostBase(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    summary: str = Field(default="", max_length=320)
    cover_image: str | None = None
    markdown_content: str = ""
    video_url: str | None = None
    video_upload_path: str | None = None
    is_published: bool = False


class PostCreate(PostBase):
    slug: str | None = None


class PostUpdate(PostBase):
    slug: str | None = None


class PostSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    slug: str
    summary: str
    cover_image: str | None
    video_url: str | None
    video_upload_path: str | None
    is_published: bool
    created_at: datetime
    updated_at: datetime
    published_at: datetime | None


class PostDetail(PostSummary):
    markdown_content: str
    html_content: str


class UploadResponse(BaseModel):
    url: str


class ImageLibraryItem(BaseModel):
    id: str
    url: str
    title: str
    source: str
    slug: str | None = None
