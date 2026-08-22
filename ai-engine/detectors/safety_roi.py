import time
import cv2
import numpy as np

class ROIDetector:
    """
    Detector de Permanencia e Invasión en Área Designada (ROI).
    Utiliza cv2.pointPolygonTest sobre el punto inferior del Bounding Box y calcula tiempos de permanencia.
    """
    def __init__(self):
        self.last_alert_time = 0
        self.alert_cooldown = 4.0
        self.tracked_dwell_time = {}

    def process_frame(self, frame: np.ndarray, frame_idx: int = 0, roi_polygon: list = None):
        h, w = frame.shape[:2]
        events = []
        annotated = frame.copy()

        # Polígono ROI por defecto (Zona Restringida) si no se pasa uno personalizado
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
        cv2.fillPoly(overlay, [roi_points], (0, 70, 140)) # Fondo zona
        cv2.polylines(annotated, [roi_points], isClosed=True, color=(0, 244, 237), thickness=2)
        cv2.addWeighted(overlay, 0.25, annotated, 0.75, 0, annotated)

        # Etiqueta de la zona
        cv2.putText(annotated, "[ZONA RESTRINGIDA - AREA PELIGRO MAQUINARIA]", 
                    (roi_points[0][0] + 10, roi_points[0][1] + 25),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 244, 237), 2)

        # Simular personas caminando
        t = (frame_idx * 0.03) % (2 * np.pi)
        
        # Persona 1: Camina fuera de la zona (segura)
        p1_x = int(w * 0.15 + np.sin(t) * 20)
        p1_y = int(h * 0.45)
        p1_w, p1_h = 100, 240
        p1_bottom = (p1_x + p1_w // 2, p1_y + p1_h)
        inside1 = cv2.pointPolygonTest(roi_points, p1_bottom, False) >= 0
        self._draw_tracked_person(annotated, p1_x, p1_y, p1_w, p1_h, "ID-01", inside1, 0)

        # Persona 2: Ingresa a la zona restringida
        p2_x = int(w * 0.52 + np.cos(t) * 50)
        p2_y = int(h * 0.48)
        p2_w, p2_h = 110, 260
        p2_bottom = (p2_x + p2_w // 2, p2_y + p2_h)
        inside2 = cv2.pointPolygonTest(roi_points, p2_bottom, False) >= 0
        
        # Dwell time tracking
        if inside2:
            self.tracked_dwell_time["ID-02"] = self.tracked_dwell_time.get("ID-02", 0) + 1
        else:
            self.tracked_dwell_time["ID-02"] = 0
            
        dwell_seconds = self.tracked_dwell_time["ID-02"] / 15.0  # Approx 15 fps
        self._draw_tracked_person(annotated, p2_x, p2_y, p2_w, p2_h, "ID-02 (INTRUSO)", inside2, dwell_seconds)

        if inside2:
            now = time.time()
            if now - self.last_alert_time > self.alert_cooldown:
                self.last_alert_time = now
                subtipo = "permanencia_excedida" if dwell_seconds > 5.0 else "invasion_zona"
                events.append({
                    "modulo": "safety",
                    "subtipo": subtipo,
                    "confianza": 0.98,
                    "coordenadas_json": {"x": p2_x, "y": p2_y, "w": p2_w, "h": p2_h},
                    "metadata_json": {
                        "sujeto": "Persona ID-02",
                        "zona_id": "ROI-MAQUINARIA-01",
                        "tiempo_permanencia_seg": round(dwell_seconds, 1),
                        "accion_requerida": "Desalojo Inmediato"
                    }
                })

        cv2.putText(annotated, "MODULO SAFETY: PERMANENCIA EN AREA DESIGNADA (ROI)", (20, 35),
                    cv2.FONT_HERSHEY_DUPLEX, 0.7, (0, 244, 237), 2)
        
        return annotated, events

    def _draw_tracked_person(self, img, x, y, w, h, pid, inside_roi, dwell_sec):
        color = (0, 0, 255) if inside_roi else (0, 255, 0)
        cv2.rectangle(img, (x, y), (x + w, y + h), color, 2)

        # Punto inferior del bounding box (anclaje para pointPolygonTest)
        bottom_pt = (x + w // 2, y + h)
        cv2.circle(img, bottom_pt, 6, (0, 244, 237), -1)

        # Etiqueta
        status_text = f"INVASION ({dwell_sec:.1f}s)" if inside_roi else "ZONA SEGURA"
        tag = f"{pid}: {status_text}"
        cv2.rectangle(img, (x, y - 24), (x + len(tag) * 9, y), color, -1)
        cv2.putText(img, tag, (x + 4, y - 7), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (255, 255, 255), 1)
