@echo off
REM ============================================
REM  NEXUS - Rodar o projeto (Windows)
REM  Duplo clique neste arquivo = servidor no ar
REM ============================================
cd /d "%~dp0"

if not exist node_modules (
  echo [1/2] Instalando dependencias ^(so acontece na 1a vez^)...
  call npm install
)

echo [2/2] Iniciando o NEXUS em http://localhost:5173 ...
echo.
npm run dev
pause
