@echo off
setlocal
title AquaFolhas - Area de pedidos
cd /d "%~dp0"

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0iniciar-aquafolhas.ps1" -Area pedido

if errorlevel 1 (
  echo.
  echo O AquaFolhas nao conseguiu abrir.
  echo Consulte os arquivos aqua-servidor-erro.log e aqua-servidor-saida.log nesta pasta.
  echo.
  pause
  exit /b 1
)

endlocal

