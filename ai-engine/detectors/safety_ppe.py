import time
import cv2
import numpy as np

from yolo_engine import yolo_engine


class PPEDetector:
    """
    Detector de Casco y Chaleco (Safety EPP).
    Utiliza YOLO para detectar personas reales y luego analiza el crop
    de cabeza (tercio superior) y torso (tercio medio) mediante análisis
    de color HSV para determinar presencia de casco y chaleco reflectante.
    """
    def __init__(self):
        self.last_alert_time = 0
        self.alert_cooldown = 4.0  # seconds

        # Rangos HSV para colores típicos de casco de seguridad
        # Amarillo: H(20-35), S(100-255), V(150-255)
        # Naranja: H(10-22), S(150-255), V(150-255)
        # Blanco: H(0-180), S(0-50), V(200-255)
        # Rojo: H(0-10 o 160-180), S(100-255), V(100-255)
        self.helmet_hsv_ranges = [
            {"name": "amarillo", "lower": np.array([20, 100, 150]), "upper": np.array([35, 255, 255])},
            {"name": "naranja",  "lower": np.array([10, 150, 150]), "upper": np.array([22, 255, 255])},
            {"name": "blanco",   "lower": np.array([0, 0, 200]),    "upper": np.array([180, 50, 255])},
            {"name": "rojo_bajo","lower": np.array([0, 100, 100]),  "upper": np.array([10, 255, 255])},
            {"name": "rojo_alto","lower": np.array([160, 100, 100]),"upper": np.array([180, 255, 255])},
            {"name": "azul",     "lower": np.array([100, 100, 100]),"upper": np.array([130, 255, 255])},
        ]

        # Rangos HSV para chaleco reflectante (amarillo neón / naranja alta visibilidad)
        self.vest_hsv_ranges = [
            {"name": "amarillo_neon", "lower": np.array([22, 120, 150]), "upper": np.array([38, 255, 255])},
            {"name": "naranja_hv",   "lower": np.array([8, 150, 150]),  "upper": np.array([25, 255, 255])},
            {"name": "verde_hv",     "lower": np.array([35, 100, 150]), "upper": np.array([85, 255, 255])},
        ]

        # Umbral mínimo de porcentaje de píxeles del color para considerarlo detectado
        self.helmet_threshold = 0.08  # 8% del crop de cabeza
        self.vest_threshold = 0.10    # 10% del crop de torso

    def _analyze_region_hsv(self, crop: np.ndarray, hsv_ranges: list, threshold: float) -> tuple[bool, float, str]:
        """
        Analiza un crop de imagen en espacio HSV para detectar colores específicos.
        Retorna: (detectado, porcentaje_mayor, nombre_color)
        """
        if crop is None or crop.size == 0 or crop.shape[0] < 5 or crop.shape[1] < 5:
            return False, 0.0, "N/A"

        try:
            hsv = cv2.cvtColor(crop, cv2.COLOR_BGR2HSV)
        except Exception:
            return False, 0.0, "N/A"

        total_pixels = hsv.shape[0] * hsv.shape[1]
        if total_pixels == 0:
            return False, 0.0, "N/A"

        best_ratio = 0.0
        best_name = "ninguno"

        for rng in hsv_ranges:
            mask = cv2.inRange(hsv, rng["lower"], rng["upper"])
            ratio = cv2.countNonZero(mask) / total_pixels
            if ratio > best_ratio:
                best_ratio = ratio
                best_name = rng["name"]

        detected = best_ratio >= threshold
        return detected, round(best_ratio, 3), best_name

    def process_frame(self, frame: np.ndarray, frame_idx: int = 0):
        """
        Analiza el frame para detectar personas reales y verificar EPP.
        Retorna: frame_anotado, lista_eventos
        """
        h, w = frame.shape[:2]
        events = []
        annotated = frame.copy()

        # Detectar personas reales con YOLO
        persons = yolo_engine.detect_persons(frame, frame_id=frame_idx, conf=0.30)

        for idx, det in enumerate(persons):
            x1, y1, x2, y2 = det["x1"], det["y1"], det["x2"], det["y2"]
            person_h = y2 - y1
            person_w = x2 - x1
            worker_id = f"TRAB-{100 + idx + 1}"

            # Crop del tercio superior (cabeza) para análisis de casco
            head_y1 = max(0, y1)
            head_y2 = min(h, y1 + int(person_h * 0.25))
            head_x1 = max(0, x1 + int(person_w * 0.15))
            head_x2 = min(w, x2 - int(person_w * 0.15))
            head_crop = frame[head_y1:head_y2, head_x1:head_x2]

            has_helmet, helmet_pct, helmet_color = self._analyze_region_hsv(
                head_crop, self.helmet_hsv_ranges, self.helmet_threshold
            )

            # Crop del tercio medio (torso) para análisis de chaleco
            torso_y1 = min(h, y1 + int(person_h * 0.25))
            torso_y2 = min(h, y1 + int(person_h * 0.60))
            torso_crop = frame[torso_y1:torso_y2, x1:x2]

            has_vest, vest_pct, vest_color = self._analyze_region_hsv(
                torso_crop, self.vest_hsv_ranges, self.vest_threshold
            )

            # Dibujar anotaciones
            self._draw_worker(
                annotated, x1, y1, person_w, person_h,
                has_helmet=has_helmet, has_vest=has_vest,
                worker_id=worker_id, conf=det["conf"],
                helmet_pct=helmet_pct, helmet_color=helmet_color,
                vest_pct=vest_pct, vest_color=vest_color,
                head_region=(head_x1, head_y1, head_x2, head_y2),
                torso_region=(x1, torso_y1, x2, torso_y2),
            )

            # Generar alertas de infracción EPP
            if not has_helmet or not has_vest:
                now = time.time()
                if now - self.last_alert_time > self.alert_cooldown:
                    self.last_alert_time = now
                    missing = []
                    if not has_helmet:
                        missing.append("Casco")
                    if not has_vest:
                        missing.append("Chaleco")

                    subtipo = ("sin_casco" if not has_helmet and has_vest
                               else ("sin_chaleco" if has_helmet and not has_vest
                                     else "sin_epp_completo"))

                    events.append({
                        "modulo": "safety",
                        "subtipo": subtipo,
                        "confianza": round(det["conf"], 2),
                        "coordenadas_json": {"x": x1, "y": y1, "w": person_w, "h": person_h},
                        "metadata_json": {
                            "sujeto": f"Operador #{100 + idx + 1}",
                            "faltante": ", ".join(missing),
                            "helmet_analysis": f"{helmet_color} ({int(helmet_pct*100)}%)",
                            "vest_analysis": f"{vest_color} ({int(vest_pct*100)}%)",
                            "zona": "Área de Operaciones",
                            "nivel_riesgo": "ALTO"
                        }
                    })

        # Si no se detectaron personas, mostrar mensaje
        if not persons:
            cv2.putText(annotated, "SIN PERSONAS DETECTADAS EN CAMPO VISUAL", (int(w * 0.2), int(h * 0.5)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (100, 100, 100), 2)

        # Overlay de estado en el frame
        cv2.putText(annotated, "MODULO SAFETY: DETECCION CASCO Y CHALECO (EPP) - YOLO + HSV", (20, 35),
                    cv2.FONT_HERSHEY_DUPLEX, 0.7, (0, 244, 237), 2)

        return annotated, events

    def _draw_worker(self, img, x, y, w, h, has_helmet, has_vest, worker_id, conf,
                     helmet_pct, helmet_color, vest_pct, vest_color,
                     head_region, torso_region):
        """Dibuja las anotaciones visuales sobre cada persona detectada."""
        is_ok = has_helmet and has_vest
        box_color = (0, 244, 237) if is_ok else (0, 0, 255)

        # Bounding box persona
        cv2.rectangle(img, (x, y), (x + w, y + h), box_color, 2)

        # Región de cabeza (casco)
        hx1, hy1, hx2, hy2 = head_region
        helm_color = (0, 255, 0) if has_helmet else (0, 0, 255)
        helm_label = f"CASCO: {helmet_color.upper()} ({int(helmet_pct*100)}%)" if has_helmet else "SIN CASCO"
        cv2.rectangle(img, (hx1, hy1), (hx2, hy2), helm_color, 2)
        cv2.putText(img, helm_label, (hx1, hy1 - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.4, helm_color, 1)

        # Región de torso (chaleco)
        tx1, ty1, tx2, ty2 = torso_region
        vest_draw_color = (0, 255, 0) if has_vest else (0, 0, 255)
        vest_label = f"CHALECO: {vest_color.upper()} ({int(vest_pct*100)}%)" if has_vest else "SIN CHALECO"
        cv2.rectangle(img, (tx1, ty1), (tx2, ty2), vest_draw_color, 1)
        cv2.putText(img, vest_label, (tx1, ty1 - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.4, vest_draw_color, 1)

        # Etiqueta de ID con confianza YOLO
        tag = f"{worker_id} | {int(conf*100)}% | {'EPP VALIDO' if is_ok else 'INFRACCION EPP'}"
        tag_w = len(tag) * 8 + 10
        cv2.rectangle(img, (x, y - 22), (x + tag_w, y), box_color, -1)
        cv2.putText(img, tag, (x + 5, y - 6), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 0, 0), 1)

        return is_ok, "infraccion" if not is_ok else "ok"
