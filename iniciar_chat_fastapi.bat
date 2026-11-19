@echo off
title Servidor WebSocket Chat - FastAPI (ConsultasIUB)
color 0b
echo ====================================================================
echo    INICIANDO SERVIDOR WEBSOCKET EN FASTAPI (PUERTO 8000)
echo    Modulo de Chat en Tiempo Real - ConsultasIUB (Parcial II 50%%)
echo ====================================================================
echo.

cd api_fastapi

echo Verificando dependencias (FastAPI, Uvicorn, WebSockets)...
pip install -r requirements.txt

echo.
echo Iniciando servidor en ws://localhost:8000/ws ...
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload

pause
