@echo off
title UniEventos - Iniciando Servidores
color 0A

echo ========================================
echo    UNIEVENTOS - INICIALIZACAO
echo ========================================
echo.
echo Iniciando todos os servidores...
echo.

REM Iniciar Backend
echo [1/3] Iniciando Backend (Node.js)...
start "UniEventos - Backend" cmd /k "cd /d %~dp0backend && node server.js"
timeout /t 2 /nobreak >nul

REM Iniciar Frontend
echo [2/3] Iniciando Frontend (React Dev Server)...
start "UniEventos - Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"
timeout /t 2 /nobreak >nul

REM Iniciar Bridge Biometrico
echo [3/3] Iniciando Bridge Biometrico (FS80H)...
start "UniEventos - Bridge" cmd /k "cd /d %~dp0bridge && node connector_futronic.js"
timeout /t 2 /nobreak >nul

echo.
echo ========================================
echo    SERVIDORES INICIADOS COM SUCESSO!
echo ========================================
echo.
echo Backend:    http://localhost:3000
echo Frontend:   http://localhost:5173
echo Bridge:     ws://localhost:4000
echo.
echo Pressione qualquer tecla para abrir o navegador...
pause >nul

REM Abrir navegador
start http://localhost:5173

echo.
echo Sistema aberto no navegador!
echo.
echo IMPORTANTE: Nao feche esta janela.
echo Para encerrar os servidores, feche as 3 janelas abertas.
echo.
pause
