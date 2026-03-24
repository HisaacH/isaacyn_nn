from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import JSON, Boolean, DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(20), default="admin", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)


class Post(Base):
    __tablename__ = "posts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    slug: Mapped[str] = mapped_column(String(220), unique=True, nullable=False, index=True)
    summary: Mapped[str] = mapped_column(String(320), default="", nullable=False)
    cover_image: Mapped[str | None] = mapped_column(String(500), nullable=True)
    markdown_content: Mapped[str] = mapped_column(Text, default="", nullable=False)
    html_content: Mapped[str] = mapped_column(Text, default="", nullable=False)
    video_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    video_upload_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_published: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class MoodboardTemplate(Base):
    __tablename__ = "moodboard_templates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(160), nullable=False, index=True)
    group_name: Mapped[str] = mapped_column(String(120), default="默认分组", nullable=False, index=True)
    board_title: Mapped[str] = mapped_column(String(220), default="", nullable=False)
    board_note: Mapped[str] = mapped_column(Text, default="", nullable=False)
    canvas_width: Mapped[int] = mapped_column(Integer, default=1800, nullable=False)
    canvas_height: Mapped[int] = mapped_column(Integer, default=1400, nullable=False)
    background_color: Mapped[str] = mapped_column(String(32), default="#0b1626", nullable=False)
    preview_image: Mapped[str | None] = mapped_column(Text, nullable=True)
    board_items: Mapped[list[dict]] = mapped_column(JSON, default=list, nullable=False)
    doodles: Mapped[list[dict]] = mapped_column(JSON, default=list, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)
