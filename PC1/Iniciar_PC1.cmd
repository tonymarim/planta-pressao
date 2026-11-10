@echo off
cd /d "%~dp0"
if not exist node_modules\node-red\red.js (
  echo Instalando dependencias locais...
  call npm install --no-audit --no-fund
  if errorlevel 1 goto erro
)
echo Painel: http://127.0.0.1:1881/
echo Editor Node-RED: http://127.0.0.1:1881/red/
echo Mantenha esta janela aberta. Para encerrar, pressione Ctrl+C.
call npm start
if errorlevel 1 goto erro
exit /b 0
:erro
echo Nao foi possivel iniciar. Confira a mensagem acima.
pause
exit /b 1
