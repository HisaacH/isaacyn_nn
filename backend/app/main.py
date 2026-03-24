from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import inspect, text
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import get_password_hash
from app.database import Base, SessionLocal, engine
from app.models import User
from app.routers.auth import router as auth_router
from app.routers.moodboards import router as moodboards_router
from app.routers.posts import router as posts_router
from app.routers.uploads import router as uploads_router

settings = get_settings()
frontend_dist_dir = settings.base_dir.parent / "frontend" / "dist"
frontend_assets_dir = frontend_dist_dir / "assets"


def bootstrap_admin() -> None:
    db: Session = SessionLocal()
    try:
        user = db.query(User).filter(User.username == settings.admin_username).first()
        if user:
            return
        user = User(
            username=settings.admin_username,
            password_hash=get_password_hash(settings.admin_password),
            role="admin",
        )
        db.add(user)
        db.commit()
    finally:
        db.close()


def migrate_database() -> None:
    inspector = inspect(engine)
    if "moodboard_templates" not in inspector.get_table_names():
        return

    columns = {column["name"] for column in inspector.get_columns("moodboard_templates")}
    statements: list[str] = []

    if "group_name" not in columns:
        statements.append("ALTER TABLE moodboard_templates ADD COLUMN group_name VARCHAR(120) NOT NULL DEFAULT '默认分组'")
    if "preview_image" not in columns:
        statements.append("ALTER TABLE moodboard_templates ADD COLUMN preview_image TEXT")

    if not statements:
        return

    with engine.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    migrate_database()
    bootstrap_admin()
    yield


app = FastAPI(title="Markdown Video Blog API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=settings.uploads_dir), name="uploads")
if frontend_assets_dir.exists():
    app.mount("/assets", StaticFiles(directory=frontend_assets_dir), name="frontend-assets")

app.include_router(auth_router)
app.include_router(posts_router)
app.include_router(moodboards_router)
app.include_router(uploads_router)


@app.get("/api/health")
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/{full_path:path}")
def frontend_app(full_path: str):
    index_file = frontend_dist_dir / "index.html"
    requested_file = frontend_dist_dir / full_path

    if requested_file.is_file():
        return FileResponse(requested_file)
    if index_file.exists():
        return FileResponse(index_file)
    return {"detail": "Frontend build not found"}
