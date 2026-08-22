# ESPECIFICACIÓN TÉCNICA Y GUÍA DE IMPLEMENTACIÓN: DEMO IA K2 SEGURIDAD Y RESGUARDO

---

## 1. RESUMEN DEL PROYECTO
Plataforma web modular de analítica de video basada en Inteligencia Artificial para monitoreo en tiempo real (Cámara Xiaomi Smart C500 vía MediaMTX) y análisis forense interactivo (video subido procesado en tiempo de reproducción). El sistema procesa un único parámetro de análisis a la vez según la selección del operador.

---

## 2. LINEAMIENTOS OBLIGATORIOS DE DESARROLLO (NO NEGOCIABLES)

* **Frontend:** Angular 17+ (Stand-alone components, Signals, Tailwind CSS).
* **Backend API & Transacciones:** Laravel 11+.
  * **REGLA ESTRICTA DE BASE DE DATOS:** Queda terminantemente prohibido el uso de Eloquent ORM para operaciones del negocio. **Utilizar exclusivamente QueryBuilder (`DB::table(...)`)** para todas las consultas, inserciones, actualizaciones y reportes. Eloquent solo está permitido para la integración interna de autenticación con Laravel Sanctum si aplica.
* **Motor de Inferencia IA:** Python 3.10+ con FastAPI, PyTorch (CUDA 12.x habilitado), OpenCV y TensorRT.
* **Broker & Caché:** Redis (Pub/Sub para eventos y colas de tareas).
* **Tiempo Real:** Socket.io / WebSockets bidireccionales.
* **Servidor Streaming:** MediaMTX (RTSP/WebRTC/HLS).
* **Infraestructura Cloud:** Instancia RunPod (NVIDIA RTX 4090 - 24GB VRAM).

---

## 3. ARQUITECTURA DE INFRAESTRUCTURA (RUNPOD & DOCKER)

**Estructura de Contenedores:**

* **k2-mediamtx:** Ingesta de flujo RTSP de la cámara Xiaomi local y entrega de stream WebRTC/RTSP de baja latencia.
* **k2-ai-engine (FastAPI + GPU):**
  * Captura RTSP desde MediaMTX o lee archivo de video subido.
  * Aplica el pipeline del módulo activo frame por frame.
  * Publica frames procesados vía WebRTC/MJPEG Stream y eventos JSON a Redis.
  * Guarda snapshots JPG de evidencia en almacenamiento compartido (/storage/snapshots/).
* **k2-backend (Laravel API):**
  * Consume eventos desde Redis o endpoints de FastAPI.
  * Persiste métricas, bitácora de alertas y rutas de snapshots usando QueryBuilder (`DB::table()`).
  * Controla listas blancas/negras, parámetros de zonas y catálogos.
* **k2-realtime (Node.js + Socket.io o Laravel Reverb):**
  * Conecta con Redis Pub/Sub y emite eventos en tiempo real al frontend de Angular.
* **k2-database (PostgreSQL / MySQL):** Base de datos relacional para auditoría e identidades.

---

## 4. ESPECIFICACIÓN DE MÓDULOS DE INTELIGENCIA ARTIFICIAL (PYTHON)

El microservicio opera en modo "Single-Pipeline" (se activa solo una parametrización a la vez para optimizar la GPU):

**MÓDULO 1: SAFETY (Seguridad Ocupacional)**
* **Uso de Casco y Chaleco:**
  * Modelo: YOLOv8x / YOLOv11x fine-tuned para detección de EPP.
  * Clases: person, helmet, no_helmet, vest, no_vest.
  * Lógica: Bounding box de la persona debe contener o solapar un bbox de casco en su tercio superior y chaleco en su tercio medio. Si falta alguno, gatillar alerta.
* **Permanencia en Área Designada:**
  * Algoritmo: Definición de polígonos ROI configurables desde el dashboard. Tracking de personas con ByteTrack.
  * Condición: Cálculo de inclusión de punto inferior del bounding box (cv2.pointPolygonTest). Alerta por invasión de zona no autorizada o tiempo de permanencia excedido.
* **Estabilidad y Detección de Caídas:**
  * Modelo: YOLOv8-Pose / MediaPipe Pose.
  * Keypoints monitoreados: Cabeza, hombros, caderas, rodillas, tobillos.
  * Disparador de Alerta: Vector angular torso-suelo menor a 35 grados o variación brusca de la coordenada Y del centro de masa articular en menos de 0.5s seguido de inactividad en plano horizontal.

**MÓDULO 2: SECURITY (Seguridad Patrimonial)**
* **Identificación de Placas (LPR/ANPR):**
  * Pipeline: YOLO para detección de placas vehiculares + OCR (PaddleOCR o Fast-Plate-OCR).
  * Cruce de datos: Comparación inmediata del texto contra la tabla vehiculos_listas (QueryBuilder).
* **Reconocimiento Facial & Blacklist / Whitelist:**
  * Pipeline: InsightFace (RetinaFace + ArcFace).
  * Extracción de vector embedding de 512 dimensiones por rostro detectado.
  * Comparación: Similitud Coseno contra base de datos de rostros registrados. Categorización inmediata: Permitido, Sospechoso (Blacklist), No Registrado.
* **Accesorios Prohibidos (Gorras, Lentes oscuros, Mascarillas):**
  * Extracción del crop de cabeza/rostro.
  * Clasificación multietiqueta para detectar prendas que impidan la identificación en zonas restringidas.
