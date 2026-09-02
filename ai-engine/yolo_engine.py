"""
YOLODetectionEngine — Motor de Inferencia YOLO Compartido (Singleton)
=====================================================================
Carga modelos YOLOv8 una sola vez y provee detecciones reales a todos los detectores.
Soporta: detección de personas/objetos, estimación de pose, y detección de vehículos.
Cache por frame_id para evitar re-inferencia cuando múltiples detectores consultan el mismo frame.
"""

import logging
import numpy as np
import cv2

logger = logging.getLogger("k2-yolo-engine")


class YOLODetectionEngine:
    """
    Singleton que gestiona modelos YOLO y provee inferencia compartida.
    """

    def __init__(self):
        self.yolo_detect = None
        self.yolo_pose = None
        self._models_loaded = False
        self._use_gpu = False

        # Cache para evitar re-inferencia del mismo frame
        self._cache_frame_id = -1
        self._cache_detections = []
        self._cache_pose_id = -1
        self._cache_pose_results = []

        self._load_models()

    def _load_models(self):
        """Carga YOLOv8 nano para detección y pose. Fallback a CPU si no hay GPU."""
        try:
            from ultralytics import YOLO
            import torch

            device = "cuda" if torch.cuda.is_available() else "cpu"
            self._use_gpu = device == "cuda"

            logger.info(f"Cargando modelos YOLO en dispositivo: {device}")

            # Modelo de detección general (personas, vehículos, objetos)
            self.yolo_detect = YOLO("yolov8n.pt")
            self.yolo_detect.to(device)

            # Modelo de estimación de pose (keypoints anatómicos)
            self.yolo_pose = YOLO("yolov8n-pose.pt")
            self.yolo_pose.to(device)

            self._models_loaded = True
            logger.info("Modelos YOLO cargados exitosamente")

        except ImportError:
            logger.warning("ultralytics no disponible. Los detectores operarán con OpenCV HOG como fallback.")
            self._models_loaded = False
        except Exception as e:
            logger.error(f"Error cargando modelos YOLO: {e}")
            self._models_loaded = False

    # -------------------------------------------------------------------------
    # API pública de detección
    # -------------------------------------------------------------------------

    def detect_persons(self, frame: np.ndarray, frame_id: int = -1,
                       conf: float = 0.30) -> list[dict]:
        """
        Detecta personas en el frame.
        Retorna lista de dicts: {x1, y1, x2, y2, w, h, conf, cx, cy}
        """
        all_dets = self.detect_all(frame, frame_id=frame_id, conf=conf)
        return [d for d in all_dets if d["class_id"] == 0]  # class 0 = person

    def detect_vehicles(self, frame: np.ndarray, frame_id: int = -1,
                        conf: float = 0.30) -> list[dict]:
        """
        Detecta vehículos: car(2), motorcycle(3), bus(5), truck(7).
        """
        vehicle_classes = {2, 3, 5, 7}
        all_dets = self.detect_all(frame, frame_id=frame_id, conf=conf)
        return [d for d in all_dets if d["class_id"] in vehicle_classes]

    def detect_all(self, frame: np.ndarray, frame_id: int = -1,
                   conf: float = 0.30) -> list[dict]:
        """
        Detección general de todos los objetos COCO.
        Cache por frame_id para evitar re-inferencia.
        """
        # Retornar cache si el frame ya fue procesado
        if frame_id >= 0 and frame_id == self._cache_frame_id:
            return self._cache_detections

        detections = []

        # 1. Intentar con YOLO
        if self._models_loaded and self.yolo_detect is not None:
            try:
                results = self.yolo_detect(frame, conf=conf, verbose=False)
                for r in results:
                    if r.boxes is not None:
                        for box in r.boxes:
                            x1, y1, x2, y2 = box.xyxy[0].cpu().numpy().astype(int)
                            c = float(box.conf[0])
                            cls_id = int(box.cls[0])
                            cls_name = self.yolo_detect.names.get(cls_id, str(cls_id))
                            detections.append({
                                "x1": int(x1), "y1": int(y1),
                                "x2": int(x2), "y2": int(y2),
                                "w": int(x2 - x1), "h": int(y2 - y1),
                                "cx": int((x1 + x2) / 2), "cy": int((y1 + y2) / 2),
                                "conf": round(c, 3),
                                "class_id": cls_id,
                                "class_name": cls_name,
                            })
            except Exception as e:
                logger.error(f"Error en YOLO detect: {e}")

        # 2. Fallback a OpenCV HOG solo para personas
        if not detections:
            detections = self._hog_fallback(frame)

        # Guardar en cache
        if frame_id >= 0:
            self._cache_frame_id = frame_id
            self._cache_detections = detections

        return detections

    def estimate_pose(self, frame: np.ndarray, frame_id: int = -1,
                      conf: float = 0.30) -> list[dict]:
        """
        Estimación de pose con keypoints COCO (17 puntos).
        Retorna lista de dicts: {x1, y1, x2, y2, conf, keypoints: np.array(17,3)}
        
        Keypoints COCO:
        0=nose, 1=left_eye, 2=right_eye, 3=left_ear, 4=right_ear,
        5=left_shoulder, 6=right_shoulder, 7=left_elbow, 8=right_elbow,
        9=left_wrist, 10=right_wrist, 11=left_hip, 12=right_hip,
        13=left_knee, 14=right_knee, 15=left_ankle, 16=right_ankle
        """
        if frame_id >= 0 and frame_id == self._cache_pose_id:
            return self._cache_pose_results

        pose_results = []

        if self._models_loaded and self.yolo_pose is not None:
            try:
                results = self.yolo_pose(frame, conf=conf, verbose=False)
                for r in results:
                    if r.boxes is not None and r.keypoints is not None:
                        for i, box in enumerate(r.boxes):
                            x1, y1, x2, y2 = box.xyxy[0].cpu().numpy().astype(int)
                            c = float(box.conf[0])
                            kps = r.keypoints.data[i].cpu().numpy()  # (17, 3) -> x, y, conf
                            pose_results.append({
                                "x1": int(x1), "y1": int(y1),
                                "x2": int(x2), "y2": int(y2),
                                "w": int(x2 - x1), "h": int(y2 - y1),
                                "conf": round(c, 3),
                                "keypoints": kps,
                            })
            except Exception as e:
                logger.error(f"Error en YOLO pose: {e}")

        if frame_id >= 0:
            self._cache_pose_id = frame_id
            self._cache_pose_results = pose_results

        return pose_results

    # -------------------------------------------------------------------------
    # Fallback HOG
    # -------------------------------------------------------------------------

    def _hog_fallback(self, frame: np.ndarray) -> list[dict]:
        """Detección de personas con OpenCV HOG como último recurso."""
        detections = []
        try:
            hog = cv2.HOGDescriptor()
            hog.setSVMDetector(cv2.HOGDescriptor_getDefaultPeopleDetector())
            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            boxes, weights = hog.detectMultiScale(
                gray, winStride=(8, 8), padding=(4, 4), scale=1.05
            )
            for (x, y, bw, bh), weight in zip(boxes, weights):
                if weight > 0.3:
                    detections.append({
                        "x1": int(x), "y1": int(y),
                        "x2": int(x + bw), "y2": int(y + bh),
                        "w": int(bw), "h": int(bh),
                        "cx": int(x + bw / 2), "cy": int(y + bh / 2),
                        "conf": round(float(weight), 3),
                        "class_id": 0,
                        "class_name": "person",
                    })
        except Exception as e:
            logger.warning(f"HOG fallback falló: {e}")
        return detections

    # -------------------------------------------------------------------------
    # Estado
    # -------------------------------------------------------------------------

    def get_status(self) -> dict:
        return {
            "models_loaded": self._models_loaded,
            "gpu_active": self._use_gpu,
            "detection_model": "yolov8n.pt" if self._models_loaded else "HOG fallback",
            "pose_model": "yolov8n-pose.pt" if (self._models_loaded and self.yolo_pose) else "none",
        }


# Instancia global singleton
yolo_engine = YOLODetectionEngine()
