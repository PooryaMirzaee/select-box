from functools import lru_cache
from pathlib import Path

import yaml
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


PACKAGE_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_CHANNELS_CONFIG = PACKAGE_ROOT / "config" / "channels.yaml"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    api_base_url: str = Field(default="http://localhost:8000", alias="API_BASE_URL")
    storefront_url: str = Field(default="http://localhost:3000", alias="STOREFRONT_URL")
    admin_phone: str = Field(default="", alias="ADMIN_PHONE")
    admin_password: str = Field(default="", alias="ADMIN_PASSWORD")
    data_dir: Path = Field(default=Path("~/.avan-publisher"), alias="DATA_DIR")
    channels_config_path: Path = Field(
        default=DEFAULT_CHANNELS_CONFIG,
        alias="CHANNELS_CONFIG_PATH",
    )

    @property
    def api_v1(self) -> str:
        return f"{self.api_base_url.rstrip('/')}/api/v1"

    @property
    def resolved_data_dir(self) -> Path:
        return self.data_dir.expanduser().resolve()

    @property
    def token_path(self) -> Path:
        return self.resolved_data_dir / "token.json"

    @property
    def db_path(self) -> Path:
        return self.resolved_data_dir / "publisher.db"


@lru_cache
def get_settings() -> Settings:
    return Settings()


def load_channels_config(path: Path | None = None) -> dict:
    cfg_path = path or get_settings().channels_config_path
    if not cfg_path.is_file():
        return {"channels": {}}
    with cfg_path.open(encoding="utf-8") as f:
        return yaml.safe_load(f) or {"channels": {}}
