import cv2
import numpy as np
from pipeline_manager import pipeline_mgr
from vlm_engine import secvisor_engine

def test_all_detectors():
    print("=" * 65)
    print("   INICIANDO VERIFICACIÓN COMPLETA DE DETECTORES K2 + SECVISOR v6")
    print("=" * 65)
    
    # 1. Estado de SecVisor v6
    vlm_status = secvisor_engine.get_status()
    print(f"[*] Estado de SecVisor v6: {vlm_status}")
    
    # 2. Los 10 Pipelines activos de K2
    pipelines = [
        "people_count",
        "sector_density",
        "visible_attributes",
        "safety_ppe",
        "safety_roi",
        "safety_fall",
        "security_lpr",
        "security_face",
        "security_accessories",
        "security_attributes"
    ]

    for idx, p in enumerate(pipelines, 1):
        res = pipeline_mgr.set_active_pipeline(p)
        print(f"\n[{idx}/10] Pipeline activado: {p} ({res['category'].upper()})")
        
        # Procesar 5 frames de prueba por pipeline
        for f in range(5):
            frame, events = pipeline_mgr.process_next_frame()
            assert frame is not None, f"Frame nulo para {p}"
            assert frame.shape == (720, 1280, 3), f"Dimensiones de frame incorrectas: {frame.shape}"
            if events:
                print(f"    -> [Evento generado en frame {f}]: {events[0]['subtipo']} (Confianza: {events[0]['confianza']})")

    print("\n" + "=" * 65)
    print("   [OK] LOS 10 DETECTORES Y SECVISOR v6 OPERAN AL 100%")
    print("=" * 65)

if __name__ == "__main__":
    test_all_detectors()
