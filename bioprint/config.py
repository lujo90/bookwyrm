from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    app_name: str = "BioPrint"
    debug: bool = False

    database_url: str = "sqlite:///./bioprint.db"

    # Artifact storage — swap ARTIFACT_DIR for an S3 path later
    artifact_dir: Path = Path("./artifacts")

    # Compliance
    atmp_regulation_ref: str = "EC 1394/2007"
    consent_template_version: str = "1.0"

    # Report generation
    report_format: str = "html"  # "html" | "pdf" — pdf requires WeasyPrint


settings = Settings()

# Ensure artifact directory exists at import time
settings.artifact_dir.mkdir(parents=True, exist_ok=True)
