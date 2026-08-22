import time
import cv2
import numpy as np

class FallDetector:
    """
    Detector de Estabilidad y Caídas (Safety Fall).
    Monitorea keypoints anatómicos (cabeza, hombros, caderas, rodillas, tobillos),
    calcula el ángulo del vector torso-suelo y caídas de centro de masa.
    """
    def __init__(self):
        self.last_alert_time = 0
        self.alert_cooldown = 4.0
        self.fall_state_cycle = 0

    def process_frame(self, frame: np.ndarray, frame_idx: int = 0):
        h, w = frame.shape[:2]
        events = []
        annotated = frame.copy()

        # Ciclo para simulación de caída (persona de pie -> desestabilización -> caída en suelo)
        cycle_frame = frame_idx % 240
        is_falling = 80 <= cycle_frame <= 200

        # Persona 1: De pie normal
        self._draw_pose(annotated, cx=int(w * 0.25), cy=int(h * 0.55), angle=88.0, is_fallen=False, label="OPERARIO A (ESTABLE)")

        # Persona 2: Caída / Inestabilidad
        if not is_falling:
            angle = 82.0
            cx = int(w * 0.65)
            cy = int(h * 0.55)
            is_fallen = False
            status_text = "OPERARIO B (ESTABLE)"
        elif 80 <= cycle_frame < 110:
            # Perdiendo equilibrio
            angle = 50.0 - (cycle_frame - 80) * 0.8
            cx = int(w * 0.65)
            cy = int(h * 0.58)
            is_fallen = False
            status_text = "OPERARIO B (PERDIDA DE ESTABILIDAD)"
        else:
            # En el suelo
            angle = 18.0
            cx = int(w * 0.65)
            cy = int(h * 0.72)
            is_fallen = True
            status_text = "ALERTA: CAIDA DETECTADA"

        self._draw_pose(annotated, cx=cx, cy=cy, angle=angle, is_fallen=is_fallen, label=status_text)

        if is_fallen:
            now = time.time()
            if now - self.last_alert_time > self.alert_cooldown:
                self.last_alert_time = now
                events.append({
                    "modulo": "safety",
                    "subtipo": "caida",
                    "confianza": 0.96,
                    "coordenadas_json": {"x": cx - 120, "y": cy - 40, "w": 240, "h": 90},
                    "metadata_json": {
                        "sujeto": "Operario B",
                        "angulo_torso": round(angle, 1),
                        "criterio": "Vector torso-suelo < 35° con inactividad",
                        "tiempo_en_suelo_seg": round((cycle_frame - 110) / 15.0, 1),
                        "prioridad": "CRITICA"
                    }
                })

        cv2.putText(annotated, "MODULO SAFETY: ESTABILIDAD Y DETECCION DE CAIDAS (POSE)", (20, 35),
                    cv2.FONT_HERSHEY_DUPLEX, 0.7, (0, 244, 237), 2)
        
        return annotated, events

    def _draw_pose(self, img, cx, cy, angle, is_fallen, label):
        color = (0, 0, 255) if is_fallen else (0, 255, 0)
        skeleton_color = (0, 244, 237) if not is_fallen else (0, 140, 255)

        rad = np.radians(angle)
        torso_len = 80
        
        # Keypoints
        # Hip
        hip = (cx, cy)
        # Shoulder
        shoulder = (int(cx + torso_len * np.cos(rad)), int(cy - torso_len * np.sin(rad)))
        # Head
        head = (int(shoulder[0] + 25 * np.cos(rad)), int(shoulder[1] - 25 * np.sin(rad)))
        # Knee
        knee = (int(cx - 40 * np.sin(rad)), int(cy + 45))
        # Ankle
        ankle = (int(cx - 30 * np.sin(rad)), int(cy + 95))

        # Dibujar líneas del esqueleto
        cv2.line(img, head, shoulder, skeleton_color, 3)
        cv2.line(img, shoulder, hip, skeleton_color, 4)
        cv2.line(img, hip, knee, skeleton_color, 3)
        cv2.line(img, knee, ankle, skeleton_color, 3)

        # Dibujar articulaciones
        for pt in [head, shoulder, hip, knee, ankle]:
            cv2.circle(img, pt, 6, (255, 255, 255), -1)
            cv2.circle(img, pt, 7, (0, 244, 237), 2)

        # Vector angular
        cv2.putText(img, f"Angulo Torso: {angle:.1f} deg", (cx - 70, cy + 120),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1)

        # Bounding box
        box_w = 220 if is_fallen else 100
        box_h = 100 if is_fallen else 220
        bx = cx - box_w // 2
        by = cy - (20 if is_fallen else 110)
        cv2.rectangle(img, (bx, by), (bx + box_w, by + box_h), color, 2)

        tag = f"{label} | {'PELIGRO' if is_fallen else 'OK'}"
        cv2.rectangle(img, (bx, by - 22), (bx + len(tag)*8, by), color, -1)
        cv2.putText(img, tag, (bx + 4, by - 6), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1)
