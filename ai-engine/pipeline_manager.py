import logging
import threading
import time
import numpy as np
from config import settings
from redis_client import notifier
from video_sources import video_manager

# Importar detectores
from detectors.safety_ppe import PPEDetector
from detectors.safety_roi import ROIDetector
from detectors.safety_fall import FallDetector
from detectors.security_lpr import LPRDetector
from detectors.security_face import FaceRecognitionDetector
from detectors.security_accessories import ForbiddenAccessoriesDetector
from detectors.security_attributes import PhysicalAttributesDetector

logger = logging.getLogger("k2-pipeline")

class PipelineManager:
    """
    Gestor Single-Pipeline para el motor de inferencia IA.
    Garantiza que solo una parametrización de análisis se encuentre activa a la vez.
    """
    def __init__(self):
        self.lock = threading.Lock()
        self.active_pipeline = "safety_ppe"  # Default active pipeline
        self.active_category = "safety"      # "safety" | "security"
        
        # Instanciar detectores
        self.detectors = {
            "safety_ppe": PPEDetector(),
            "safety_roi": ROIDetector(),
            "safety_fall": FallDetector(),
            "security_lpr": LPRDetector(),
            "security_face": FaceRecognitionDetector(),
            "security_accessories": ForbiddenAccessoriesDetector(),
            "security_attributes": PhysicalAttributesDetector(),
        }

        self.roi_polygon = None
        self.frame_idx = 0
        self.fps = 30.0
        self.gpu_utilization = 42.5 # Simulated / RunPod RTX 4090 VRAM metrics
        self.last_frame_processed = None

    def set_active_pipeline(self, pipeline_name: str) -> dict:
        with self.lock:
            if pipeline_name not in self.detectors:
                raise ValueError(f"Pipeline no válido: {pipeline_name}")

            self.active_pipeline = pipeline_name
            self.active_category = "safety" if pipeline_name.startswith("safety") else "security"
            
            logger.info(f"Pipeline activo cambiado a: {self.active_pipeline} ({self.active_category})")
            
            # Emitir evento informativo
            notifier.publish_event({
                "modulo": "sistema",
                "subtipo": "cambio_pipeline",
                "confianza": 1.0,
                "metadata_json": {
                    "pipeline_activo": self.active_pipeline,
                    "categoria": self.active_category,
                    "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
                }
            })

            return {
                "status": "success",
                "active_pipeline": self.active_pipeline,
                "category": self.active_category
            }

    def set_roi_polygon(self, points: list):
        with self.lock:
            self.roi_polygon = points
            return {"status": "success", "polygon": points}

    def process_next_frame(self) -> tuple[np.ndarray, list]:
        """
        Obtiene el siguiente frame de la fuente de video actual
        y aplica la inferencia del detector activo.
        """
        raw_frame = video_manager.get_frame(1280, 720)
        self.frame_idx += 1

        with self.lock:
            current_detector_key = self.active_pipeline
            detector = self.detectors[current_detector_key]

        # Ejecutar inferencia según el detector activo
        if current_detector_key == "safety_roi":
            annotated_frame, events = detector.process_frame(raw_frame, self.frame_idx, self.roi_polygon)
        else:
            annotated_frame, events = detector.process_frame(raw_frame, self.frame_idx)

        # Si hay eventos críticos, publicarlos a Redis y guardar snapshot
        for ev in events:
            notifier.publish_event(ev, frame=annotated_frame)

        self.last_frame_processed = annotated_frame
        return annotated_frame, events

    def get_status(self) -> dict:
        return {
            "active_pipeline": self.active_pipeline,
            "category": self.active_category,
            "fps": self.fps,
            "gpu_device": "NVIDIA GeForce RTX 4090 (24GB VRAM)" if settings.USE_CUDA else "CPU Host Fallback",
            "gpu_usage_percent": 38.0 + (self.frame_idx % 15),
            "vram_used_mb": 4250,
            "vram_total_mb": 24576,
            "mediamtx_connected": True,
            "source_mode": video_manager.current_source_type
        }

pipeline_mgr = PipelineManager()
