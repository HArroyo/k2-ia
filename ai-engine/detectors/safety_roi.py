import time
import cv2
import numpy as np

from yolo_engine import yolo_engine


class ROIDetector:
    """
    Detector de Permanencia e Invasión en Área Designada (ROI).
    Utiliza YOLO para detección real de personas y cv2.pointPolygonTest
    sobre el punto inferior del bounding box para determinar invasión de zona.
    Calcula tiempos de permanencia por tracking ID simplificado.
    """
    def __init__(self):
        self.last_alert_time = 0
        self.alert_cooldown = 4.0
        self.tracked_dwell_time = {}  # {track_key: frame_count}

    def process_frame(self, frame: np.ndarray, frame_idx: int = 0, roi_polygon: list = None):
        h, w = frame.shape[:2]
        events = []
        annotated = frame.copy()

        # Polígono ROI por defecto si no se pasa uno personalizado
        if not roi_polygon or len(roi_polygon) < 3:
            roi_points = np.array([
                [int(w * 0.45), int(h * 0.40)],
                [int(w * 0.90), int(h * 0.40)],
                [int(w * 0.85), int(h * 0.88)],
                [int(w * 0.40), int(h * 0.88)]
            ], np.int32)
        else:
            roi_points = np.array(roi_polygon, np.int32)

        # Dibujar Zona ROI semitransparente
        overlay = annotated.copy()
        cv2.fillPoly(overlay, [roi_points], (0, 70, 140))
        cv2.polylines(annotated, [roi_points], isClosed=True, color=(0, 244, 237), thickness=2)
        cv2.addWeighted(overlay, 0.25, annotated, 0.75, 0, annotated)

        # Etiqueta de la zona
        cv2.putText(annotated, "[ZONA RESTRINGIDA - AREA PELIGRO MAQUINARIA]",
                    (roi_points[0][0] + 10, roi_points[0][1] + 25),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 244, 237), 2)

        # Detectar personas reales
        persons = yolo_engine.detect_persons(frame, frame_id=frame_idx, conf=0.30)

        # Limpiar tracking keys de personas que ya no están
        active_keys = set()

        for idx, det in enumerate(persons):
            # Crear tracking key basado en posición aproximada (grid 50px)
            grid_x = det["cx"] // 50
            grid_y = det["cy"] // 50
            track_key = f"P-{grid_x}-{grid_y}"
            active_keys.add(track_key)

            # Test de invasión de zona usando punto inferior del bounding box
            bottom_pt = (float(det["cx"]), float(det["y2"]))
            inside_roi = cv2.pointPolygonTest(roi_points, bottom_pt, False) >= 0

            # Dwell time tracking
            if inside_roi:
                self.tracked_dwell_time[track_key] = self.tracked_dwell_time.get(track_key, 0) + 1
            else:
                self.tracked_dwell_time[track_key] = 0

            dwell_seconds = self.tracked_dwell_time.get(track_key, 0) / 15.0  # ~15 fps

            pid = f"ID-{idx + 1:02d}"
            if inside_roi:
                pid += " (INTRUSO)"

            self._draw_tracked_person(
                annotated, det["x1"], det["y1"], det["w"], det["h"],
                pid, inside_roi, dwell_seconds, det["conf"]
            )

            if inside_roi:
                now = time.time()
                if now - self.last_alert_time > self.alert_cooldown:
                    self.last_alert_time = now
                    subtipo = "permanencia_excedida" if dwell_seconds > 5.0 else "invasion_zona"
                    events.append({
                        "modulo": "safety",
                        "subtipo": subtipo,
                        "confianza": round(det["conf"], 2),
                        "coordenadas_json": {"x": det["x1"], "y": det["y1"],
                                             "w": det["w"], "h": det["h"]},
                        "metadata_json": {
                            "sujeto": f"Persona {pid}",
                            "zona_id": "ROI-MAQUINARIA-01",
                            "tiempo_permanencia_seg": round(dwell_seconds, 1),
                            "accion_requerida": "Desalojo Inmediato"
                        }
                    })

        # Limpiar keys inactivas
        for key in list(self.tracked_dwell_time.keys()):
            if key not in active_keys:
                del self.tracked_dwell_time[key]

        cv2.putText(annotated, "MODULO SAFETY: PERMANENCIA EN AREA (ROI) - YOLO REAL", (20, 35),
                    cv2.FONT_HERSHEY_DUPLEX, 0.7, (0, 244, 237), 2)

        return annotated, events

    def _draw_tracked_person(self, img, x, y, w, h, pid, inside_roi, dwell_sec, conf):
        color = (0, 0, 255) if inside_roi else (0, 255, 0)
        cv2.rectangle(img, (x, y), (x + w, y + h), color, 2)

        # Punto inferior del bounding box (anclaje para pointPolygonTest)
        bottom_pt = (x + w // 2, y + h)
        cv2.circle(img, bottom_pt, 6, (0, 244, 237), -1)

        # Etiqueta
        status_text = f"INVASION ({dwell_sec:.1f}s)" if inside_roi else "ZONA SEGURA"
        tag = f"{pid}: {status_text} [{int(conf*100)}%]"
        cv2.rectangle(img, (x, y - 24), (x + len(tag) * 8, y), color, -1)
        cv2.putText(img, tag, (x + 4, y - 7), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1)
