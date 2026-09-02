import cv2
import numpy as np

from yolo_engine import yolo_engine


class SectorDensityDetector:
    """
    Detector de Ocupación y Densidad por Sectores.
    Segmenta el campo visual en sectores y cuenta personas reales detectadas por YOLO en cada uno.
    """
    def __init__(self):
        self.name = "Ocupación y Densidad por Sectores"

    def process_frame(self, frame: np.ndarray, frame_idx: int) -> tuple[np.ndarray, list]:
        annotated = frame.copy()
        h, w = frame.shape[:2]
        events = []

        # Detectar personas reales
        persons = yolo_engine.detect_persons(frame, frame_id=frame_idx, conf=0.30)

        # Definir 3 sectores industriales con sus polígonos
        sectors = [
            {
                "name": "SECTOR A (ACCESO)",
                "pts": np.array([[w*0.05, h*0.35], [w*0.35, h*0.35],
                                 [w*0.32, h*0.85], [w*0.02, h*0.85]], np.int32),
                "limit": 4,
                "color_ok": (0, 244, 237),
            },
            {
                "name": "SECTOR B (PASILLO CENTRAL)",
                "pts": np.array([[w*0.38, h*0.35], [w*0.68, h*0.35],
                                 [w*0.65, h*0.85], [w*0.35, h*0.85]], np.int32),
                "limit": 3,
                "color_ok": (0, 255, 136),
            },
            {
                "name": "SECTOR C (ZONA CRITICA)",
                "pts": np.array([[w*0.70, h*0.35], [w*0.96, h*0.35],
                                 [w*0.93, h*0.85], [w*0.68, h*0.85]], np.int32),
                "limit": 2,
                "color_ok": (0, 244, 237),
            },
        ]

        # Contar personas reales en cada sector usando pointPolygonTest
        for s in sectors:
            count = 0
            for det in persons:
                # Usar el punto inferior central de la persona como anclaje
                foot_pt = (float(det["cx"]), float(det["y2"]))
                if cv2.pointPolygonTest(s["pts"], foot_pt, False) >= 0:
                    count += 1
            s["count"] = count

        # Dibujar sectores con overlay semitransparente
        overlay = annotated.copy()
        for s in sectors:
            is_overcrowded = s["count"] > s["limit"]
            fill_color = (50, 50, 200) if is_overcrowded else (50, 100, 50)
            border_color = (0, 0, 255) if is_overcrowded else s["color_ok"]

            cv2.fillPoly(overlay, [s["pts"]], fill_color)
            cv2.polylines(annotated, [s["pts"]], True, border_color, 2)

            # Etiqueta y porcentaje de ocupación
            center_x = int(np.mean(s["pts"][:, 0]))
            center_y = int(np.mean(s["pts"][:, 1])) - 30
            occ_pct = int((s["count"] / max(s["limit"], 1)) * 100)
            status_text = (f"SOBREOCUPADO ({s['count']}/{s['limit']})" if is_overcrowded
                           else f"DENSIDAD OK ({s['count']}/{s['limit']})")

            cv2.putText(annotated, s["name"], (center_x - 70, center_y),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 2)
            cv2.putText(annotated, f"OCUPACION: {occ_pct}%", (center_x - 60, center_y + 20),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.42, (0, 244, 237), 1)
            cv2.putText(annotated, status_text, (center_x - 70, center_y + 40),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.42,
                        (0, 0, 255) if is_overcrowded else (0, 255, 136), 1)

            if is_overcrowded and frame_idx % 100 == 0:
                events.append({
                    "modulo": "safety",
                    "subtipo": "permanencia_excedida",
                    "confianza": 0.94,
                    "metadata_json": {
                        "sector": s["name"],
                        "aforo_sector": s["count"],
                        "limite_maximo": s["limit"],
                        "criterio": "Aglomeración detectada por conteo YOLO real"
                    }
                })

        cv2.addWeighted(overlay, 0.25, annotated, 0.75, 0, annotated)

        # Dibujar bounding boxes de personas detectadas
        for det in persons:
            cv2.rectangle(annotated, (det["x1"], det["y1"]), (det["x2"], det["y2"]),
                          (0, 244, 237), 1)
            cv2.circle(annotated, (det["cx"], det["y2"]), 4, (0, 255, 255), -1)

        cv2.putText(annotated, "MODULO SAFETY: DENSIDAD POR SECTORES (YOLO REAL)", (20, 35),
                    cv2.FONT_HERSHEY_DUPLEX, 0.65, (0, 244, 237), 2)

        return annotated, events
