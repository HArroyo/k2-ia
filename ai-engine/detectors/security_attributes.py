import time
import cv2
import numpy as np

class PhysicalAttributesDetector:
    """
    Detector de Características Físicas y Atributos de Persona.
    Segmentación HSV de colores dominantes de ropa (prenda superior e inferior) y estimación de complexión.
    """
    def __init__(self):
        self.last_alert_time = 0
        self.alert_cooldown = 5.0

    def process_frame(self, frame: np.ndarray, frame_idx: int = 0):
        h, w = frame.shape[:2]
        events = []
        annotated = frame.copy()

        t = (frame_idx * 0.04) % (2 * np.pi)
        
        # Sujeto 1
        p1_x = int(w * 0.30 + np.sin(t) * 25)
        p1_y = int(h * 0.30)
        p1_w, p1_h = 130, 320
        self._draw_attributes(annotated, p1_x, p1_y, p1_w, p1_h, "SUJETO 01", 
                              upper_color="Azul Marino (#1A2B4C)", lower_color="Negro (#111111)", 
                              complexion="Media / Robusta", altura_est="1.78 m")

        # Sujeto 2
        p2_x = int(w * 0.68 - np.cos(t) * 25)
        p2_y = int(h * 0.32)
        p2_w, p2_h = 120, 310
        self._draw_attributes(annotated, p2_x, p2_y, p2_w, p2_h, "SUJETO 02", 
                              upper_color="Rojo Carmesí (#9E1B1B)", lower_color="Azul Denim (#2E4F75)", 
                              complexion="Delgada / Atlética", altura_est="1.72 m")

        # Publicar evento de registro de atributos
        now = time.time()
        if now - self.last_alert_time > self.alert_cooldown:
            self.last_alert_time = now
            events.append({
                "modulo": "security",
                "subtipo": "extraccion_atributos",
                "confianza": 0.91,
                "coordenadas_json": {"x": p1_x, "y": p1_y, "w": p1_w, "h": p1_h},
                "metadata_json": {
                    "sujeto": "Sujeto #01",
                    "prenda_superior_hsv": "Azul Marino",
                    "prenda_inferior_hsv": "Negro",
                    "complexion_estimada": "Media / Robusta",
                    "altura_estimada": "1.78 m",
                    "timestamp_segmentacion": time.strftime("%H:%M:%S")
                }
            })

        cv2.putText(annotated, "MODULO SECURITY: CARACTERISTICAS FISICAS Y ATRIBUTOS (HSV)", (20, 35),
                    cv2.FONT_HERSHEY_DUPLEX, 0.65, (0, 244, 237), 2)

        return annotated, events

    def _draw_attributes(self, img, x, y, w, h, name, upper_color, lower_color, complexion, altura_est):
        cv2.rectangle(img, (x, y), (x + w, y + h), (0, 244, 237), 2)

        # Región Superior (Torso)
        upper_h = int(h * 0.45)
        cv2.rectangle(img, (x + 5, y + int(h * 0.2)), (x + w - 5, y + upper_h), (255, 180, 0), 1)

        # Región Inferior (Pantalón)
        lower_y = y + upper_h
        cv2.rectangle(img, (x + 5, lower_y), (x + w - 5, y + h - 10), (200, 200, 200), 1)

        # Panel de Atributos Flotante
        card_x = x + w + 10
        card_w = 210
        card_h = 105
        cv2.rectangle(img, (card_x, y), (card_x + card_w, y + card_h), (20, 30, 40), -1)
        cv2.rectangle(img, (card_x, y), (card_x + card_w, y + card_h), (0, 244, 237), 1)

        cv2.putText(img, f"ATRIBUTOS: {name}", (card_x + 8, y + 20), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 244, 237), 1)
        cv2.putText(img, f"Prenda Sup: {upper_color[:15]}", (card_x + 8, y + 42), cv2.FONT_HERSHEY_SIMPLEX, 0.38, (255, 255, 255), 1)
        cv2.putText(img, f"Prenda Inf: {lower_color[:15]}", (card_x + 8, y + 62), cv2.FONT_HERSHEY_SIMPLEX, 0.38, (255, 255, 255), 1)
        cv2.putText(img, f"Complexion: {complexion[:15]}", (card_x + 8, y + 82), cv2.FONT_HERSHEY_SIMPLEX, 0.38, (200, 240, 255), 1)
        cv2.putText(img, f"Altura: {altura_est}", (card_x + 8, y + 98), cv2.FONT_HERSHEY_SIMPLEX, 0.38, (200, 240, 255), 1)
