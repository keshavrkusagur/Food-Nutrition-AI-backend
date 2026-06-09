from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    APP_NAME: str = "FoodGuard AI"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000"]
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""
    REDIS_URL: str = "redis://localhost:6379"
    MODEL_DIR: str = "./models"
    ACTIVE_MODEL: str = "xgboost_v3"
    CONFIDENCE_THRESHOLD: float = 0.75

    class Config:
        env_file = ".env"

settings = Settings()
