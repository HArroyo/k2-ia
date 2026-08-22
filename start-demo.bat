@echo off
title K2 SEGURIDAD Y RESGUARDO - LAUNCHER
echo ======================================================================
echo        K2 SEGURIDAD Y RESGUARDO - PLATAFORMA DE VIDEO ANALITICA IA     
echo ======================================================================

set ROOT_DIR=%~dp0

echo [1/4] Iniciando Motor de Inferencia IA Python (FastAPI :8001)...
start "K2 AI Engine" cmd /k "cd /d %ROOT_DIR%ai-engine && python main.py"

echo [2/4] Iniciando Backend API Laravel (:8000)...
start "K2 Backend API" cmd /k "cd /d %ROOT_DIR%backend && php -S 0.0.0.0:8000 -t public"

echo [3/4] Iniciando Pasarela Realtime Socket.io (:3001)...
start "K2 Realtime Gateway" cmd /k "cd /d %ROOT_DIR%realtime && node server.js"

echo [4/4] Iniciando Frontend Angular 17+ (:4200)...
start "K2 Frontend Dashboard" cmd /k "cd /d %ROOT_DIR%frontend && npm start"

echo.
echo ======================================================================
echo  Servicios Iniciados:
echo  - Frontend Dashboard:    http://localhost:4200
echo  - Backend Laravel API:   http://localhost:8000/api
echo  - Motor Inferencia IA:   http://localhost:8001
echo  - Realtime WebSockets:   http://localhost:3001
echo ======================================================================
pause
