from __future__ import annotations

import re
import unicodedata
from datetime import datetime, timezone

import markdown
from sqlalchemy.orm import Session

from app.models import Post


def slugify(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", normalized).strip("-").lower()
    return slug or "post"


def unique_slug(db: Session, title: str, desired_slug: str | None = None, current_post_id: int | None = None) -> str:
    base_slug = slugify(desired_slug or title)
    candidate = base_slug
    counter = 2

    while True:
        query = db.query(Post).filter(Post.slug == candidate)
        if current_post_id is not None:
            query = query.filter(Post.id != current_post_id)
        if not query.first():
            return candidate
        candidate = f"{base_slug}-{counter}"
        counter += 1


def render_markdown(content: str) -> str:
    return markdown.markdown(
        content,
        extensions=["fenced_code", "tables", "toc", "sane_lists"],
        output_format="html5",
    )


def utcnow() -> datetime:
    return datetime.now(timezone.utc)
