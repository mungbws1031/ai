from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "IVDR Automation MVP"
    environment: str = "dev"
    database_url: str = "sqlite:///./ivdr.db"
    openai_api_key: str = ""
    google_drive_mode: str = "mock"
    google_drive_root_id: str = "mock-root"
    google_service_account_json: str = ""
    google_drive_shared_drive_id: str = ""
    storage_path: str = "./storage"
    # PoC: path to the kordoc CLI (HWP/HWPX/PDF/DOCX -> Markdown). Empty = use tools/kordoc/node_modules/.bin/kordoc.
    kordoc_bin: str = ""
    kordoc_timeout_seconds: int = 120

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
