# ==============================================================================
# SCRIPT DE INICIO RÁPIDO: DEMO IA K2 SEGURIDAD Y RESGUARDO
# Inicia todos los servicios del ecosistema K2 en procesos paralelos
# ==============================================================================

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "       K2 SEGURIDAD Y RESGUARDO - PLATAFORMA DE VIDEO ANALITICA IA     " -ForegroundColor Yellow
Write-Host "======================================================================" -ForegroundColor Cyan

$RootPath = Split-Path -Parent $MyInvocation.MyCommand.Path

# 1. Iniciar Microservicio IA (FastAPI / OpenCV / PyTorch)
Write-Host "[1/4] Iniciando Motor de Inferencia IA (Python FastAPI :8001)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$RootPath\ai-engine'; python main.py" -WindowStyle Normal

# 2. Iniciar Backend API (Laravel / QueryBuilder Estricto)
Write-Host "[2/4] Iniciando Backend API Laravel (:8000)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$RootPath\backend'; php -S 0.0.0.0:8000 -t public" -WindowStyle Normal

# 3. Iniciar Pasarela Realtime (Node.js + Socket.io :3001)
Write-Host "[3/4] Iniciando Pasarela Realtime WebSockets (:3001)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$RootPath\realtime'; node server.js" -WindowStyle Normal

# 4. Iniciar Frontend Angular 17+ (:4200)
Write-Host "[4/4] Iniciando Frontend Angular 17+ (:4200)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$RootPath\frontend'; npm start" -WindowStyle Normal

Write-Host ""
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host " [OK] Todos los servicios han sido lanzados en ventanas independientes:" -ForegroundColor Green
Write-Host "  - Frontend Dashboard:    http://localhost:4200" -ForegroundColor Yellow
Write-Host "  - Backend Laravel API:   http://localhost:8000/api" -ForegroundColor Yellow
Write-Host "  - Motor Inferencia IA:   http://localhost:8001/api/stream/video" -ForegroundColor Yellow
Write-Host "  - Realtime WebSockets:   http://localhost:3001" -ForegroundColor Yellow
Write-Host "======================================================================" -ForegroundColor Cyan
