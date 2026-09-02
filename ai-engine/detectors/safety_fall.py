import time
import cv2
import numpy as np

from yolo_engine import yolo_engine


class FallDetector:
    """
    Detector de Estabilidad y Caídas (Safety Fall).
    Utiliza YOLOv8-pose para obtener keypoints anatómicos reales,
    calcula el ángulo del vector torso-suelo (hombro→cadera) y detecta caídas
    cuando el ángulo baja de un umbral crítico.
    
    Keypoints COCO relevantes:
    5=left_shoulder, 6=right_shoulder, 11=left_hip, 12=right_hip,
    13=left_knee, 14=right_knee, 15=left_ankle, 16=right_ankle
    """
    def __init__(self):
        self.last_alert_time = 0
        self.alert_cooldown = 4.0
        self.fall_angle_threshold = 45.0   # Ángulo < 45° = posible caída
        self.fallen_angle_threshold = 30.0  # Ángulo < 30° = caída confirmada

    def _calculate_torso_angle(self, keypoints: np.ndarray) -> float:
        """
        Calcula el ángulo del torso respecto a la vertical.
        Usa el promedio de hombros y caderas para mayor estabilidad.
        Retorna ángulo en grados (90° = de pie, 0° = acostado).
        """
        # Keypoints: [x, y, confidence]
        l_shoulder = keypoints[5]  # left_shoulder
        r_shoulder = keypoints[6]  # right_shoulder
        l_hip = keypoints[11]      # left_hip
        r_hip = keypoints[12]      # right_hip

        # Verificar que los keypoints relevantes tienen confianza suficiente
        min_conf = 0.3
        valid_shoulders = []
        valid_hips = []

        if l_shoulder[2] > min_conf:
            valid_shoulders.append(l_shoulder[:2])
        if r_shoulder[2] > min_conf:
            valid_shoulders.append(r_shoulder[:2])
        if l_hip[2] > min_conf:
            valid_hips.append(l_hip[:2])
        if r_hip[2] > min_conf:
            valid_hips.append(r_hip[:2])

        if not valid_shoulders or not valid_hips:
            return 90.0  # No se puede determinar, asumir de pie

        # Punto medio de hombros y caderas
        shoulder_mid = np.mean(valid_shoulders, axis=0)
        hip_mid = np.mean(valid_hips, axis=0)

        # Vector de torso (de cadera a hombro)
        dx = shoulder_mid[0] - hip_mid[0]
        dy = shoulder_mid[1] - hip_mid[1]  # Y invertido en imagen (arriba = menor)

        # Ángulo respecto a la vertical (dy negativo = hacia arriba)
        # atan2 del vector, luego convertir a ángulo desde vertical
        angle_rad = np.arctan2(abs(dx), abs(dy))
        angle_deg = 90.0 - np.degrees(angle_rad)

        return max(0.0, min(90.0, angle_deg))

    def process_frame(self, frame: np.ndarray, frame_idx: int = 0):
        h, w = frame.shape[:2]
        events = []
        annotated = frame.copy()

        # Estimación de pose con YOLO-pose
        pose_results = yolo_engine.estimate_pose(frame, frame_id=frame_idx, conf=0.30)

        for idx, pose in enumerate(pose_results):
            keypoints = pose["keypoints"]  # (17, 3)
            x1, y1, x2, y2 = pose["x1"], pose["y1"], pose["x2"], pose["y2"]
            conf = pose["conf"]

            # Calcular ángulo del torso
            angle = self._calculate_torso_angle(keypoints)

            # Clasificar estado
            if angle < self.fallen_angle_threshold:
                is_fallen = True
                status_text = "ALERTA: CAIDA DETECTADA"
            elif angle < self.fall_angle_threshold:
                is_fallen = False
                status_text = f"OPERARIO {chr(65+idx)} (PERDIDA DE ESTABILIDAD)"
            else:
                is_fallen = False
                status_text = f"OPERARIO {chr(65+idx)} (ESTABLE)"

            # Dibujar esqueleto y anotaciones
            self._draw_pose_real(annotated, keypoints, x1, y1, x2, y2,
                                 angle, is_fallen, status_text, conf)

            if is_fallen:
                now = time.time()
                if now - self.last_alert_time > self.alert_cooldown:
                    self.last_alert_time = now
                    events.append({
                        "modulo": "safety",
                        "subtipo": "caida",
                        "confianza": round(conf, 2),
                        "coordenadas_json": {"x": x1, "y": y1,
                                             "w": x2 - x1, "h": y2 - y1},
                        "metadata_json": {
                            "sujeto": f"Operario {chr(65+idx)}",
                            "angulo_torso": round(angle, 1),
                            "criterio": f"Vector torso-suelo {angle:.1f}° < {self.fallen_angle_threshold}°",
                            "prioridad": "CRITICA"
                        }
                    })

        # Si no hay detecciones de pose, intentar fallback con detección simple
        if not pose_results:
            persons = yolo_engine.detect_persons(frame, frame_id=frame_idx, conf=0.30)
            for idx, det in enumerate(persons):
                # Sin keypoints, usar proporción aspect ratio como heurística
                aspect = det["w"] / max(det["h"], 1)
                # Persona de pie: aspect < 0.6, acostada: aspect > 1.2
                if aspect > 1.2:
                    is_fallen = True
                    angle_est = 15.0
                    status = "ALERTA: POSIBLE CAIDA (ASPECT RATIO)"
                elif aspect > 0.8:
                    is_fallen = False
                    angle_est = 45.0
                    status = f"OPERARIO {chr(65+idx)} (INESTABLE)"
                else:
                    is_fallen = False
                    angle_est = 85.0
                    status = f"OPERARIO {chr(65+idx)} (ESTABLE)"

                color = (0, 0, 255) if is_fallen else (0, 255, 0)
                cv2.rectangle(annotated, (det["x1"], det["y1"]),
                              (det["x2"], det["y2"]), color, 2)
                tag = f"{status} | ~{angle_est:.0f}deg"
                cv2.rectangle(annotated, (det["x1"], det["y1"] - 22),
                              (det["x1"] + len(tag)*7, det["y1"]), color, -1)
                cv2.putText(annotated, tag, (det["x1"] + 4, det["y1"] - 6),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.38, (255, 255, 255), 1)

            if not persons:
                cv2.putText(annotated, "SIN PERSONAS DETECTADAS", (int(w*0.3), int(h*0.5)),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.7, (100, 100, 100), 2)

        cv2.putText(annotated, "MODULO SAFETY: ESTABILIDAD Y CAIDAS (YOLO-POSE REAL)", (20, 35),
                    cv2.FONT_HERSHEY_DUPLEX, 0.7, (0, 244, 237), 2)

        return annotated, events

    def _draw_pose_real(self, img, keypoints, x1, y1, x2, y2, angle, is_fallen, label, conf):
        """Dibuja el esqueleto real basado en keypoints COCO."""
        color = (0, 0, 255) if is_fallen else (0, 255, 0)
        skeleton_color = (0, 140, 255) if is_fallen else (0, 244, 237)

        # Bounding box
        cv2.rectangle(img, (x1, y1), (x2, y2), color, 2)

        # Conexiones del esqueleto COCO
        skeleton_pairs = [
            (5, 6),    # shoulders
            (5, 7),    # left shoulder - left elbow
            (7, 9),    # left elbow - left wrist
            (6, 8),    # right shoulder - right elbow
            (8, 10),   # right elbow - right wrist
            (5, 11),   # left shoulder - left hip
            (6, 12),   # right shoulder - right hip
            (11, 12),  # hips
            (11, 13),  # left hip - left knee
            (13, 15),  # left knee - left ankle
            (12, 14),  # right hip - right knee
            (14, 16),  # right knee - right ankle
            (0, 5),    # nose - left shoulder
            (0, 6),    # nose - right shoulder
        ]

        min_kp_conf = 0.3
        for i, j in skeleton_pairs:
            if keypoints[i][2] > min_kp_conf and keypoints[j][2] > min_kp_conf:
                pt1 = (int(keypoints[i][0]), int(keypoints[i][1]))
                pt2 = (int(keypoints[j][0]), int(keypoints[j][1]))
                cv2.line(img, pt1, pt2, skeleton_color, 2)

        # Dibujar articulaciones
        for kp in keypoints:
            if kp[2] > min_kp_conf:
                pt = (int(kp[0]), int(kp[1]))
                cv2.circle(img, pt, 4, (255, 255, 255), -1)
                cv2.circle(img, pt, 5, skeleton_color, 1)

        # Ángulo del torso
        cv2.putText(img, f"Angulo Torso: {angle:.1f} deg", (x1, y2 + 18),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.42, (255, 255, 255), 1)

        # Etiqueta
        tag = f"{label} | {int(conf*100)}% | {'PELIGRO' if is_fallen else 'OK'}"
        tag_w = len(tag) * 7 + 10
        cv2.rectangle(img, (x1, y1 - 22), (x1 + tag_w, y1), color, -1)
        cv2.putText(img, tag, (x1 + 4, y1 - 6), cv2.FONT_HERSHEY_SIMPLEX, 0.38, (255, 255, 255), 1)
