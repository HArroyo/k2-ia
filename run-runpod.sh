#!/bin/bash
# ==============================================================================
# SCRIPT DE DESPLIEGUE NATIVO DIRECTO PARA RUNPOD (GPU BARE-METAL)
# ==============================================================================

echo "======================================================================"
echo "    INICIANDO DEMO IA K2 SEGURIDAD Y RESGUARDO EN RUNPOD (GPU)        "
echo "======================================================================"

# Actualizar paquetes básicos del sistema si no están presentes
apt-get update -y
apt-get install -y ffmpeg libsm6 libxext6 libgl1 libglib2.0-0 curl php-cli php-sqlite3 php-curl nodejs npm redis-server

# Iniciar servidor Redis local
echo "[1/5] Iniciando Redis Server..."
service redis-server start || redis-server --daemonize yes

# 1. Instalar requerimientos de Python AI Engine
echo "[2/5] Configurando Motor de Inferencia IA (Python + PyTorch GPU)..."
cd /workspace/k2-demo/ai-engine
pip install -r requirements.txt

# Iniciar Motor IA en background (Puerto 8001)
nohup python3 main.py --host 0.0.0.0 --port 8001 > /workspace/ai_engine.log 2>&1 &
echo "Motor IA ejecutándose en puerto 8001 (Log: /workspace/ai_engine.log)"

# 2. Iniciar Backend API Laravel / QueryBuilder (Puerto 8000)
echo "[3/5] Iniciando Backend API..."
cd /workspace/k2-demo/backend
nohup php -S 0.0.0.0:8000 -t public > /workspace/backend.log 2>&1 &
echo "Backend API ejecutándose en puerto 8000 (Log: /workspace/backend.log)"

# 3. Iniciar Pasarela Realtime Socket.io (Puerto 3001)
echo "[4/5] Configurando e iniciando Pasarela Realtime..."
cd /workspace/k2-demo/realtime
npm install --production
nohup node server.js > /workspace/realtime.log 2>&1 &
echo "Realtime Gateway ejecutándose en puerto 3001 (Log: /workspace/realtime.log)"

# 4. Iniciar Frontend Dashboard Angular (Puerto 4200 / 80)
echo "[5/5] Configurando e iniciando Frontend Dashboard K2..."
cd /workspace/k2-demo/frontend
npm install
nohup npx -y http-server dist/k2-seguridad-frontend -p 4200 --host 0.0.0.0 --cors > /workspace/frontend.log 2>&1 &
echo "Frontend Dashboard ejecutándose en puerto 4200 (Log: /workspace/frontend.log)"

echo ""
echo "======================================================================"
echo " [OK] TODOS LOS SERVICIOS ESTÁN CORRIENDO EN RUNPOD:"
echo " - Frontend Dashboard:    http://0.0.0.0:4200 (o tu RunPod Proxy Port 4200)"
echo " - Motor IA Stream:       http://0.0.0.0:8001/api/stream/video"
echo " - Backend API:           http://0.0.0.0:8000/api"
echo " - Realtime Gateway:      http://0.0.0.0:3001"
echo "======================================================================"
