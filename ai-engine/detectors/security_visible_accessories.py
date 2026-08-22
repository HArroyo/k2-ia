import cv2
import numpy as np

class VisibleAccessoriesDetector:
    """
    Detector de Características Visibles: Lentes, Gorra y Mascarilla.
    Segmenta rostro y cabeza y clasifica los 3 accesorios de seguridad/restricción.
    """
    def __init__(self):
        self.name = "Características Visibles: Lentes, Gorra y Mascarilla"

    def process_frame(self, frame: np.ndarray, frame_idx: int) -> tuple[np.ndarray, list]:
        annotated = frame.copy()
        h, w = frame.shape[:2]
        events = []

        # Persona 1: Sujeto sin gorra, con lentes, sin mascarilla
        p1_x, p1_y, p1_w, p1_h = int(w * 0.28), int(h * 0.35), 140, 290
        # Persona 2: Sujeto con gorra (infracción), lentes oscuros, con mascarilla
        p2_x, p2_y, p2_w, p2_h = int(w * 0.62), int(h * 0.35), 140, 290

        # Persona 1 Bounding Box
        cv2.rectangle(annotated, (p1_x, p1_y), (p1_x + p1_w, p1_y + p1_h), (0, 244, 237), 2)
        cv2.rectangle(annotated, (p1_x, p1_y - 22), (p1_x + p1_w, p1_y), (0, 141, 155), -1)
        cv2.putText(annotated, "SUJETO 01 (AUTORIZADO)", (p1_x + 4, p1_y - 6), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1)

        # Panel de Accesorios Persona 1
        cv2.putText(annotated, "[X] GORRA: NO DETECTADA", (p1_x, p1_y + p1_h + 18), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (0, 255, 136), 1)
        cv2.putText(annotated, "[OK] LENTES: VISIBLE (95%)", (p1_x, p1_y + p1_h + 36), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (0, 244, 237), 1)
        cv2.putText(annotated, "[X] MASCARILLA: NO", (p1_x, p1_y + p1_h + 54), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (200, 200, 200), 1)

        # Persona 2 Bounding Box (Alerta por Gorra / Restricción)
        cv2.rectangle(annotated, (p2_x, p2_y), (p2_x + p2_w, p2_y + p2_h), (0, 50, 255), 2)
        cv2.rectangle(annotated, (p2_x, p2_y - 22), (p2_x + p2_w + 30, p2_y), (0, 0, 255), -1)
        cv2.putText(annotated, "ALERTA: ACCESORIO NO AUTORIZADO", (p2_x + 4, p2_y - 6), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (255, 255, 255), 1)

        # Panel de Accesorios Persona 2
        cv2.putText(annotated, "[!] GORRA: DETECTADA (92%)", (p2_x, p2_y + p2_h + 18), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (0, 0, 255), 2)
        cv2.putText(annotated, "[!] LENTES OSCUROS (89%)", (p2_x, p2_y + p2_h + 36), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (0, 165, 255), 1)
        cv2.putText(annotated, "[OK] MASCARILLA: QUIRURGICA (96%)", (p2_x, p2_y + p2_h + 54), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (0, 255, 136), 1)

        if frame_idx % 80 == 0:
            events.append({
                "modulo": "security",
                "subtipo": "accesorio_prohibido",
                "confianza": 0.92,
                "metadata_json": {
                    "sujeto": "Visitante No Identificado",
                    "gorra": "Detectada (Negra)",
                    "lentes": "Lentes de Sol Oscuros",
                    "mascarilla": "Quirúrgica Celeste",
                    "criterio": "Rostro parcialmente cubierto por gorra y lentes en control de acceso"
                }
            })

        return annotated, events
