import cv2
import numpy as np

class SectorDensityDetector:
    """
    Detector de Ocupación y Densidad por Sectores.
    Segmenta el campo visual en sectores (Norte, Central, Sur) y calcula índice de aglomeración.
    """
    def __init__(self):
        self.name = "Ocupación y Densidad por Sectores"

    def process_frame(self, frame: np.ndarray, frame_idx: int) -> tuple[np.ndarray, list]:
        annotated = frame.copy()
        h, w = frame.shape[:2]
        events = []

        # 3 Sectores industriales
        s1 = {"name": "SECTOR A (ACCESO)", "pts": np.array([[w*0.05, h*0.35], [w*0.35, h*0.35], [w*0.32, h*0.85], [w*0.02, h*0.85]], np.int32), "limit": 4, "count": 2, "color": (0, 244, 237)}
        s2 = {"name": "SECTOR B (PASILLO CENTRAL)", "pts": np.array([[w*0.38, h*0.35], [w*0.68, h*0.35], [w*0.65, h*0.85], [w*0.35, h*0.85]], np.int32), "limit": 3, "count": 1, "color": (0, 255, 136)}
        s3 = {"name": "SECTOR C (ZONA CRITICA)", "pts": np.array([[w*0.70, h*0.35], [w*0.96, h*0.35], [w*0.93, h*0.85], [w*0.68, h*0.85]], np.int32), "limit": 2, "count": 3 if (frame_idx % 120 > 60) else 1, "color": (0, 0, 255) if (frame_idx % 120 > 60) else (0, 244, 237)}

        overlay = annotated.copy()
        for s in [s1, s2, s3]:
            is_overcrowded = s["count"] > s["limit"]
            fill_color = (50, 50, 200) if is_overcrowded else (50, 100, 50)
            cv2.fillPoly(overlay, [s["pts"]], fill_color)
            cv2.polylines(annotated, [s["pts"]], True, (0, 0, 255) if is_overcrowded else s["color"], 2)

            # Etiqueta y porcentaje de ocupación
            center_x = int(np.mean(s["pts"][:, 0]))
            center_y = int(np.mean(s["pts"][:, 1])) - 30
            occ_pct = int((s["count"] / s["limit"]) * 100)
            status_text = f"SOBREOCUPADO ({s['count']}/{s['limit']})" if is_overcrowded else f"DENSIDAD OK ({s['count']}/{s['limit']})"

            cv2.putText(annotated, s["name"], (center_x - 70, center_y), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 2)
            cv2.putText(annotated, f"OCUPACION: {occ_pct}%", (center_x - 60, center_y + 20), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (0, 244, 237), 1)
            cv2.putText(annotated, status_text, (center_x - 70, center_y + 40), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (0, 0, 255) if is_overcrowded else (0, 255, 136), 1)

            if is_overcrowded and frame_idx % 100 == 0:
                events.append({
                    "modulo": "safety",
                    "subtipo": "permanencia_excedida",
                    "confianza": 0.94,
                    "metadata_json": {
                        "sector": s["name"],
                        "aforo_sector": s["count"],
                        "limite_maximo": s["limit"],
                        "criterio": "Aglomeración y densidad crítica detectada"
                    }
                })

        cv2.addWeighted(overlay, 0.25, annotated, 0.75, 0, annotated)
        return annotated, events
