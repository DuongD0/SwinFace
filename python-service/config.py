"""
Configuration module for SwinFace Python Service
"""
import os
from pathlib import Path
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    """Application settings with environment variable support"""
    
    # Database Configuration
    database_url: str = "postgresql://swinface_user:swinface_password@localhost:5432/swinface_db"
    
    # Server Configuration
    host: str = "0.0.0.0"
    port: int = 8000
    
    # File Storage Paths
    upload_dir: Path = Path("../uploads")
    output_dir: Path = Path("../outputs")
    known_faces_dir: Path = Path("../known_faces")
    models_dir: Path = Path("../models")
    
    # YOLO Model Configuration
    yolo_model: str = "yolov11m-face.pt"
    device: str = "cuda"  # or "cpu"
    
    # Motion Analysis Parameters
    max_history: int = 30
    ema_alpha: float = 0.2
    warmup_frames: int = 30
    movement_threshold: float = 1.0
    
    # Face Recognition Parameters
    face_recognition_threshold: float = 0.6
    
    class Config:
        env_file = ".env"
        case_sensitive = False

# Create global settings instance
settings = Settings()

# Ensure directories exist
settings.upload_dir.mkdir(parents=True, exist_ok=True)
settings.output_dir.mkdir(parents=True, exist_ok=True)
settings.known_faces_dir.mkdir(parents=True, exist_ok=True)
settings.models_dir.mkdir(parents=True, exist_ok=True)

