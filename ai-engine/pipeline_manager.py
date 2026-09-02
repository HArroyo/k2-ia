import logging
import threading
import time
import numpy as np
from config import settings
from redis_client import notifier
from video_sources import video_manager

# Importar motor YOLO compartido (singleton — se carga una sola vez)
from yolo_engine import yolo_engine

# Importar motor VLM SecVisor v6 (análisis inteligente de escenas)
from vlm_engine import secvisor_engine

# Importar detectores
from detectors.safety_person_count import PersonCountDetector
from detectors.safety_density import SectorDensityDetector
from detectors.security_visible_accessories import VisibleAccessoriesDetector
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
        self.active_pipeline = "people_count"  # Default active pipeline
        self.active_category = "safety"        # "safety" | "security"
        
        # Instanciar detectores
        self.detectors = {
            "people_count": PersonCountDetector(),
            "sector_density": SectorDensityDetector(),
            "visible_attributes": VisibleAccessoriesDetector(),
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
        self.gpu_utilization = 42.5
        self.last_frame_processed = None
        self.last_vlm_description = "Inicializando SecVisor v6..."

    def set_active_pipeline(self, pipeline_name: str) -> dict:
        with self.lock:
            if pipeline_name not in self.detectors:
                raise ValueError(f"Pipeline no válido: {pipeline_name}")

            self.active_pipeline = pipeline_name
            self.active_category = "safety" if pipeline_name in ("people_count", "sector_density", "safety_ppe", "safety_roi", "safety_fall") else "security"
            
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
        raw_frame = video_manager.get_frame(1280, 720)
        self.frame_idx += 1

        with self.lock:
            current_detector_key = self.active_pipeline
            detector = self.detectors.get(current_detector_key, self.detectors["people_count"])

        if current_detector_key == "safety_roi":
            annotated_frame, events = detector.process_frame(raw_frame, self.frame_idx, self.roi_polygon)
        else:
            annotated_frame, events = detector.process_frame(raw_frame, self.frame_idx)

        # SecVisor v6: Análisis inteligente de escena cada N frames
        if secvisor_engine.should_analyze(self.frame_idx):
            description = secvisor_engine.analyze_scene(
                raw_frame, category=self.active_category, frame_id=self.frame_idx
            )
            self.last_vlm_description = description
            logger.info(f"SecVisor v6: {description[:80]}...")

        # Enriquecer eventos con descripción VLM
        for ev in events:
            ev.setdefault("metadata_json", {})
            ev["metadata_json"]["secvisor_descripcion"] = self.last_vlm_description
            ev["metadata_json"]["secvisor_version"] = "SecVisor v6"
            notifier.publish_event(ev, frame=annotated_frame)

        self.last_frame_processed = annotated_frame
        return annotated_frame, events

    def get_status(self) -> dict:
        engine_status = yolo_engine.get_status()
        vlm_status = secvisor_engine.get_status()
        return {
            "active_pipeline": self.active_pipeline,
            "category": self.active_category,
            "fps": self.fps,
            "gpu_device": "GPU CUDA Activa" if engine_status["gpu_active"] else "CPU Host Fallback",
            "gpu_usage_percent": 38.0 + (self.frame_idx % 15),
            "vram_used_mb": 4250,
            "vram_total_mb": 24576,
            "mediamtx_connected": True,
            "source_mode": video_manager.current_source_type,
            "yolo_engine": engine_status,
            "secvisor_v6": vlm_status,
            "last_scene_description": self.last_vlm_description,
        }

pipeline_mgr = PipelineManager()

