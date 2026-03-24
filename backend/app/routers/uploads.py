from __future__ import annotations

import re
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.database import get_db
from app.deps import require_admin
from app.models import Post, User
from app.schemas import ImageLibraryItem, UploadResponse

router = APIRouter(prefix="/api/uploads", tags=["uploads"])

ALLOWED_VIDEO_SUFFIXES = {".mp4", ".webm", ".ogg", ".mov"}
ALLOWED_IMAGE_SUFFIXES = {".png", ".jpg", ".jpeg", ".webp", ".gif"}
MARKDOWN_IMAGE_PATTERN = re.compile(r"!\[[^\]]*\]\(([^)\s]+)")
HTML_IMAGE_PATTERN = re.compile(r'<img[^>]+src=["\']([^"\']+)["\']', re.IGNORECASE)


def save_upload(upload_file: UploadFile, destination_dir: Path, allowed_suffixes: set[str], upload_type: str) -> UploadResponse:
    suffix = Path(upload_file.filename or "").suffix.lower()
    if suffix not in allowed_suffixes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unsupported {upload_type} format")

    filename = f"{uuid4().hex}{suffix}"
    destination = destination_dir / filename
    contents = upload_file.file.read()
    destination.write_bytes(contents)
    return UploadResponse(url=f"/uploads/{upload_type}s/{filename}")


def extract_image_urls(content: str) -> list[str]:
    if not content:
        return []
    return [*MARKDOWN_IMAGE_PATTERN.findall(content), *HTML_IMAGE_PATTERN.findall(content)]


@router.post("/video", response_model=UploadResponse)
async def upload_video(
    file: UploadFile = File(...),
    _: User = Depends(require_admin),
) -> UploadResponse:
    settings = get_settings()
    return save_upload(file, settings.videos_dir, ALLOWED_VIDEO_SUFFIXES, "video")


@router.post("/image", response_model=UploadResponse)
async def upload_image(
    file: UploadFile = File(...),
    _: User = Depends(require_admin),
) -> UploadResponse:
    settings = get_settings()
    return save_upload(file, settings.images_dir, ALLOWED_IMAGE_SUFFIXES, "image")


@router.get("/library", response_model=list[ImageLibraryItem])
def image_library(db: Session = Depends(get_db)) -> list[ImageLibraryItem]:
    settings = get_settings()
    items: list[ImageLibraryItem] = []
    seen: set[str] = set()

    def add_item(url: str, title: str, source: str, slug: str | None = None) -> None:
        if not url or url in seen:
            return
        seen.add(url)
        items.append(
            ImageLibraryItem(
                id=f"{source}:{len(items) + 1}",
                url=url,
                title=title,
                source=source,
                slug=slug,
            )
        )

    posts = (
        db.query(Post)
        .filter(Post.is_published.is_(True))
        .order_by(desc(Post.published_at), desc(Post.updated_at))
        .all()
    )

    for post in posts:
        if post.cover_image:
            add_item(post.cover_image, post.title, "cover", post.slug)

        for image_url in extract_image_urls(post.markdown_content):
            add_item(image_url, post.title, "content", post.slug)

    for file_path in sorted(settings.images_dir.glob("*"), key=lambda path: path.stat().st_mtime, reverse=True):
        if file_path.suffix.lower() in ALLOWED_IMAGE_SUFFIXES:
            add_item(f"/uploads/images/{file_path.name}", file_path.stem, "upload")

    return items
