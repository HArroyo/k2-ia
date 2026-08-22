import cv2
import numpy as np
from pipeline_manager import pipeline_mgr

def test_all_detectors():
    print("=== Iniciando Verificación de Detectores K2 ===")
    
    pipelines = [
        "safety_ppe",
        "safety_roi",
        "safety_fall",
        "security_lpr",
        "security_face",
        "security_accessories",
        "security_attributes"
    ]

    for p in pipelines:
        res = pipeline_mgr.set_active_pipeline(p)
        print(f"[*] Pipeline activado: {p} -> {res}")
        
        # Procesar 5 frames de prueba
        for f in range(5):
            frame, events = pipeline_mgr.process_next_frame()
            assert frame is not None, f"Frame nulo para {p}"
            assert frame.shape == (720, 1280, 3), f"Dimensiones de frame incorrectas: {frame.shape}"
            if events:
                print(f"    [Evento Generado en frame {f}]: {events[0]['subtipo']} (Confianza: {events[0]['confianza']})")

    print("\n[OK] Todos los detectores y el gestor Single-Pipeline verificados exitosamente!")

if __name__ == "__main__":
    test_all_detectors()
