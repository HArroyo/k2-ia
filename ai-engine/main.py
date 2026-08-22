import asyncio
import os
import shutil
import time
import cv2
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from pydantic import BaseModel

from config import settings
from pipeline_manager import pipeline_mgr
from video_sources import video_manager

app = FastAPI(
    title="K2 AI Engine - Video Analytics",
    description="Motor de Inferencia IA para K2 Seguridad y Resguardo (FastAPI + GPU)",
    version="1.0.0"
)

# Configuración CORS para permitir conexiones desde Angular y Backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PipelineSelectRequest(BaseModel):
    pipeline: str

class ModeSelectRequest(BaseModel):
    mode: str  # "live" | "forensic"
    speed: float = 1.0

class ZoneROIRequest(BaseModel):
    points: list

@app.get("/api/health")
def health_check():
    return {"status": "ok", "app": settings.APP_NAME, "time": time.time()}

@app.get("/api/pipeline/status")
def get_pipeline_status():
    return pipeline_mgr.get_status()

@app.post("/api/pipeline/select")
def select_pipeline(req: PipelineSelectRequest):
    try:
        res = pipeline_mgr.set_active_pipeline(req.pipeline)
        return res
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/mode/select")
def select_mode(req: ModeSelectRequest):
    if req.mode == "live":
        video_manager.set_live_mode(settings.MEDIAMTX_RTSP_URL)
    elif req.mode == "forensic":
        # Check if there are uploaded forensic files
        files = os.listdir(settings.FORENSIC_DIR) if os.path.exists(settings.FORENSIC_DIR) else []
        if files:
            last_file = os.path.join(settings.FORENSIC_DIR, files[-1])
            video_manager.set_forensic_video(last_file, req.speed)
        else:
            video_manager.current_source_type = "forensic"
    return {"status": "success", "mode": req.mode}

@app.post("/api/forensic/upload")
async def upload_forensic_video(file: UploadFile = File(...), speed: float = Form(1.0)):
    os.makedirs(settings.FORENSIC_DIR, exist_ok=True)
    file_path = os.path.join(settings.FORENSIC_DIR, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    video_manager.set_forensic_video(file_path, speed)
    return {
        "status": "success",
        "filename": file.filename,
        "path": file_path,
        "speed": speed
    }

@app.post("/api/zones/roi")
def set_roi_zone(req: ZoneROIRequest):
    return pipeline_mgr.set_roi_polygon(req.points)

@app.get("/api/snapshots/{filename}")
def get_snapshot(filename: str):
    path = os.path.join(settings.SNAPSHOT_DIR, filename)
    if os.path.exists(path):
        return FileResponse(path, media_type="image/jpeg")
    raise HTTPException(status_code=404, detail="Snapshot no encontrado")

def generate_mjpeg_stream():
    """Generador de frames codificados en MJPEG a ~25-30 FPS"""
    while True:
        frame, _ = pipeline_mgr.process_next_frame()
        ret, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 80])
        if not ret:
            continue
        frame_bytes = buffer.tobytes()
        yield (b'--frame\r\n'
               b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
        time.sleep(0.033)  # Approx 30 FPS

@app.get("/api/stream/video")
def video_stream():
    """Endpoint de Video Streaming en tiempo real con inferencia IA superpuesta"""
    return StreamingResponse(
        generate_mjpeg_stream(),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )

@app.get("/api/stream/frame")
def single_frame():
    """Retorna un único frame JPEG procesado"""
    frame, _ = pipeline_mgr.process_next_frame()
    ret, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
    return StreamingResponse(iter([buffer.tobytes()]), media_type="image/jpeg")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=settings.PORT, reload=False)

