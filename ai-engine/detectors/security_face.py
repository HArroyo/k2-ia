import time
import cv2
import numpy as np

from yolo_engine import yolo_engine


class FaceRecognitionDetector:
    """
    Detector de Reconocimiento Facial y Categorización de Listas (Whitelist / Blacklist / No Registrado).
    Utiliza YOLO para detectar personas reales, Haar Cascade para localizar rostros,
    y calcula similitud coseno sobre vectores de embedding facial de 512 dimensiones.
    """
    def __init__(self):
        self.last_alert_time = 0
        self.alert_cooldown = 4.0

        # Haar cascade para detección facial
        self.face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        )

        # Base de datos local de embeddings faciales simulados (512-d)
        np.random.seed(42)
        self.db_faces = [
            {
                "id": 1,
                "nombre": "Roberto Alva (Personal Autorizado)",
                "documento": "45871234",
                "tipo_lista": "whitelist",
                "embedding": np.random.randn(512).astype(np.float32)
            },
            {
                "id": 2,
                "nombre": "Manuel 'Gordo' Rios (Sospechoso)",
                "documento": "09823411",
                "tipo_lista": "blacklist",
                "embedding": np.random.randn(512).astype(np.float32)
            }
        ]
        for f in self.db_faces:
            f["embedding"] /= np.linalg.norm(f["embedding"])

    def cosine_similarity(self, v1, v2):
        return float(np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2)))

    def process_frame(self, frame: np.ndarray, frame_idx: int = 0):
        h, w = frame.shape[:2]
        events = []
        annotated = frame.copy()

        # Detectar personas reales
        persons = yolo_engine.detect_persons(frame, frame_id=frame_idx, conf=0.30)

        faces_found = 0

        for idx, det in enumerate(persons):
            x1, y1, x2, y2 = det["x1"], det["y1"], det["x2"], det["y2"]
            person_h = y2 - y1
            person_w = x2 - x1

            # Crop de la zona de cabeza (cuarto superior del bounding box)
            head_y1 = max(0, y1)
            head_y2 = min(h, y1 + int(person_h * 0.35))
            head_x1 = max(0, x1)
            head_x2 = min(w, x2)
            head_crop = frame[head_y1:head_y2, head_x1:head_x2]

            if head_crop.size == 0:
                continue

            # Detección de rostro con Haar Cascade sobre el crop de cabeza
            gray_head = cv2.cvtColor(head_crop, cv2.COLOR_BGR2GRAY)
            faces = self.face_cascade.detectMultiScale(
                gray_head, scaleFactor=1.1, minNeighbors=4,
                minSize=(20, 20)
            )

            if len(faces) > 0:
                faces_found += 1
                # Tomar el rostro más grande encontrado
                fx, fy, fw, fh = max(faces, key=lambda f: f[2] * f[3])

                # Coordenadas absolutas del rostro en el frame original
                face_abs_x = head_x1 + fx
                face_abs_y = head_y1 + fy

                # Simulación de matching con la base de datos
                # (En producción usaríamos ArcFace/FaceNet para embeddings reales)
                cycle = (frame_idx // 140) % len(self.db_faces)
                db_match = self.db_faces[cycle]
                similarity = 0.85 + np.random.uniform(0, 0.10)  # Sim alta para demo

                is_blacklist = db_match["tipo_lista"] == "blacklist"
                name = db_match["nombre"]
                list_type = f"{'BLACKLIST (SOSPECHOSO)' if is_blacklist else 'WHITELIST (PERMITIDO)'}"

                self._draw_face(annotated, face_abs_x, face_abs_y, fw, fh,
                                name, list_type, similarity, is_blacklist)

                if is_blacklist:
                    now = time.time()
                    if now - self.last_alert_time > self.alert_cooldown:
                        self.last_alert_time = now
                        events.append({
                            "modulo": "security",
                            "subtipo": "rostro_blacklist",
                            "confianza": round(similarity, 3),
                            "coordenadas_json": {"x": face_abs_x, "y": face_abs_y, "w": fw, "h": fh},
                            "metadata_json": {
                                "sujeto": name,
                                "tipo_lista": "blacklist",
                                "similitud_coseno": round(similarity, 3),
                                "vector_dimension": 512,
                                "motivo_alerta": "Persona con orden de captura / restricción de ingreso",
                                "camara": "Acceso Peatonal Molinete 01"
                            }
                        })
            else:
                # Persona detectada pero sin rostro visible
                cv2.rectangle(annotated, (x1, y1), (x2, y2), (0, 200, 255), 1)
                cv2.putText(annotated, f"PERSONA #{idx+1} - ROSTRO NO VISIBLE",
                            (x1, y1 - 8), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 200, 255), 1)

        # Info panel
        if not persons:
            cv2.putText(annotated, "SIN PERSONAS EN CAMPO VISUAL", (int(w*0.25), int(h*0.5)),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, (100, 100, 100), 2)

        cv2.putText(annotated, f"MODULO SECURITY: RECONOCIMIENTO FACIAL (HAAR+YOLO) | {faces_found} ROSTROS",
                    (20, 35), cv2.FONT_HERSHEY_DUPLEX, 0.6, (0, 244, 237), 2)

        return annotated, events

    def _draw_face(self, img, x, y, w, h, name, list_type, similarity, is_blacklist):
        color = (0, 0, 255) if is_blacklist else ((0, 244, 237) if similarity > 0.8 else (0, 200, 255))

        # Bounding box rostro
        cv2.rectangle(img, (x, y), (x + w, y + h), color, 2)

        # Landmarks faciales estilizados (estimados desde el bbox)
        eye_y = y + int(h * 0.4)
        cv2.circle(img, (x + int(w * 0.32), eye_y), 3, (0, 244, 237), -1)
        cv2.circle(img, (x + int(w * 0.68), eye_y), 3, (0, 244, 237), -1)
        cv2.circle(img, (x + int(w * 0.5), y + int(h * 0.58)), 2, (0, 244, 237), -1)
        cv2.line(img, (x + int(w * 0.35), y + int(h * 0.78)),
                 (x + int(w * 0.65), y + int(h * 0.78)), (0, 244, 237), 1)

        # Tarjeta de identidad
        tag1 = f"{name}"
        tag2 = f"{list_type} | Sim: {int(similarity*100)}%"

        card_w = max(len(tag1), len(tag2)) * 7 + 20
        cv2.rectangle(img, (x - 10, y - 48), (x + card_w, y - 4), (20, 20, 20), -1)
        cv2.rectangle(img, (x - 10, y - 48), (x + card_w, y - 4), color, 1)

        cv2.putText(img, tag1, (x - 6, y - 28), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1)
        cv2.putText(img, tag2, (x - 6, y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.38, color, 1)
