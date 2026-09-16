@echo off
REM ============================================
REM  NEXUS - Atualizar o codigo (Windows)
REM  Baixa as novidades do GitHub e garante as
REM  dependencias. Use sempre que eu avisar que
REM  publiquei algo novo!
REM ============================================
cd /d "%~dp0"

echo [1/2] Baixando atualizacoes do GitHub...
git pull
if errorlevel 1 (
  echo.
  echo Ops, deu conflito ou erro no git pull. Me chama no chat!
  pause
  exit /b 1
)

echo [2/2] Conferindo dependencias...
call npm install

echo.
echo ============================================
echo  Tudo atualizado! Se o servidor estiver
echo  aberto, a pagina ja recarrega sozinha.
echo ============================================
pause
