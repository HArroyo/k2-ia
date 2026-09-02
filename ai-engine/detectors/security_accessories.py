import time
import cv2
import numpy as np

from yolo_engine import yolo_engine


class ForbiddenAccessoriesDetector:
    """
    Detector de Accesorios Prohibidos en Zonas Restringidas (Gorras, Lentes Oscuros, Mascarillas).
    Utiliza YOLO para detectar personas reales y análisis de color HSV sobre
    el crop de cabeza/rostro para clasificar accesorios visibles.
    """
    def __init__(self):
        self.last_alert_time = 0
        self.alert_cooldown = 4.0

        # Haar cascade para detección facial (si rostro no se detecta = posible ocultamiento)
        self.face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        )

    def _analyze_head_accessories(self, head_crop: np.ndarray) -> dict:
        """
        Analiza el crop de cabeza para detectar accesorios:
        - Gorra: Región superior de la cabeza con colores sólidos/oscuros dominantes
        - Lentes oscuros: Banda oscura en la zona de ojos
        - Mascarilla: Colores claros (blanco/azul) en la zona inferior del rostro
        """
        result = {
            "has_cap": False, "cap_conf": 0.0,
            "has_sunglasses": False, "sunglasses_conf": 0.0,
            "has_mask": False, "mask_conf": 0.0,
        }

        if head_crop is None or head_crop.size == 0 or head_crop.shape[0] < 10:
            return result

        h, w = head_crop.shape[:2]
        hsv = cv2.cvtColor(head_crop, cv2.COLOR_BGR2HSV)

        # --- Análisis de Gorra (tercio superior de la cabeza) ---
        cap_region = hsv[0:int(h * 0.35), :]
        if cap_region.size > 0:
            # Detectar colores sólidos oscuros o saturados (gorras típicas)
            dark_mask = cv2.inRange(cap_region,
                                    np.array([0, 0, 0]), np.array([180, 255, 80]))
            saturated_mask = cv2.inRange(cap_region,
                                          np.array([0, 80, 50]), np.array([180, 255, 255]))
            total = cap_region.shape[0] * cap_region.shape[1]
            dark_ratio = cv2.countNonZero(dark_mask) / max(total, 1)
            sat_ratio = cv2.countNonZero(saturated_mask) / max(total, 1)

            # Si >40% es oscuro uniforme o >50% saturado, probable gorra
            if dark_ratio > 0.40 or sat_ratio > 0.50:
                result["has_cap"] = True
                result["cap_conf"] = round(max(dark_ratio, sat_ratio), 2)

        # --- Análisis de Lentes Oscuros (banda de ojos) ---
        eye_band = hsv[int(h * 0.30):int(h * 0.50), int(w * 0.15):int(w * 0.85)]
        if eye_band.size > 0:
            dark_eyes = cv2.inRange(eye_band,
                                     np.array([0, 0, 0]), np.array([180, 255, 50]))
            total = eye_band.shape[0] * eye_band.shape[1]
            dark_ratio = cv2.countNonZero(dark_eyes) / max(total, 1)
            if dark_ratio > 0.45:
                result["has_sunglasses"] = True
                result["sunglasses_conf"] = round(dark_ratio, 2)

        # --- Análisis de Mascarilla (zona inferior del rostro) ---
        mouth_region = hsv[int(h * 0.60):, int(w * 0.20):int(w * 0.80)]
        if mouth_region.size > 0:
            # Mascarilla quirúrgica: azul claro o blanco
            blue_mask = cv2.inRange(mouth_region,
                                     np.array([85, 40, 120]), np.array([130, 255, 255]))
            white_mask = cv2.inRange(mouth_region,
                                      np.array([0, 0, 180]), np.array([180, 40, 255]))
            total = mouth_region.shape[0] * mouth_region.shape[1]
            mask_ratio = (cv2.countNonZero(blue_mask) + cv2.countNonZero(white_mask)) / max(total, 1)
            if mask_ratio > 0.30:
                result["has_mask"] = True
                result["mask_conf"] = round(mask_ratio, 2)

        return result

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

            # Crop de cabeza/rostro (tercio superior)
            head_y1 = max(0, y1)
            head_y2 = min(h, y1 + int(person_h * 0.35))
            head_crop = frame[head_y1:head_y2, x1:x2]

            # Analizar accesorios en el crop
            accessories = self._analyze_head_accessories(head_crop)
            name = f"SUJETO {idx + 1:02d}"

            self._draw_subject(
                annotated, x1, y1, person_w, person_h, name,
                has_cap=accessories["has_cap"],
                has_sunglasses=accessories["has_sunglasses"],
                has_mask=accessories["has_mask"],
                cap_conf=accessories["cap_conf"],
                sunglasses_conf=accessories["sunglasses_conf"],
                mask_conf=accessories["mask_conf"],
                det_conf=det["conf"],
            )

            # Disparar alerta
            detected_items = []
            if accessories["has_cap"]:
                detected_items.append("Gorra / Pasamontañas")
            if accessories["has_sunglasses"]:
                detected_items.append("Lentes Oscuros")
            if accessories["has_mask"]:
                detected_items.append("Mascarilla")

            if detected_items:
                now = time.time()
                if now - self.last_alert_time > self.alert_cooldown:
                    self.last_alert_time = now
                    events.append({
                        "modulo": "security",
                        "subtipo": "accesorio_prohibido",
                        "confianza": round(det["conf"], 2),
                        "coordenadas_json": {"x": x1, "y": y1, "w": person_w, "h": person_h},
                        "metadata_json": {
                            "sujeto": f"Sujeto #{idx + 1:02d}",
                            "accesorios_detectados": detected_items,
                            "violacion": "Ocultamiento de Rostro en Zona de Alta Seguridad",
                            "accion_sugerida": "Solicitar retiro de prendas para control biométrico"
                        }
                    })

        if not persons:
            cv2.putText(annotated, "SIN PERSONAS DETECTADAS", (int(w * 0.3), int(h * 0.5)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (100, 100, 100), 2)

        cv2.putText(annotated, "MODULO SECURITY: ACCESORIOS PROHIBIDOS (YOLO + HSV)", (20, 35),
                    cv2.FONT_HERSHEY_DUPLEX, 0.65, (0, 244, 237), 2)

        return annotated, events

    def _draw_subject(self, img, x, y, w, h, name, has_cap, has_sunglasses, has_mask,
                      cap_conf, sunglasses_conf, mask_conf, det_conf):
        is_violation = has_cap or has_sunglasses or has_mask
        color = (0, 0, 255) if is_violation else (0, 255, 0)

        cv2.rectangle(img, (x, y), (x + w, y + h), color, 2)

        # Región de cabeza
        head_h = int(h * 0.35)
        cv2.rectangle(img, (x + 5, y + 3), (x + w - 5, y + head_h), (0, 244, 237), 1)

        # Etiqueta superior
        tag = f"CROP: {name} [{int(det_conf * 100)}%]"
        cv2.putText(img, tag, (x, y - 8), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (255, 255, 255), 1)

        # Detalles de accesorios
        badge_y = y + h + 18
        items = []
        if has_cap:
            items.append((f"[!] GORRA ({int(cap_conf*100)}%)", (0, 0, 255)))
        if has_sunglasses:
            items.append((f"[!] LENTES OSCUROS ({int(sunglasses_conf*100)}%)", (0, 0, 255)))
        if has_mask:
            items.append((f"[!] MASCARILLA ({int(mask_conf*100)}%)", (0, 165, 255)))
        if not items:
            items.append(("[OK] ROSTRO DESCUBIERTO", (0, 255, 0)))

        for i, (text, clr) in enumerate(items):
            cv2.putText(img, text, (x - 5, badge_y + i * 18),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.40, clr, 1)
