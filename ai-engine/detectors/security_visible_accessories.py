import cv2
import numpy as np

from yolo_engine import yolo_engine


class VisibleAccessoriesDetector:
    """
    Detector de Características Visibles: Lentes, Gorra y Mascarilla.
    Utiliza YOLO para detectar personas reales y Haar Cascade + análisis HSV
    para clasificar accesorios en el crop de cabeza.
    """
    def __init__(self):
        self.name = "Características Visibles: Lentes, Gorra y Mascarilla"
        self.face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        )
        self.eye_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_eye.xml"
        )

    def _analyze_accessories(self, head_crop: np.ndarray) -> dict:
        """
        Analiza el crop de cabeza usando Haar Cascade y HSV:
        - Gorra: Ausencia de cabello/frente visible + región oscura superior
        - Lentes: Presencia/ausencia de ojos detectados + análisis de brillo
        - Mascarilla: Colores claros/uniformes en zona inferior del rostro
        """
        result = {
            "has_cap": False, "cap_status": "NO DETECTADA",
            "has_glasses": False, "glasses_status": "NO DETECTADOS",
            "has_mask": False, "mask_status": "NO",
            "face_visible": False,
        }

        if head_crop is None or head_crop.size == 0 or head_crop.shape[0] < 15:
            return result

        h, w = head_crop.shape[:2]
        gray = cv2.cvtColor(head_crop, cv2.COLOR_BGR2GRAY)
        hsv = cv2.cvtColor(head_crop, cv2.COLOR_BGR2HSV)

        # Detectar rostro
        faces = self.face_cascade.detectMultiScale(gray, 1.15, 4, minSize=(15, 15))
        result["face_visible"] = len(faces) > 0

        # --- Gorra: región superior oscura/saturada ---
        top_region = hsv[0:int(h * 0.30), :]
        if top_region.size > 0:
            total = top_region.shape[0] * top_region.shape[1]
            dark = cv2.inRange(top_region, np.array([0, 0, 0]), np.array([180, 255, 80]))
            saturated = cv2.inRange(top_region, np.array([0, 80, 50]), np.array([180, 255, 255]))
            dark_r = cv2.countNonZero(dark) / max(total, 1)
            sat_r = cv2.countNonZero(saturated) / max(total, 1)
            if dark_r > 0.35 or sat_r > 0.50:
                result["has_cap"] = True
                pct = int(max(dark_r, sat_r) * 100)
                result["cap_status"] = f"DETECTADA ({pct}%)"

        # --- Lentes: detección de ojos con Haar ---
        if len(faces) > 0:
            fx, fy, fw, fh = faces[0]
            face_roi = gray[fy:fy + fh, fx:fx + fw]
            eyes = self.eye_cascade.detectMultiScale(face_roi, 1.1, 3, minSize=(10, 10))

            if len(eyes) >= 2:
                result["has_glasses"] = False
                result["glasses_status"] = "NO DETECTADOS (OJOS VISIBLES)"
            elif len(eyes) == 0:
                # Si hay rostro pero no ojos = posibles lentes oscuros
                eye_zone = hsv[fy + int(fh * 0.2):fy + int(fh * 0.5), fx:fx + fw]
                if eye_zone.size > 0:
                    total = eye_zone.shape[0] * eye_zone.shape[1]
                    dark = cv2.inRange(eye_zone, np.array([0, 0, 0]), np.array([180, 255, 50]))
                    dark_r = cv2.countNonZero(dark) / max(total, 1)
                    if dark_r > 0.40:
                        result["has_glasses"] = True
                        result["glasses_status"] = f"LENTES OSCUROS ({int(dark_r*100)}%)"
        else:
            # Sin rostro detectado — analizar banda de ojos estimada
            eye_band = hsv[int(h * 0.30):int(h * 0.50), int(w * 0.15):int(w * 0.85)]
            if eye_band.size > 0:
                total = eye_band.shape[0] * eye_band.shape[1]
                dark = cv2.inRange(eye_band, np.array([0, 0, 0]), np.array([180, 255, 50]))
                dark_r = cv2.countNonZero(dark) / max(total, 1)
                if dark_r > 0.45:
                    result["has_glasses"] = True
                    result["glasses_status"] = f"PROBABLE LENTES ({int(dark_r*100)}%)"

        # --- Mascarilla: zona inferior con colores claros uniformes ---
        mouth = hsv[int(h * 0.60):, int(w * 0.20):int(w * 0.80)]
        if mouth.size > 0:
            total = mouth.shape[0] * mouth.shape[1]
            blue_m = cv2.inRange(mouth, np.array([85, 40, 120]), np.array([130, 255, 255]))
            white_m = cv2.inRange(mouth, np.array([0, 0, 180]), np.array([180, 40, 255]))
            mask_r = (cv2.countNonZero(blue_m) + cv2.countNonZero(white_m)) / max(total, 1)
            if mask_r > 0.25:
                result["has_mask"] = True
                result["mask_status"] = f"QUIRURGICA ({int(mask_r*100)}%)"

        return result

    def process_frame(self, frame: np.ndarray, frame_idx: int) -> tuple[np.ndarray, list]:
        annotated = frame.copy()
        h, w = frame.shape[:2]
        events = []

        # Detectar personas reales
        persons = yolo_engine.detect_persons(frame, frame_id=frame_idx, conf=0.30)

        for idx, det in enumerate(persons):
            x1, y1, x2, y2 = det["x1"], det["y1"], det["x2"], det["y2"]
            person_h = y2 - y1

            # Crop de cabeza
            head_y2 = min(h, y1 + int(person_h * 0.35))
            head_crop = frame[y1:head_y2, x1:x2]

            # Analizar accesorios
            acc = self._analyze_accessories(head_crop)

            is_alert = acc["has_cap"] or acc["has_glasses"]
            color = (0, 50, 255) if is_alert else (0, 244, 237)
            label = f"SUJETO {idx + 1:02d}"

            # Bounding Box
            cv2.rectangle(annotated, (x1, y1), (x2, y2), color, 2)
            tag = f"{'ALERTA: ACCESORIO NO AUTORIZADO' if is_alert else label + ' (AUTORIZADO)'}"
            tag_color = (0, 0, 255) if is_alert else (0, 141, 155)
            cv2.rectangle(annotated, (x1, y1 - 22), (x1 + len(tag) * 7 + 10, y1), tag_color, -1)
            cv2.putText(annotated, tag, (x1 + 4, y1 - 6),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1)

            # Panel de Accesorios
            base_y = y2 + 18
            cap_color = (0, 0, 255) if acc["has_cap"] else (0, 255, 136)
            cv2.putText(annotated, f"[{'!' if acc['has_cap'] else 'X'}] GORRA: {acc['cap_status']}",
                        (x1, base_y), cv2.FONT_HERSHEY_SIMPLEX, 0.40, cap_color, 1)

            glasses_color = (0, 165, 255) if acc["has_glasses"] else (0, 244, 237)
            cv2.putText(annotated, f"[{'!' if acc['has_glasses'] else 'OK'}] LENTES: {acc['glasses_status'][:20]}",
                        (x1, base_y + 18), cv2.FONT_HERSHEY_SIMPLEX, 0.40, glasses_color, 1)

            mask_color = (0, 255, 136) if acc["has_mask"] else (200, 200, 200)
            cv2.putText(annotated, f"[{'OK' if acc['has_mask'] else 'X'}] MASCARILLA: {acc['mask_status']}",
                        (x1, base_y + 36), cv2.FONT_HERSHEY_SIMPLEX, 0.40, mask_color, 1)

            if is_alert and frame_idx % 80 == 0:
                detected = []
                if acc["has_cap"]:
                    detected.append("Gorra")
                if acc["has_glasses"]:
                    detected.append("Lentes Oscuros")
                events.append({
                    "modulo": "security",
                    "subtipo": "accesorio_prohibido",
                    "confianza": round(det["conf"], 2),
                    "metadata_json": {
                        "sujeto": f"Visitante #{idx + 1}",
                        "accesorios": detected,
                        "mascarilla": acc["mask_status"],
                        "criterio": "Rostro parcialmente cubierto en control de acceso"
                    }
                })

        if not persons:
            cv2.putText(annotated, "SIN PERSONAS DETECTADAS", (int(w * 0.3), int(h * 0.5)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (100, 100, 100), 2)

        cv2.putText(annotated, "MODULO SECURITY: CARACTERISTICAS VISIBLES (YOLO + HAAR + HSV)", (20, 35),
                    cv2.FONT_HERSHEY_DUPLEX, 0.6, (0, 244, 237), 2)

        return annotated, events
