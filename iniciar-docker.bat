@echo off
title UniEventos - Docker Edition
color 0B

echo ========================================
echo    UNIEVENTOS - INICIALIZACAO DOCKER
echo ========================================
echo.

echo [1/3] Verificando Docker Desktop...
docker info >nul 2>&1
if errorlevel 1 (
    echo [ERROR] O Docker Desktop nao parece estar rodando.
    echo Por favor, inicie o Docker Desktop e tente novamente.
    pause
    exit /b
)

echo [2/3] Subindo containers (backend e frontend)...
docker-compose up --build -d

if errorlevel 1 (
    echo [ERROR] Falha ao iniciar containers.
    pause
    exit /b
)

echo.
echo [3/3] Aguardando inicializacao...
timeout /t 5 /nobreak >nul

echo ========================================
echo    CONTEINERES INICIADOS COM SUCESSO!
echo ========================================
echo.
echo Backend:    http://localhost:3000/api
echo Frontend:   http://localhost:5174
echo.
echo [!] Pressione qualquer tecla para abrir o navegador...
pause >nul

start http://localhost:5174

echo.
echo Sistema aberto no navegador!
echo Para parar os containers, use: docker-compose down
echo.
pause
