from __future__ import annotations

from datetime import datetime
from typing import Any

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


class MoodboardTemplateBase(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    group_name: str = Field(default="默认分组", min_length=1, max_length=120)
    board_title: str = Field(default="", max_length=220)
    board_note: str = ""
    canvas_width: int = Field(default=1800, ge=320, le=6000)
    canvas_height: int = Field(default=1400, ge=320, le=6000)
    background_color: str = Field(default="#0b1626", max_length=32)
    preview_image: str | None = None
    board_items: list[dict[str, Any]] = Field(default_factory=list)
    doodles: list[dict[str, Any]] = Field(default_factory=list)


class MoodboardTemplateCreate(MoodboardTemplateBase):
    pass


class MoodboardTemplateUpdate(MoodboardTemplateBase):
    pass


class MoodboardTemplatePublic(MoodboardTemplateBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


class MoodboardGalleryItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    group_name: str
    board_title: str
    board_note: str
    preview_image: str | None
    updated_at: datetime
