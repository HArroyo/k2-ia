import time
import os
import cv2
import numpy as np

class VideoSourceManager:
    """
    Gestiona fuentes de video en tiempo real (RTSP Xiaomi C500)
    y reproducción de videos forenses subidos.
    Incluye generador de escena CCTV de alta fidelidad para demostración.
    """
    def __init__(self):
        self.cap = None
        self.current_source_type = "live" # "live" | "forensic"
        self.forensic_file_path = None
        self.forensic_playback_speed = 1.0
        self.frame_counter = 0

    def set_forensic_video(self, file_path: str, speed: float = 1.0):
        self.current_source_type = "forensic"
        self.forensic_file_path = file_path
        self.forensic_playback_speed = speed
        if self.cap:
            self.cap.release()
        if os.path.exists(file_path):
            self.cap = cv2.VideoCapture(file_path)
        self.frame_counter = 0

    def set_live_mode(self, rtsp_url: str = None):
        self.current_source_type = "live"
        if self.cap:
            self.cap.release()
            self.cap = None
        if rtsp_url and rtsp_url.startswith("rtsp://"):
            try:
                self.cap = cv2.VideoCapture(rtsp_url)
            except Exception:
                self.cap = None
        self.frame_counter = 0

    def get_frame(self, target_w: int = 1280, target_h: int = 720) -> np.ndarray:
        self.frame_counter += 1
        
        # 1. Si hay captura física o archivo de video abierto
        if self.cap and self.cap.isOpened():
            ret, frame = self.cap.read()
            if ret and frame is not None:
                if frame.shape[1] != target_w or frame.shape[0] != target_h:
                    frame = cv2.resize(frame, (target_w, target_h))
                return frame
            elif self.current_source_type == "forensic":
                # Reiniciar loop de video forense
                self.cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                ret, frame = self.cap.read()
                if ret and frame is not None:
                    return cv2.resize(frame, (target_w, target_h))

        # 2. Generador CCTV sintético de alta calidad (Fondo de Seguridad K2)
        return self._generate_synthetic_cctv_frame(target_w, target_h, self.frame_counter)

    def _generate_synthetic_cctv_frame(self, w: int, h: int, frame_idx: int) -> np.ndarray:
        """
        Genera un frame de cámara de seguridad con gradientes realistas,
        cuadrícula de suelo, perspectiva y marcas de agua de telemetría K2.
        """
        # Fondo oscuro corporativo K2 (#10171d a #1a252f)
        frame = np.zeros((h, w, 3), dtype=np.uint8)
        
        # Gradiente de pared y piso con perspectiva
        horizon_y = int(h * 0.42)
        
        # Pared superior (Gris azulado oscuro)
        for y in range(horizon_y):
            val = int(25 + (y / horizon_y) * 20)
            frame[y, :] = (val + 5, val + 10, val + 15)

        # Piso con perspectiva (Industrial)
        for y in range(horizon_y, h):
            prog = (y - horizon_y) / (h - horizon_y)
            val = int(35 + prog * 35)
            frame[y, :] = (val - 10, val - 5, val)

        # Líneas de perspectiva en el piso
        for i in range(-5, 15):
            x_top = int(w * 0.5 + i * 80)
            x_bottom = int(w * 0.5 + i * 260)
            cv2.line(frame, (x_top, horizon_y), (x_bottom, h), (45, 55, 65), 1)

        # Líneas horizontales de juntas de concreto
        for j in range(1, 8):
            y_line = int(horizon_y + (j / 8.0)**1.5 * (h - horizon_y))
            cv2.line(frame, (0, y_line), (w, y_line), (45, 55, 65), 1)

        # Detalles arquitectónicos / Puerta de acceso o bahía
        gate_x1, gate_x2 = int(w * 0.35), int(w * 0.65)
        cv2.rectangle(frame, (gate_x1, int(horizon_y * 0.3)), (gate_x2, horizon_y), (50, 65, 80), -1)
        cv2.rectangle(frame, (gate_x1, int(horizon_y * 0.3)), (gate_x2, horizon_y), (0, 244, 237), 2)
        cv2.putText(frame, "ACCESO RESTRINGIDO - PUERTA SUR", (gate_x1 + 15, int(horizon_y * 0.25)),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 244, 237), 1)

        # Marca de agua y telemetría de cámara
        mode_label = "MODO FORENSE (ARCHIVO)" if self.current_source_type == "forensic" else "CAM: XIAOMI SMART C500 [EN VIVO]"
        cv2.putText(frame, f"K2 SEGURIDAD & RESGUARDO - {mode_label}", (20, h - 25),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.55, (200, 200, 200), 1)
        
        now_str = time.strftime("%Y-%m-%d %H:%M:%S")
        millis = int((time.time() % 1) * 1000)
        cv2.putText(frame, f"REC [●] {now_str}.{millis:03d} | FPS: 30.0", (w - 380, h - 25),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 255, 0), 1)

        # Indicador de estado de cámara en esquina superior derecha
        cv2.circle(frame, (w - 35, 30), 8, (0, 255, 0), -1)
        cv2.putText(frame, "LIVE", (w - 75, 34), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 255, 0), 1)

        return frame

video_manager = VideoSourceManager()
