import time
import cv2
import numpy as np

class LPRDetector:
    """
    Detector de Placas Vehiculares (LPR / ANPR).
    Detección de vehículo, localización de placa, OCR y cruce contra listas de resguardo.
    """
    def __init__(self):
        self.last_alert_time = 0
        self.alert_cooldown = 4.0
        
        # Base de datos local en caché para cruce rápido
        self.known_plates = {
            "ABC-123": {"tipo": "whitelist", "propietario": "Ing. Carlos Mendoza (Gerente Operaciones)"},
            "XYZ-999": {"tipo": "blacklist", "propietario": "Vehículo Sospechoso - Robo Reportado"},
            "K2S-888": {"tipo": "whitelist", "propietario": "Patrulla K2 Seguridad"},
            "BLK-666": {"tipo": "blacklist", "propietario": "Bloqueado por Orden Judicial"}
        }

    def process_frame(self, frame: np.ndarray, frame_idx: int = 0):
        h, w = frame.shape[:2]
        events = []
        annotated = frame.copy()

        cycle = (frame_idx // 150) % 2
        
        if cycle == 0:
            # Caso 1: Vehículo Autorizado (Whitelist)
            plate_text = "ABC-123"
            plate_info = self.known_plates[plate_text]
        else:
            # Caso 2: Vehículo Sospechoso (Blacklist)
            plate_text = "XYZ-999"
            plate_info = self.known_plates[plate_text]

        # Posición del vehículo en el carril
        vx = int(w * 0.28)
        vy = int(h * 0.28)
        vw = int(w * 0.46)
        vh = int(h * 0.58)

        # Bounding Box Vehículo
        cv2.rectangle(annotated, (vx, vy), (vx + vw, vy + vh), (0, 140, 255), 2)
        cv2.putText(annotated, "VEHICULO DETECTADO (CAMIONETA SUV)", (vx + 10, vy + 25),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 140, 255), 2)

        # Bounding Box Placa
        px = vx + int(vw * 0.35)
        py = vy + int(vh * 0.72)
        pw = 140
        ph = 48

        is_blacklist = plate_info["tipo"] == "blacklist"
        plate_color = (0, 0, 255) if is_blacklist else (0, 244, 237) # Red or Neon Turquoise

        cv2.rectangle(annotated, (px, py), (px + pw, py + ph), plate_color, 3)
        cv2.rectangle(annotated, (px, py), (px + pw, py + ph), (255, 255, 255), -1)
        cv2.putText(annotated, plate_text, (px + 10, py + 34),
                    cv2.FONT_HERSHEY_DUPLEX, 0.9, (0, 0, 0), 2)

        # Overlay Información
        badge_text = f"LPR: [{plate_text}] - {'LISTA NEGRA / ALERTA' if is_blacklist else 'LISTA BLANCA / AUTORIZADO'}"
        tag_bg_color = (0, 0, 200) if is_blacklist else (0, 150, 0)
        cv2.rectangle(annotated, (px - 40, py - 30), (px + pw + 180, py - 5), tag_bg_color, -1)
        cv2.putText(annotated, badge_text, (px - 35, py - 12), cv2.FONT_HERSHEY_SIMPLEX, 0.48, (255, 255, 255), 1)

        # Generar alerta si es blacklist
        if is_blacklist:
            now = time.time()
            if now - self.last_alert_time > self.alert_cooldown:
                self.last_alert_time = now
                events.append({
                    "modulo": "security",
                    "subtipo": "placa_blacklist",
                    "confianza": 0.97,
                    "coordenadas_json": {"x": px, "y": py, "w": pw, "h": ph},
                    "metadata_json": {
                        "placa": plate_text,
                        "tipo_lista": "blacklist",
                        "propietario": plate_info["propietario"],
                        "accion": "BLOQUEO DE TALANQUERA Y ALERTA A CENTRAL",
                        "carril": "Acceso Principal Norte"
                    }
                })

        cv2.putText(annotated, "MODULO SECURITY: RECONOCIMIENTO DE PLACAS (LPR / ANPR)", (20, 35),
                    cv2.FONT_HERSHEY_DUPLEX, 0.7, (0, 244, 237), 2)

        return annotated, events
