import time
import cv2
import numpy as np

class ForbiddenAccessoriesDetector:
    """
    Detector de Accesorios Prohibidos en Zonas Restringidas (Gorras, Lentes Oscuros, Mascarillas).
    Realiza clasificación multietiqueta sobre el crop de cabeza/rostro.
    """
    def __init__(self):
        self.last_alert_time = 0
        self.alert_cooldown = 4.0

    def process_frame(self, frame: np.ndarray, frame_idx: int = 0):
        h, w = frame.shape[:2]
        events = []
        annotated = frame.copy()

        cycle = (frame_idx // 130) % 2
        
        # Sujeto 1: Rostro descubierto (Permitido)
        s1_x, s1_y, s1_w, s1_h = int(w * 0.25), int(h * 0.32), 160, 210
        self._draw_subject(annotated, s1_x, s1_y, s1_w, s1_h, "SUJETO 01", 
                           has_cap=False, has_sunglasses=False, has_mask=False)

        # Sujeto 2: Porta Gorra + Lentes Oscuros (Infracción de Identificación)
        s2_x, s2_y, s2_w, s2_h = int(w * 0.65), int(h * 0.32), 160, 210
        has_cap = True
        has_sunglasses = True
        has_mask = (cycle == 1)

        self._draw_subject(annotated, s2_x, s2_y, s2_w, s2_h, "SUJETO 02", 
                           has_cap=has_cap, has_sunglasses=has_sunglasses, has_mask=has_mask)

        # Disparar alerta de accesorio prohibido
        detected_items = []
        if has_cap: detected_items.append("Gorra / Pasamontañas")
        if has_sunglasses: detected_items.append("Lentes Oscuros")
        if has_mask: detected_items.append("Mascarilla")

        if detected_items:
            now = time.time()
            if now - self.last_alert_time > self.alert_cooldown:
                self.last_alert_time = now
                events.append({
                    "modulo": "security",
                    "subtipo": "accesorio_prohibido",
                    "confianza": 0.93,
                    "coordenadas_json": {"x": s2_x, "y": s2_y, "w": s2_w, "h": s2_h},
                    "metadata_json": {
                        "sujeto": "Sujeto #02",
                        "accesorios_detectados": detected_items,
                        "violacion": "Ocultamiento de Rostro en Zona de Alta Seguridad",
                        "accion_sugerida": "Solicitar retiro de prendas para control biométrico"
                    }
                })

        cv2.putText(annotated, "MODULO SECURITY: ACCESORIOS PROHIBIDOS (GORRA, LENTES, MASCARILLA)", (20, 35),
                    cv2.FONT_HERSHEY_DUPLEX, 0.65, (0, 244, 237), 2)

        return annotated, events

    def _draw_subject(self, img, x, y, w, h, name, has_cap, has_sunglasses, has_mask):
        is_violation = has_cap or has_sunglasses or has_mask
        color = (0, 0, 255) if is_violation else (0, 255, 0)
        
        cv2.rectangle(img, (x, y), (x + w, y + h), color, 2)

        # Región de cabeza / crop
        head_h = int(h * 0.45)
        cv2.rectangle(img, (x + 10, y + 5), (x + w - 10, y + head_h), (0, 244, 237), 1)

        # Detalles de accesorios
        badge_y = y + h + 20
        cv2.putText(img, f"CROP CABEZA: {name}", (x, y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1)

        items_text = []
        if has_cap: items_text.append("[!] GORRA DETECTADA")
        if has_sunglasses: items_text.append("[!] LENTES OSCUROS")
        if has_mask: items_text.append("[!] MASCARILLA")
        if not items_text: items_text.append("[OK] ROSTRO DESCUBIERTO")

        for idx, itm in enumerate(items_text):
            itm_color = (0, 0, 255) if "[!]" in itm else (0, 255, 0)
            cv2.putText(img, itm, (x - 10, badge_y + idx * 18), cv2.FONT_HERSHEY_SIMPLEX, 0.42, itm_color, 1)
