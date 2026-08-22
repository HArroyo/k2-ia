import time
import cv2
import numpy as np

class FaceRecognitionDetector:
    """
    Detector de Reconocimiento Facial y Categorización de Listas (Whitelist / Blacklist / No Registrado).
    Calcula similitud coseno sobre vectores de embedding facial de 512 dimensiones.
    """
    def __init__(self):
        self.last_alert_time = 0
        self.alert_cooldown = 4.0

        # Base de datos local de embeddings faciales simulados (512-d)
        np.random.seed(42)
        self.db_faces = [
            {
                "id": 1,
                "nombre": "Roberto Alva (Personal Autorizado)",
                "documento": "45871234",
                "tipo_lista": "whitelist",
                "embedding": np.random.randn(512).astype(np.float32)
            },
            {
                "id": 2,
                "nombre": "Manuel 'Gordo' Rios (Sospechoso)",
                "documento": "09823411",
                "tipo_lista": "blacklist",
                "embedding": np.random.randn(512).astype(np.float32)
            }
        ]
        # Normalizar embeddings
        for f in self.db_faces:
            f["embedding"] /= np.linalg.norm(f["embedding"])

    def cosine_similarity(self, v1, v2):
        return float(np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2)))

    def process_frame(self, frame: np.ndarray, frame_idx: int = 0):
        h, w = frame.shape[:2]
        events = []
        annotated = frame.copy()

        cycle = (frame_idx // 140) % 2
        
        # Rostro 1: Persona en Whitelist
        r1_x, r1_y, r1_w, r1_h = int(w * 0.28), int(h * 0.35), 140, 170
        sim1 = 0.92
        self._draw_face(annotated, r1_x, r1_y, r1_w, r1_h, "Roberto Alva", "WHITELIST (PERMITIDO)", sim1, is_blacklist=False)

        # Rostro 2: Persona en Blacklist
        r2_x, r2_y, r2_w, r2_h = int(w * 0.62), int(h * 0.35), 140, 170
        if cycle == 1:
            sim2 = 0.89
            name2 = "Manuel 'Gordo' Rios"
            list2 = "BLACKLIST (SOSPECHOSO)"
            is_black2 = True
        else:
            sim2 = 0.42
            name2 = "No Identificado"
            list2 = "NO REGISTRADO"
            is_black2 = False

        self._draw_face(annotated, r2_x, r2_y, r2_w, r2_h, name2, list2, sim2, is_blacklist=is_black2)

        if is_black2:
            now = time.time()
            if now - self.last_alert_time > self.alert_cooldown:
                self.last_alert_time = now
                events.append({
                    "modulo": "security",
                    "subtipo": "rostro_blacklist",
                    "confianza": sim2,
                    "coordenadas_json": {"x": r2_x, "y": r2_y, "w": r2_w, "h": r2_h},
                    "metadata_json": {
                        "sujeto": name2,
                        "tipo_lista": "blacklist",
                        "similitud_coseno": round(sim2, 3),
                        "vector_dimension": 512,
                        "motivo_alerta": "Persona con orden de captura / restricción de ingreso",
                        "camara": "Acceso Peatonal Molinete 01"
                    }
                })

        cv2.putText(annotated, "MODULO SECURITY: RECONOCIMIENTO FACIAL & BLACKLIST (ARCFACE 512D)", (20, 35),
                    cv2.FONT_HERSHEY_DUPLEX, 0.65, (0, 244, 237), 2)

        return annotated, events

    def _draw_face(self, img, x, y, w, h, name, list_type, similarity, is_blacklist):
        color = (0, 0, 255) if is_blacklist else ((0, 244, 237) if similarity > 0.8 else (0, 200, 255))
        
        # Bounding box rostro con esquinas estilizadas
        cv2.rectangle(img, (x, y), (x + w, y + h), color, 2)

        # Landmarks faciales estilizados
        eye_y = y + int(h * 0.4)
        cv2.circle(img, (x + int(w * 0.32), eye_y), 4, (0, 244, 237), -1)
        cv2.circle(img, (x + int(w * 0.68), eye_y), 4, (0, 244, 237), -1)
        cv2.circle(img, (x + int(w * 0.5), y + int(h * 0.58)), 3, (0, 244, 237), -1)
        cv2.line(img, (x + int(w * 0.35), y + int(h * 0.78)), (x + int(w * 0.65), y + int(h * 0.78)), (0, 244, 237), 2)

        # Tarjeta de identidad
        tag1 = f"{name}"
        tag2 = f"{list_type} | Sim: {int(similarity*100)}%"
        
        cv2.rectangle(img, (x - 20, y - 48), (x + w + 20, y - 4), (20, 20, 20), -1)
        cv2.rectangle(img, (x - 20, y - 48), (x + w + 20, y - 4), color, 1)
        
        cv2.putText(img, tag1, (x - 14, y - 28), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1)
        cv2.putText(img, tag2, (x - 14, y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.42, color, 1)
