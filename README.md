# DEMO IA K2 SEGURIDAD Y RESGUARDO
### Plataforma Modular de Video Analítica Basada en Inteligencia Artificial

---

## 1. Resumen Ejecutivo

Plataforma integral de analítica de video con IA para **Monitoreo en Tiempo Real** (Cámara Xiaomi Smart C500 vía MediaMTX) y **Análisis Forense Interactivo** (procesamiento de video subido en tiempo de reproducción).

El sistema opera bajo arquitectura **Single-Pipeline**, permitiendo la activación de un único módulo de análisis a la vez para optimizar la GPU (NVIDIA RTX 4090 - 24GB VRAM en RunPod).

---

## 2. Lineamientos y Reglas de Desarrollo Implementadas

* **Frontend:** Angular 17+ (Standalone Components, Signals, Tailwind CSS con paleta corporativa K2 y tipografía `Poppins`).
* **Backend API & Transacciones:** Laravel 11+.
  * **REGLA ESTRICTA DE BASE DE DATOS:** Queda terminantemente prohibido el uso de Eloquent ORM para operaciones del negocio. **Utilizar exclusivamente QueryBuilder (`DB::table(...)`)** para todas las consultas, inserciones, actualizaciones y reportes.
* **Motor de Inferencia IA:** Python 3.10+ con FastAPI, PyTorch (CUDA 12.x habilitado), OpenCV, ByteTrack y TensorRT.
* **Broker & Caché:** Redis (Pub/Sub para eventos `k2:alerts`).
* **Tiempo Real:** Pasarela Socket.io / WebSockets bidireccionales.
* **Servidor Streaming:** MediaMTX (RTSP/WebRTC/HLS).
* **Infraestructura Cloud:** RunPod (NVIDIA RTX 4090).

---

## 3. Módulos de Inteligencia Artificial Implementados

### MÓDULO 1: SAFETY (Seguridad Ocupacional)
1. **Uso de Casco y Chaleco (EPP):**
   - Modelo: YOLOv11x / YOLOv8x fine-tuned.
   - Lógica: Bounding box de la persona debe contener o solapar un bbox de casco en su tercio superior y chaleco en su tercio medio. Si falta alguno, gatillar alerta.
2. **Permanencia en Área Designada (ROI):**
   - Algoritmo: Polígonos ROI configurables, tracking con ByteTrack.
   - Condición: Cálculo de inclusión de punto inferior con `cv2.pointPolygonTest`. Alerta por invasión o permanencia excedida.
3. **Estabilidad y Detección de Caídas:**
   - Modelo: YOLOv8-Pose / MediaPipe Pose.
   - Keypoints: Cabeza, hombros, caderas, rodillas, tobillos.
   - Disparador: Vector angular torso-suelo menor a 35 grados o variación brusca de coordenada Y en < 0.5s con inactividad en plano horizontal.

### MÓDULO 2: SECURITY (Seguridad Patrimonial)
1. **Identificación de Placas (LPR/ANPR):**
   - Pipeline: YOLO Vehículos/Placas + Fast-Plate-OCR / PaddleOCR.
   - Cruce de datos: Comparación inmediata contra la tabla `vehiculos_resguardo` (QueryBuilder).
2. **Reconocimiento Facial & Blacklist / Whitelist:**
   - Pipeline: RetinaFace + ArcFace (InsightFace).
   - Extracción de embedding 512-d y comparación por Similitud Coseno contra base de datos.
3. **Accesorios Prohibidos:**
   - Crop de cabeza y clasificación multietiqueta para detectar gorras, lentes oscuros y mascarillas en accesos restringidos.
4. **Características Físicas y Atributos:**
   - Segmentación HSV de colores dominantes en ropa superior e inferior, y estimación de complexión.

---

## 4. Estructura del Proyecto

