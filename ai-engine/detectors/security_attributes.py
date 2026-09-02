import time
import cv2
import numpy as np

from yolo_engine import yolo_engine


class PhysicalAttributesDetector:
    """
    Detector de Características Físicas y Atributos de Persona.
    Utiliza YOLO para detectar personas reales y segmentación HSV
    para extraer colores dominantes de ropa (prenda superior e inferior)
    y estimar complexión por proporción del bounding box.
    """
    def __init__(self):
        self.last_alert_time = 0
        self.alert_cooldown = 5.0

        # Mapa de colores HSV a nombres legibles
        self.color_ranges = [
            {"name": "Rojo",       "lower": np.array([0, 80, 80]),    "upper": np.array([10, 255, 255])},
            {"name": "Rojo",       "lower": np.array([160, 80, 80]),  "upper": np.array([180, 255, 255])},
            {"name": "Naranja",    "lower": np.array([10, 80, 80]),   "upper": np.array([22, 255, 255])},
            {"name": "Amarillo",   "lower": np.array([22, 80, 80]),   "upper": np.array([38, 255, 255])},
            {"name": "Verde",      "lower": np.array([38, 50, 50]),   "upper": np.array([85, 255, 255])},
            {"name": "Azul",       "lower": np.array([85, 50, 50]),   "upper": np.array([130, 255, 255])},
            {"name": "Morado",     "lower": np.array([130, 50, 50]),  "upper": np.array([160, 255, 255])},
            {"name": "Blanco",     "lower": np.array([0, 0, 180]),    "upper": np.array([180, 40, 255])},
            {"name": "Gris",       "lower": np.array([0, 0, 80]),     "upper": np.array([180, 40, 180])},
            {"name": "Negro",      "lower": np.array([0, 0, 0]),      "upper": np.array([180, 255, 60])},
        ]

    def _get_dominant_color(self, crop: np.ndarray) -> tuple[str, float]:
        """Determina el color dominante de un crop de imagen usando HSV."""
        if crop is None or crop.size == 0 or crop.shape[0] < 5 or crop.shape[1] < 5:
            return "Indeterminado", 0.0

        try:
            hsv = cv2.cvtColor(crop, cv2.COLOR_BGR2HSV)
        except Exception:
            return "Indeterminado", 0.0

        total = hsv.shape[0] * hsv.shape[1]
        best_name = "Indeterminado"
        best_ratio = 0.0

        for cr in self.color_ranges:
            mask = cv2.inRange(hsv, cr["lower"], cr["upper"])
            ratio = cv2.countNonZero(mask) / max(total, 1)
            if ratio > best_ratio:
                best_ratio = ratio
                best_name = cr["name"]

        return best_name, round(best_ratio, 3)

    def _estimate_build(self, w: int, h: int) -> str:
        """Estima complexión por aspect ratio del bounding box."""
        if h == 0:
            return "Indeterminada"
        ratio = w / h
        if ratio > 0.50:
            return "Robusta"
        elif ratio > 0.38:
            return "Media"
        else:
            return "Delgada"

    def _estimate_height(self, bbox_h: int, frame_h: int) -> str:
        """Estimación burda de altura basada en proporción del frame."""
        # Heurística: si la persona ocupa >60% del frame vertical ~1.80m
        ratio = bbox_h / max(frame_h, 1)
        if ratio > 0.65:
            return "~1.80+ m"
        elif ratio > 0.50:
            return "~1.70-1.80 m"
        elif ratio > 0.35:
            return "~1.60-1.70 m"
        else:
            return "~1.50-1.60 m"

    def process_frame(self, frame: np.ndarray, frame_idx: int = 0):
        h, w = frame.shape[:2]
        events = []
        annotated = frame.copy()

        # Detectar personas reales
        persons = yolo_engine.detect_persons(frame, frame_id=frame_idx, conf=0.30)

        for idx, det in enumerate(persons):
            x1, y1, x2, y2 = det["x1"], det["y1"], det["x2"], det["y2"]
            person_h = y2 - y1
            person_w = x2 - x1
            name = f"SUJETO {idx + 1:02d}"

            # Crop torso superior (25%-55% del bbox)
            upper_y1 = y1 + int(person_h * 0.25)
            upper_y2 = y1 + int(person_h * 0.55)
            upper_crop = frame[max(0, upper_y1):min(h, upper_y2), max(0, x1):min(w, x2)]
            upper_color, upper_conf = self._get_dominant_color(upper_crop)

            # Crop inferior (55%-90% del bbox)
            lower_y1 = y1 + int(person_h * 0.55)
            lower_y2 = y1 + int(person_h * 0.90)
            lower_crop = frame[max(0, lower_y1):min(h, lower_y2), max(0, x1):min(w, x2)]
            lower_color, lower_conf = self._get_dominant_color(lower_crop)

            # Estimaciones
            complexion = self._estimate_build(person_w, person_h)
            altura = self._estimate_height(person_h, h)

            self._draw_attributes(
                annotated, x1, y1, person_w, person_h, name,
                upper_color=upper_color, lower_color=lower_color,
                complexion=complexion, altura_est=altura,
                det_conf=det["conf"],
                upper_region=(max(0, x1), max(0, upper_y1), min(w, x2), min(h, upper_y2)),
                lower_region=(max(0, x1), max(0, lower_y1), min(w, x2), min(h, lower_y2)),
            )

        # Publicar evento de registro de atributos
        if persons:
            now = time.time()
            if now - self.last_alert_time > self.alert_cooldown:
                self.last_alert_time = now
                det = persons[0]
                x1, y1, x2, y2 = det["x1"], det["y1"], det["x2"], det["y2"]
                # Re-extract for event
                person_h = y2 - y1
                upper_y1_e = y1 + int(person_h * 0.25)
                upper_y2_e = y1 + int(person_h * 0.55)
                upper_crop_e = frame[max(0, upper_y1_e):min(h, upper_y2_e), max(0, x1):min(w, x2)]
                upper_color_e, _ = self._get_dominant_color(upper_crop_e)
                lower_y1_e = y1 + int(person_h * 0.55)
                lower_y2_e = y1 + int(person_h * 0.90)
                lower_crop_e = frame[max(0, lower_y1_e):min(h, lower_y2_e), max(0, x1):min(w, x2)]
                lower_color_e, _ = self._get_dominant_color(lower_crop_e)

                events.append({
                    "modulo": "security",
                    "subtipo": "extraccion_atributos",
                    "confianza": round(det["conf"], 2),
                    "coordenadas_json": {"x": x1, "y": y1, "w": x2 - x1, "h": y2 - y1},
                    "metadata_json": {
                        "sujeto": "Sujeto #01",
                        "prenda_superior_hsv": upper_color_e,
                        "prenda_inferior_hsv": lower_color_e,
                        "complexion_estimada": self._estimate_build(x2 - x1, y2 - y1),
                        "altura_estimada": self._estimate_height(y2 - y1, h),
                        "timestamp_segmentacion": time.strftime("%H:%M:%S")
                    }
                })
        else:
            cv2.putText(annotated, "SIN PERSONAS DETECTADAS", (int(w * 0.3), int(h * 0.5)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (100, 100, 100), 2)

        cv2.putText(annotated, "MODULO SECURITY: ATRIBUTOS FISICOS (YOLO + HSV REAL)", (20, 35),
                    cv2.FONT_HERSHEY_DUPLEX, 0.65, (0, 244, 237), 2)

        return annotated, events

    def _draw_attributes(self, img, x, y, w, h, name, upper_color, lower_color,
                         complexion, altura_est, det_conf, upper_region, lower_region):
        cv2.rectangle(img, (x, y), (x + w, y + h), (0, 244, 237), 2)

        # Región Superior (Torso) — marcar visualmente
        ux1, uy1, ux2, uy2 = upper_region
        cv2.rectangle(img, (ux1 + 3, uy1), (ux2 - 3, uy2), (255, 180, 0), 1)

        # Región Inferior (Pantalón)
        lx1, ly1, lx2, ly2 = lower_region
        cv2.rectangle(img, (lx1 + 3, ly1), (lx2 - 3, ly2), (200, 200, 200), 1)

        # Panel de Atributos Flotante
        card_x = x + w + 10
        card_w = 230
        card_h = 115
        cv2.rectangle(img, (card_x, y), (card_x + card_w, y + card_h), (20, 30, 40), -1)
        cv2.rectangle(img, (card_x, y), (card_x + card_w, y + card_h), (0, 244, 237), 1)

        cv2.putText(img, f"{name} [{int(det_conf*100)}%]",
                    (card_x + 8, y + 18), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (0, 244, 237), 1)
        cv2.putText(img, f"Prenda Sup: {upper_color}",
                    (card_x + 8, y + 38), cv2.FONT_HERSHEY_SIMPLEX, 0.38, (255, 255, 255), 1)
        cv2.putText(img, f"Prenda Inf: {lower_color}",
                    (card_x + 8, y + 58), cv2.FONT_HERSHEY_SIMPLEX, 0.38, (255, 255, 255), 1)
        cv2.putText(img, f"Complexion: {complexion}",
                    (card_x + 8, y + 78), cv2.FONT_HERSHEY_SIMPLEX, 0.38, (200, 240, 255), 1)
        cv2.putText(img, f"Altura: {altura_est}",
                    (card_x + 8, y + 98), cv2.FONT_HERSHEY_SIMPLEX, 0.38, (200, 240, 255), 1)
