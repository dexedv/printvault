import os
from pathlib import Path
from typing import Optional
from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # App
    app_name: str = "PrintVault"
    debug: bool = True
    api_prefix: str = "/api/v1"

    # Database
    database_url: str = "sqlite:///./printvault.db"

    # Storage
    storage_dir: str = "storage"
    thumbnail_size_str: str = "256,256"

    # Security
    secret_key: str = "dev-secret-key-change-in-production"

    # CORS
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000", "electron://local"]

    # Moonraker defaults
    moonraker_timeout: int = 30

    @property
    def storage_path(self) -> Path:
        return Path(self.storage_dir)

    @property
    def thumbnails_path(self) -> Path:
        return self.storage_path / "thumbnails"

    @property
    def thumbnail_size(self) -> tuple[int, int]:
        parts = self.thumbnail_size_str.split(",")
        return (int(parts[0]), int(parts[1]))

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    settings = Settings()
    # Ensure directories exist
    settings.storage_path.mkdir(parents=True, exist_ok=True)
    settings.thumbnails_path.mkdir(parents=True, exist_ok=True)
    return settings


settings = get_settings()
