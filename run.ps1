$ROOT_DIR = $PSScriptRoot
if (-not $ROOT_DIR) { $ROOT_DIR = (Get-Location).Path }

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  Starting GRIDMIND (FastAPI Backend + Next.js Frontend)" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

# Ensure port 8000 isn't blocked by a stale process
$port8000Conn = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue
if ($port8000Conn) {
    $existingPid = $port8000Conn.OwningProcess | Select-Object -Unique -First 1
    Write-Host "[Info] Port 8000 is already in use by PID $existingPid." -ForegroundColor Yellow
    try {
        $testResp = Invoke-RestMethod -Uri "http://127.0.0.1:8000/api/state" -TimeoutSec 2 -ErrorAction Stop
        Write-Host "[OK] Backend is already running and responsive. Using existing instance." -ForegroundColor Green
    } catch {
        Write-Host "[Notice] Freeing stale process on port 8000 (PID $existingPid)..." -ForegroundColor Yellow
        Stop-Process -Id $existingPid -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 1
        Start-Process powershell -WorkingDirectory "$ROOT_DIR" -ArgumentList "-NoExit", "-Command", "python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload"
        Write-Host "[OK] Started FastAPI backend on http://127.0.0.1:8000" -ForegroundColor Green
    }
} else {
    Write-Host "[Info] Starting FastAPI Backend on port 8000..." -ForegroundColor Cyan
    Start-Process powershell -WorkingDirectory "$ROOT_DIR" -ArgumentList "-NoExit", "-Command", "python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload"
}

# Start Next.js Frontend in current terminal
Set-Location -Path "$ROOT_DIR\frontend"
npm run dev
