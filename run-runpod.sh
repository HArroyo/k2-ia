#!/bin/bash
# ==============================================================================
# SCRIPT DE DESPLIEGUE NATIVO DIRECTO PARA RUNPOD (GPU BARE-METAL)
# ==============================================================================

echo "======================================================================"
echo "    INICIANDO DEMO IA K2 SEGURIDAD Y RESGUARDO EN RUNPOD (GPU)        "
echo "======================================================================"

# Determinar directorio raíz del proyecto
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "Directorio del proyecto: $PROJECT_DIR"

# 1. Instalar utilidades esenciales de sistema
apt-get update -y
apt-get install -y ffmpeg libsm6 libxext6 libgl1 libglib2.0-0 curl php-cli php-sqlite3 php-curl nodejs npm redis-server psmisc lsof

# 2. Liberar puertos 4200, 8000, 8001, 3001 de procesos anteriores
echo "[1/4] Liberando puertos de red y cerrando procesos anteriores..."
fuser -k -9 4200/tcp 8000/tcp 8001/tcp 3001/tcp 2>/dev/null || true
kill -9 $(lsof -t -i:4200 -i:8000 -i:8001 -i:3001) 2>/dev/null || true
pkill -9 -f "uvicorn" 2>/dev/null || true
pkill -9 -f "main.py" 2>/dev/null || true
pkill -9 -f "server.js" 2>/dev/null || true
pkill -9 -f "http.server" 2>/dev/null || true
pkill -9 -f "php" 2>/dev/null || true
sleep 2

# 3. Iniciar servidor Redis local
echo "[2/4] Iniciando Redis Server..."
service redis-server start || redis-server --daemonize yes

# 4. Iniciar Motor IA Python en background (Puerto 8001)
echo "[3/4] Iniciando Motor de Inferencia IA (Python + PyTorch GPU + SecVisor v6)..."
cd "$PROJECT_DIR/ai-engine"
pip install -r requirements.txt

# 4.1. Reconstruir pesos binarios de SecVisor v6 (VLM) desde partes del repositorio
SECVISOR_DIR="$PROJECT_DIR/ai-engine/models/partners/secvisor-v6"
mkdir -p "$SECVISOR_DIR"
if [ ! -f "$SECVISOR_DIR/model.safetensors" ] || [ $(stat -c%s "$SECVISOR_DIR/model.safetensors" 2>/dev/null || echo 0) -lt 400000000 ]; then
    echo "[VLM] Reconstruyendo pesos SecVisor v6 desde partes locales del repositorio..."
    cat "$SECVISOR_DIR"/model.safetensors.part_* > "$SECVISOR_DIR/model.safetensors"
    echo "[VLM] Modelo SecVisor v6 ensamblado exitosamente ($(stat -c%s "$SECVISOR_DIR/model.safetensors") bytes)."
fi

nohup python3 main.py > /workspace/ai_engine.log 2>&1 &
echo "Motor IA ejecutándose en puerto 8001 (Log: /workspace/ai_engine.log)"

# 5. Iniciar Backend API Laravel / QueryBuilder (Puerto 8000)
cd "$PROJECT_DIR/backend"
nohup php -S 0.0.0.0:8000 -t public > /workspace/backend.log 2>&1 &
echo "Backend API ejecutándose en puerto 8000 (Log: /workspace/backend.log)"

# 6. Iniciar Pasarela Realtime Socket.io (Puerto 3001)
cd "$PROJECT_DIR/realtime"
npm install --cache /tmp/npm-cache --no-bin-links --loglevel=error || true
nohup node server.js > /workspace/realtime.log 2>&1 &
echo "Realtime Gateway ejecutándose en puerto 3001 (Log: /workspace/realtime.log)"

# 7. Servir Frontend Dashboard Angular Pre-Compilado (Puerto 4200)
echo "[4/4] Iniciando Frontend Dashboard K2 (Bundle de Producción)..."
cd "$PROJECT_DIR/frontend/dist/k2-seguridad-frontend"
nohup python3 -m http.server 4200 --bind 0.0.0.0 > /workspace/frontend.log 2>&1 &
echo "Frontend Dashboard ejecutándose en puerto 4200 (Log: /workspace/frontend.log)"

echo ""
echo "======================================================================"
echo " [OK] TODOS LOS SERVICIOS ESTÁN CORRIENDO EN RUNPOD:"
echo " - Frontend Dashboard:    Puerto 4200 (Listo al 100%)"
echo " - Motor IA Stream:       Puerto 8001 (/api/stream/video)"
echo " - Backend API:           Puerto 8000 (/api)"
echo " - Realtime Gateway:      Puerto 3001"
echo "======================================================================"
