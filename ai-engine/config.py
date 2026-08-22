import os

class Settings:
    APP_NAME: str = "K2 AI Engine"
    PORT: int = int(os.getenv("PORT", "8001"))
    REDIS_HOST: str = os.getenv("REDIS_HOST", "localhost")
    REDIS_PORT: int = int(os.getenv("REDIS_PORT", "6379"))
    BACKEND_API_URL: str = os.getenv("BACKEND_API_URL", "http://localhost:8000/api")
    MEDIAMTX_RTSP_URL: str = os.getenv("MEDIAMTX_RTSP_URL", "rtsp://localhost:8554/xiaomi_c500")
    SNAPSHOT_DIR: str = os.getenv("SNAPSHOT_DIR", os.path.join(os.path.dirname(os.path.dirname(__file__)), "storage", "snapshots"))
    FORENSIC_DIR: str = os.getenv("FORENSIC_DIR", os.path.join(os.path.dirname(os.path.dirname(__file__)), "storage", "forensic_videos"))
    
    # RunPod GPU config
    USE_CUDA: bool = os.getenv("USE_CUDA", "true").lower() in ("true", "1", "t")

settings = Settings()

# Ensure directories exist
os.makedirs(settings.SNAPSHOT_DIR, exist_ok=True)
os.makedirs(settings.FORENSIC_DIR, exist_ok=True)