* **Características Físicas y Atributos:**
  * Extracción de atributos de persona: Color dominante de prenda superior e inferior (análisis HSV segmentado) y estimación de complexión.

---

## 5. FLUJO DE PROCESAMIENTO FORENSE VS TIEMPO REAL

* **Modo Tiempo Real:**
  1. MediaMTX recibe el flujo de la cámara Xiaomi C500.
  2. Python Engine decodifica el stream RTSP, aplica la inferencia del módulo activo.
  3. Si hay detección crítica: Guarda /storage/snapshots/EVID_{TIMESTAMP}.jpg, inserta en BD vía Laravel y publica evento en Redis.
  4. Envía stream inferido (con bounding boxes dibujados) vía WebRTC/MJPEG hacia Angular.
* **Modo Análisis Forense (Video subido):**
  1. Operador sube video (.mp4, .mkv) desde Angular a Laravel.
  2. Laravel almacena el video y notifica a Python vía API con la parametrización seleccionada.
  3. Python procesa el video a velocidad nativa (o acelerada configurable 1x, 2x), transmitiendo el stream procesado en vivo al visor del frontend.
  4. Los eventos y snapshots se disparan y renderizan en el timeline interactivo a medida que el video avanza.

---

## 6. ESQUEMA DE BASE DE DATOS Y REGLAS DE BACKEND (LARAVEL)

**Tablas Principales:**
* `eventos_analitica`: id, modulo (safety/security), subtipo (sin_casco, caida, placa_blacklist, etc.), snapshot_path, confianza, coordenadas_json, metadata_json, created_at.
* `personas_resguardo`: id, nombre, documento, tipo_lista (whitelist/blacklist), embedding_facial (JSON/vector), activo, created_at.
* `vehiculos_resguardo`: id, placa, tipo_lista (whitelist/blacklist), propietario, created_at.
* `zonas_monitoreo`: id, nombre, poligono_roi (JSON), regla_activa, created_at.

**Ejemplo de Estilo de Código Laravel (Estricto: QueryBuilder):**
```php
// Inserción de alerta mediante QueryBuilder
DB::table('eventos_analitica')->insert([
    'modulo' => $request->input('modulo'),
    'subtipo' => $request->input('subtipo'),
    'snapshot_path' => $snapshotPath,
    'confianza' => $request->input('confidence'),
    'metadata_json' => json_encode($request->input('metadata')),
    'created_at' => now(),
    'updated_at' => now()
]);
```

---

## 7. DISEÑO DE FRONTEND (ANGULAR) - GUÍA VISUAL K2

El diseño debe apegarse estrictamente al Brandbook de K2 Seguridad y Resguardo:

**Identidad Visual y Paleta de Colores:**
* **Color Principal (Dark Background):** `#000000` (Negro)[cite: 1]
* **Color Secundario (Tarjetas, Paneles, Modales):** `#293d4a` (Gris Azulado Corporativo)[cite: 1]
* **Color de Acento / Selección Tecnológica:** `#00f4ed` (Turquesa Neón)[cite: 1]
* **Color Terciario / Bordes / Hover:** `#008d9b` (Verde Azulado)[cite: 1]
* **Tipografía:** `Poppins` (Pesos: Regular 400, Medium 500, Bold 700)[cite: 1].

**Layout del Dashboard:**
1. **Barra Superior (Header):**
   * Logotipo oficial K2 horizontal sobre fondo negro (respetar área de protección)[cite: 1].
   * Selector de Modo: `[ EN VIVO ]` | `[ FORENSE ]`.
   * Indicador de estado del sistema (FPS, Estado de GPU RunPod, Conexión MediaMTX).
2. **Panel Central (Live Player):**
   * Visor de video de alta definición con canvas superpuesto o stream inferido.
   * En modo forense: Barra de reproducción con marcas de tiempo interactivas donde ocurrieron incidentes.
3. **Panel Lateral Izquierdo (Selector de Parametrización Activa):**
   * Controles de selección de parámetro único:
     * **Safety:** Casco/Chaleco | Área Designada | Estabilidad y Caídas.
     * **Security:** Placas LPR | Reconocimiento Facial & Listas | Accesorios Prohibidos | Características Físicas.
   * *Nota:* La selección de un parámetro desactiva los demás y reconfigura el motor de inferencia inmediatamente.
4. **Panel Lateral Derecho (Feed de Alertas en Tiempo Real):**
   * Lista cronológica inversa con tarjetas compactas: Snapshot en miniatura, etiqueta del tipo de evento, badge de color (Turquesa: OK / Rojo: Blacklist o Caída) y timestamp.
   * Clic en la tarjeta abre modal con el frame completo y detalle del log persistido.
5. **Panel Inferior (Métricas Rápidas):**
   * Contadores del turno: Total detecciones, Infracciones EPP, Alertas Blacklist, Caídas registradas.

---

## 8. ENTREGABLES REQUERIDOS AL AGENTE IA

1. `docker-compose.yml` completo con configuración de red para RunPod (soporte GPU).
2. Repositorio Microservicio Python (`main.py`, `pipeline_manager.py`, `detectors/`).
3. Repositorio Backend Laravel con endpoints API, migraciones de base de datos y controladores implementados con **QueryBuilder**.
4. Repositorio Frontend Angular con configuración de Tailwind (`colors` K2) y servicios de Socket.io / WebRTC integrados.