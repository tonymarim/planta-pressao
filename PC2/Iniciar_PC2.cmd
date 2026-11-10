@echo off
cd /d "%~dp0"
if not exist node_modules\node-red\red.js (
  call npm install --no-audit --no-fund
  if errorlevel 1 goto erro
)
if not exist public\index.html (
  call npm run build
  if errorlevel 1 goto erro
)
echo Painel: http://127.0.0.1:1882/
echo Editor: http://127.0.0.1:1882/red/
echo Mantenha a janela aberta. Para encerrar: Ctrl+C.
call npm start
if errorlevel 1 goto erro
exit /b 0
:erro
echo Falha ao iniciar. Confira a mensagem acima e o README.
pause
exit /b 1
