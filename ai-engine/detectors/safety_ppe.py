import time
import cv2
import numpy as np

class PPEDetector:
    """
    Detector de Casco y Chaleco (Safety EPP).
    Verifica que el tercio superior de la persona contenga casco y el tercio medio chaleco.
    """
    def __init__(self):
        self.last_alert_time = 0
        self.alert_cooldown = 4.0  # seconds

    def process_frame(self, frame: np.ndarray, frame_idx: int = 0):
        """
        Analiza el frame para detectar personas, cascos y chalecos.
        Retorna: frame_anotado, lista_eventos
        """
        h, w = frame.shape[:2]
        events = []
        annotated = frame.copy()

        # Simulación de detección o inferencia YOLO
        # Generamos bounding boxes dinámicas según el frame para testing / demo
        t = (frame_idx * 0.05) % (2 * np.pi)
        
        # Trabajador 1 (Cumple EPP)
        p1_x = int(w * 0.25 + np.sin(t) * 30)
        p1_y = int(h * 0.35)
        p1_w, p1_h = 140, 320
        self._draw_worker(annotated, p1_x, p1_y, p1_w, p1_h, has_helmet=True, has_vest=True, worker_id="TRAB-101")

        # Trabajador 2 (Infracción: Sin Casco ni Chaleco o Sin Casco)
        p2_x = int(w * 0.65 - np.cos(t) * 40)
        p2_y = int(h * 0.38)
        p2_w, p2_h = 130, 300
        has_helmet = (frame_idx // 120) % 2 == 0
        has_vest = False

        status, sub_alert = self._draw_worker(annotated, p2_x, p2_y, p2_w, p2_h, 
                                             has_helmet=has_helmet, has_vest=has_vest, 
                                             worker_id="TRAB-102")

        if not has_helmet or not has_vest:
            now = time.time()
            if now - self.last_alert_time > self.alert_cooldown:
                self.last_alert_time = now
                subtipo = "sin_casco" if not has_helmet and has_vest else ("sin_chaleco" if has_helmet and not has_vest else "sin_epp_completo")
                missing = []
                if not has_helmet: missing.append("Casco")
                if not has_vest: missing.append("Chaleco")
                
                events.append({
                    "modulo": "safety",
                    "subtipo": subtipo,
                    "confianza": 0.94,
                    "coordenadas_json": {"x": p2_x, "y": p2_y, "w": p2_w, "h": p2_h},
                    "metadata_json": {
                        "sujeto": "Operador #102",
                        "faltante": ", ".join(missing),
                        "zona": "Área de Carga y Descarga",
                        "nivel_riesgo": "ALTO"
                    }
                })

        # Overlay de estado en el frame
        cv2.putText(annotated, "MODULO SAFETY: DETECCION CASCO Y CHALECO (EPP)", (20, 35),
                    cv2.FONT_HERSHEY_DUPLEX, 0.7, (0, 244, 237), 2)
        
        return annotated, events

    def _draw_worker(self, img, x, y, w, h, has_helmet, has_vest, worker_id):
        # Bounding box persona
        is_ok = has_helmet and has_vest
        box_color = (0, 244, 237) if is_ok else (0, 0, 255) # Neon Turquoise or Red
        cv2.rectangle(img, (x, y), (x + w, y + h), box_color, 2)
        
        # Tercio superior (Casco)
        top_third_h = int(h * 0.33)
        helm_color = (0, 255, 0) if has_helmet else (0, 0, 255)
        helm_label = "CASCO: OK" if has_helmet else "SIN CASCO"
        cv2.rectangle(img, (x + 10, y + 5), (x + w - 10, y + top_third_h - 10), helm_color, 2)
        cv2.putText(img, helm_label, (x + 12, y + 25), cv2.FONT_HERSHEY_SIMPLEX, 0.45, helm_color, 1)

        # Tercio medio (Chaleco)
        mid_third_y = y + top_third_h
        mid_third_h = int(h * 0.37)
        vest_color = (0, 255, 0) if has_vest else (0, 0, 255)
        vest_label = "CHALECO: OK" if has_vest else "SIN CHALECO"
        cv2.rectangle(img, (x + 10, mid_third_y), (x + w - 10, mid_third_y + mid_third_h), vest_color, 2)
        cv2.putText(img, vest_label, (x + 12, mid_third_y + 20), cv2.FONT_HERSHEY_SIMPLEX, 0.45, vest_color, 1)

        # Etiqueta de ID
        tag = f"{worker_id} | {'EPP VALIDO' if is_ok else 'INFRACCION EPP'}"
        cv2.rectangle(img, (x, y - 22), (x + len(tag)*9, y), box_color, -1)
        cv2.putText(img, tag, (x + 5, y - 6), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 0, 0), 1)

        return is_ok, "infraccion" if not is_ok else "ok"
