from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path


class Settings:
    def __init__(self) -> None:
        base_dir = Path(__file__).resolve().parents[2]
        self.base_dir = base_dir
        self.data_dir = base_dir / "data"
        self.uploads_dir = base_dir / "uploads"
        self.videos_dir = self.uploads_dir / "videos"
        self.images_dir = self.uploads_dir / "images"
        self.database_url = os.getenv("DATABASE_URL", f"sqlite:///{(self.data_dir / 'blog.db').as_posix()}")
        self.secret_key = os.getenv("SECRET_KEY", "change-this-secret-in-production")
        self.algorithm = "HS256"
        self.access_token_expire_minutes = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
        self.admin_username = os.getenv("ADMIN_USERNAME", "admin")
        self.admin_password = os.getenv("ADMIN_PASSWORD", "admin123456")
        self.cors_origins = [
            origin.strip()
            for origin in os.getenv("CORS_ORIGINS", "http://127.0.0.1:5173,http://localhost:5173").split(",")
            if origin.strip()
        ]


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    settings.data_dir.mkdir(parents=True, exist_ok=True)
    settings.videos_dir.mkdir(parents=True, exist_ok=True)
    settings.images_dir.mkdir(parents=True, exist_ok=True)
    return settings
