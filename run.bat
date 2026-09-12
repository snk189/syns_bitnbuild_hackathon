@echo off
set "ROOT_DIR=%~dp0"
cd /d "%ROOT_DIR%"

powershell -ExecutionPolicy Bypass -File "%ROOT_DIR%run.ps1"
