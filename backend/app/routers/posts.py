from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_admin
from app.models import Post, User
from app.schemas import PostCreate, PostDetail, PostSummary, PostUpdate
from app.utils import render_markdown, unique_slug, utcnow

router = APIRouter(tags=["posts"])


def apply_post_payload(post: Post, payload: PostCreate | PostUpdate, db: Session) -> Post:
    post.title = payload.title
    post.slug = unique_slug(db, payload.title, payload.slug, post.id if post.id else None)
    post.summary = payload.summary
    post.cover_image = payload.cover_image
    post.markdown_content = payload.markdown_content
    post.html_content = render_markdown(payload.markdown_content)
    post.video_url = payload.video_url
    post.video_upload_path = payload.video_upload_path

    if payload.is_published and not post.published_at:
        post.published_at = utcnow()
    if not payload.is_published:
        post.published_at = None

    post.is_published = payload.is_published
    return post


@router.get("/api/posts", response_model=list[PostSummary])
def list_public_posts(db: Session = Depends(get_db)) -> list[Post]:
    return (
        db.query(Post)
        .filter(Post.is_published.is_(True))
        .order_by(desc(Post.published_at), desc(Post.created_at))
        .all()
    )


@router.get("/api/posts/{slug}", response_model=PostDetail)
def get_public_post(slug: str, db: Session = Depends(get_db)) -> Post:
    post = db.query(Post).filter(Post.slug == slug, Post.is_published.is_(True)).first()
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    return post


@router.get("/api/admin/posts", response_model=list[PostSummary])
def list_admin_posts(_: User = Depends(require_admin), db: Session = Depends(get_db)) -> list[Post]:
    return db.query(Post).order_by(desc(Post.updated_at)).all()


@router.get("/api/admin/posts/{post_id}", response_model=PostDetail)
def get_admin_post(post_id: int, _: User = Depends(require_admin), db: Session = Depends(get_db)) -> Post:
    post = db.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")
    return post


@router.post("/api/admin/posts", response_model=PostDetail, status_code=status.HTTP_201_CREATED)
def create_post(payload: PostCreate, _: User = Depends(require_admin), db: Session = Depends(get_db)) -> Post:
    post = apply_post_payload(Post(), payload, db)
    db.add(post)
    db.commit()
    db.refresh(post)
    return post


@router.put("/api/admin/posts/{post_id}", response_model=PostDetail)
def update_post(
    post_id: int,
    payload: PostUpdate,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> Post:
    post = db.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")

    apply_post_payload(post, payload, db)
    db.add(post)
    db.commit()
    db.refresh(post)
    return post


@router.delete("/api/admin/posts/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_post(post_id: int, _: User = Depends(require_admin), db: Session = Depends(get_db)) -> None:
    post = db.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Post not found")

    db.delete(post)
    db.commit()
