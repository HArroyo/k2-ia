import time
import cv2
import numpy as np

from yolo_engine import yolo_engine


class LPRDetector:
    """
    Detector de Placas Vehiculares (LPR / ANPR).
    Utiliza YOLO para detectar vehículos reales, localiza la región de placa
    mediante análisis de contraste/bordes, y simula OCR para la demo.
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

        # Nombres COCO para vehículos
        self.vehicle_names = {"car", "motorcycle", "bus", "truck"}

    def _find_plate_region(self, vehicle_crop: np.ndarray) -> tuple[int, int, int, int] | None:
        """
        Busca la región de placa dentro del crop del vehículo usando
        detección de contornos rectangulares con alto contraste.
        """
        if vehicle_crop is None or vehicle_crop.size == 0:
            return None

        vh, vw = vehicle_crop.shape[:2]
        if vh < 20 or vw < 20:
            return None

        # Buscar en la mitad inferior del vehículo (donde suelen estar las placas)
        search_region = vehicle_crop[int(vh * 0.5):, :]

        gray = cv2.cvtColor(search_region, cv2.COLOR_BGR2GRAY)
        # Aplicar threshold adaptativo para resaltar texto de placa
        blur = cv2.GaussianBlur(gray, (5, 5), 0)
        edges = cv2.Canny(blur, 80, 200)

        # Dilatar para conectar caracteres
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (15, 5))
        dilated = cv2.dilate(edges, kernel, iterations=2)

        contours, _ = cv2.findContours(dilated, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

        best_plate = None
        best_area = 0

        for cnt in contours:
            x, y, w, h = cv2.boundingRect(cnt)
            area = w * h
            aspect = w / max(h, 1)

            # Filtro de aspect ratio de placa (entre 2:1 y 5:1)
            if 1.5 < aspect < 6.0 and w > 30 and h > 10 and area > best_area:
                best_area = area
                # Ajustar coordenadas al frame original del vehicle_crop
                best_plate = (x, y + int(vh * 0.5), w, h)

        return best_plate

    def process_frame(self, frame: np.ndarray, frame_idx: int = 0):
        h, w = frame.shape[:2]
        events = []
        annotated = frame.copy()

        # Detectar vehículos reales
        vehicles = yolo_engine.detect_vehicles(frame, frame_id=frame_idx, conf=0.30)

        # También mostrar personas si las hay (contexto)
        persons = yolo_engine.detect_persons(frame, frame_id=frame_idx, conf=0.30)
        for p in persons:
            cv2.rectangle(annotated, (p["x1"], p["y1"]), (p["x2"], p["y2"]),
                          (100, 100, 100), 1)

        plates_found = 0

        for idx, veh in enumerate(vehicles):
            vx1, vy1, vx2, vy2 = veh["x1"], veh["y1"], veh["x2"], veh["y2"]
            vw, vh_v = veh["w"], veh["h"]
            class_name = veh["class_name"].upper()

            # Bounding Box Vehículo
            cv2.rectangle(annotated, (vx1, vy1), (vx2, vy2), (0, 140, 255), 2)
            cv2.putText(annotated, f"VEHICULO: {class_name} ({int(veh['conf']*100)}%)",
                        (vx1 + 10, vy1 + 22), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 140, 255), 2)

            # Buscar región de placa
            vehicle_crop = frame[vy1:vy2, vx1:vx2]
            plate_region = self._find_plate_region(vehicle_crop)

            if plate_region:
                px, py, pw, ph = plate_region
                # Coordenadas absolutas
                abs_px = vx1 + px
                abs_py = vy1 + py

                # Simular lectura OCR (en producción usaríamos Tesseract/PaddleOCR)
                plate_keys = list(self.known_plates.keys())
                cycle = (frame_idx // 150) % len(plate_keys)
                plate_text = plate_keys[cycle]
                plate_info = self.known_plates[plate_text]

                is_blacklist = plate_info["tipo"] == "blacklist"
                plate_color = (0, 0, 255) if is_blacklist else (0, 244, 237)

                # Dibujar placa
                cv2.rectangle(annotated, (abs_px, abs_py), (abs_px + pw, abs_py + ph), plate_color, 3)
                cv2.rectangle(annotated, (abs_px, abs_py), (abs_px + pw, abs_py + ph), (255, 255, 255), -1)
                cv2.putText(annotated, plate_text, (abs_px + 5, abs_py + ph - 5),
                            cv2.FONT_HERSHEY_DUPLEX, 0.7, (0, 0, 0), 2)

                # Badge
                badge = f"LPR: [{plate_text}] - {'LISTA NEGRA' if is_blacklist else 'AUTORIZADO'}"
                tag_bg = (0, 0, 200) if is_blacklist else (0, 150, 0)
                cv2.rectangle(annotated, (abs_px - 20, abs_py - 28),
                              (abs_px + len(badge) * 7 + 10, abs_py - 5), tag_bg, -1)
                cv2.putText(annotated, badge, (abs_px - 15, abs_py - 10),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.42, (255, 255, 255), 1)

                plates_found += 1

                if is_blacklist:
                    now = time.time()
                    if now - self.last_alert_time > self.alert_cooldown:
                        self.last_alert_time = now
                        events.append({
                            "modulo": "security",
                            "subtipo": "placa_blacklist",
                            "confianza": round(veh["conf"], 2),
                            "coordenadas_json": {"x": abs_px, "y": abs_py, "w": pw, "h": ph},
                            "metadata_json": {
                                "placa": plate_text,
                                "tipo_lista": "blacklist",
                                "propietario": plate_info["propietario"],
                                "tipo_vehiculo": class_name,
                                "accion": "BLOQUEO DE TALANQUERA Y ALERTA A CENTRAL",
                                "carril": "Acceso Principal Norte"
                            }
                        })
            else:
                # Vehículo detectado pero sin placa localizada
                cv2.putText(annotated, "PLACA: BUSCANDO...",
                            (vx1 + 10, vy2 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 200, 255), 1)

        if not vehicles:
            cv2.putText(annotated, "SIN VEHICULOS DETECTADOS EN CAMPO VISUAL",
                        (int(w * 0.2), int(h * 0.5)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (100, 100, 100), 2)

        cv2.putText(annotated, f"MODULO SECURITY: LPR / ANPR (YOLO REAL) | {plates_found} PLACAS",
                    (20, 35), cv2.FONT_HERSHEY_DUPLEX, 0.65, (0, 244, 237), 2)

        return annotated, events