```
DEMO/
├── docker-compose.yml              # Orquestación de los 7 contenedores para RunPod / Local
├── mediamtx.yml                    # Servidor RTSP / WebRTC MediaMTX
├── start-demo.ps1 / start-demo.bat # Scripts de inicio rápido en 1 click
├── instrucciones.md                # Especificación técnica base
├── storage/
│   ├── snapshots/                  # Evidencias fotográficas JPG generadas por IA
│   └── forensic_videos/            # Videos subidos para análisis forense
├── ai-engine/                      # Microservicio Python FastAPI + GPU
│   ├── main.py                     # API REST y MJPEG Streamer
│   ├── pipeline_manager.py         # Gestor Single-Pipeline
│   ├── video_sources.py            # RTSP, Forense y Generador CCTV K2
│   ├── redis_client.py             # Publicador a Redis y Persistencia de Snapshots
│   ├── test_engine.py              # Suite de pruebas automatizadas
│   └── detectors/                  # 7 Detectores de Safety y Security
├── backend/                        # Backend API Laravel 11 (QueryBuilder Estricto)
│   ├── app/Http/Controllers/       # Controladores (Analitica, Listas, Zonas, Forense)
│   ├── database/migrations/        # Migraciones (eventos, personas, vehiculos, zonas)
│   ├── database/seeders/           # Datos de prueba (DB::table)
│   ├── routes/api.php              # Rutas REST
│   └── public/index.php            # Entrypoint de alto rendimiento
├── realtime/                       # Pasarela Socket.io / Redis Pub-Sub
│   ├── server.js                   # Servidor Node.js
│   └── package.json
└── frontend/                       # Frontend Angular 17+ (Tailwind K2 Brandbook)
    ├── src/app/
    │   ├── components/             # Header, Param-Selector, Player, Alert-Feed, Metrics-Bar, Alert-Modal
    │   └── services/               # ApiService, SocketService, PipelineStateService (Signals)
    └── tailwind.config.js          # Paleta Oficial K2 (#000000, #293d4a, #00f4ed, #008d9b)
```

---

## 5. Instrucciones de Ejecución

### Opción A: Despliegue en RunPod (Docker Compose con GPU NVIDIA)

1. Clonar el repositorio en la instancia RunPod (con plantilla PyTorch / CUDA 12).
2. Ejecutar:
```bash
docker-compose up -d --build
```
3. Puertos expuestos:
   - **Frontend Dashboard:** `http://<RUNPOD_IP>:4200`
   - **Backend API Laravel:** `http://<RUNPOD_IP>:8000/api`
   - **Motor IA Streaming:** `http://<RUNPOD_IP>:8001/api/stream/video`
   - **MediaMTX RTSP / WebRTC:** `8554` / `8889`

### Opción B: Ejecución Local en Windows

Ejecutar el script de inicio en PowerShell o doble clic en el archivo batch:
```powershell
.\start-demo.ps1
```
o
```cmd
start-demo.bat
```

---

## 6. Endpoints API Principales

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/api/metricas` | KPIs del turno agregados con QueryBuilder |
| `GET` | `/api/eventos` | Listado cronológico inverso de alertas con filtros |
| `POST` | `/api/eventos` | Registro de alerta generado por IA (`DB::table`) |
| `GET` | `/api/listas/personas` | Consulta de personas registradas (Whitelist/Blacklist) |
| `GET` | `/api/listas/vehiculos` | Consulta y cruce de placas vehiculares |
| `POST` | `/api/pipeline/select` | Cambio dinámico de detector activo (Single-Pipeline) |
| `GET` | `/api/stream/video` | Flujo de video MJPEG con inferencia IA superpuesta |
| `POST` | `/api/forensic/upload` | Subida de video para análisis forense interactivo |

---

## 7. Garantía de Cumplimiento de Reglas de Negocio

* [x] **QueryBuilder Estricto:** Toda consulta e inserción a base de datos usa `DB::table(...)`.
* [x] **Single-Pipeline:** Selección de un parámetro desactiva inmediatamente los demás.
* [x] **Brandbook K2:** Diseño exacto con negro `#000000`, gris corporativo `#293d4a`, turquesa neón `#00f4ed`, verde azulado `#008d9b` y tipografía `Poppins`.
* [x] **Tiempo Real:** Sincronización continua de alertas vía WebSockets y visualización en timeline forense.
