from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "IVDR Automation MVP"
    environment: str = "dev"
    database_url: str = "sqlite:///./ivdr.db"
    openai_api_key: str = ""
    google_drive_mode: str = "mock"
    google_drive_root_id: str = "mock-root"
    storage_path: str = "./storage"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
