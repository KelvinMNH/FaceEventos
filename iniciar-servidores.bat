@echo off
title UniEventos - Iniciando Servidores
color 0A

echo ========================================
echo    UNIEVENTOS - INICIALIZACAO
echo ========================================
echo.
:START
echo [0/2] Limpando instancias anteriores...
taskkill /F /IM node.exe /T >nul 2>&1
timeout /t 1 /nobreak >nul
echo.
echo Iniciando servidores...
echo.

REM Iniciar Backend
echo [1/2] Iniciando Backend (Node.js)...
start "UniEventos - Backend" cmd /k "cd /d %~dp0backend && node server.js"
timeout /t 2 /nobreak >nul

REM Iniciar Frontend
echo [2/2] Iniciando Frontend (React Dev Server)...
start "UniEventos - Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"
timeout /t 2 /nobreak >nul

echo.
echo ========================================
echo    SERVIDORES INICIADOS COM SUCESSO!
echo ========================================
echo.
echo Backend:    http://localhost:3000
echo Frontend:   http://localhost:5173
echo.
echo [!] Pressione qualquer tecla para abrir o navegador...
pause >nul

REM Abrir navegador
start http://localhost:5173

echo.
echo Sistema aberto no navegador!
echo.
echo IMPORTANTE: Nao feche esta janela.
echo.
echo ========================================
echo [R] REINICIAR SERVIDORES
echo [S] SAIR
echo ========================================
choice /c RS /m "Escolha uma opcao:"

if errorlevel 2 goto EXIT
if errorlevel 1 goto START

:EXIT
exit
