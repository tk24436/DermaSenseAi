# ============================================================
#  DermaSense AI — One-Command Dev Launcher
#  Starts all services in separate terminal windows
# ============================================================

$ROOT = Split-Path -Parent $MyInvocation.MyCommand.Definition

# Hardcode Java + Maven paths (works before terminal restart)
$JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-17.0.20.101-hotspot"
$MAVEN_BIN = "C:\Tools\maven\bin\mvn.cmd"
$env:JAVA_HOME = $JAVA_HOME
$env:PATH = "$env:PATH;$JAVA_HOME\bin;C:\Tools\maven\bin"

Write-Host ""
Write-Host "  ============================================" -ForegroundColor Cyan
Write-Host "    DermaSense AI  --  Full Stack Launcher   " -ForegroundColor Cyan
Write-Host "  ============================================" -ForegroundColor Cyan
Write-Host "  Starting services..." -ForegroundColor DarkGray
Write-Host ""

# ── 0. MongoDB check / auto-start ────────────────────────────
$mongoPortOpen = $false
try {
    $tcp = New-Object System.Net.Sockets.TcpClient
    $async = $tcp.BeginConnect("127.0.0.1", 27017, $null, $null)
    if ($async.AsyncWaitHandle.WaitOne(500, $false) -and $tcp.Connected) {
        $mongoPortOpen = $true
        $tcp.EndConnect($async)
    }
    $tcp.Close()
} catch {}

if (-not $mongoPortOpen) {
    Write-Host "  [0/3] Starting MongoDB on port 27017..." -ForegroundColor Yellow
    $dbDir = Join-Path $ROOT "backend\data\db"
    if (-not (Test-Path $dbDir)) { New-Item -ItemType Directory -Path $dbDir -Force | Out-Null }
    $mongodExe = "C:\Program Files\MongoDB\Server\8.2\bin\mongod.exe"
    if (Test-Path $mongodExe) {
        Start-Process $mongodExe -ArgumentList "--dbpath `"$dbDir`"", "--port", "27017", "--wiredTigerCacheSizeGB", "0.25", "--setParameter", "diagnosticDataCollectionEnabled=false" -WindowStyle Hidden
        Start-Sleep -Seconds 1
    }
} else {
    Write-Host "  [0/3] MongoDB already running on port 27017." -ForegroundColor DarkGray
}

# ── 1. AI Service (FastAPI on port 8000) ─────────────────────
Write-Host "  [1/3] Launching AI Service (FastAPI)  ->  http://127.0.0.1:8000" -ForegroundColor Magenta
Start-Process powershell -ArgumentList "-NoExit", "-Command", @"
  `$host.UI.RawUI.WindowTitle = 'DermaSense -- AI Service :8000'
  Write-Host '[ AI SERVICE ] FastAPI starting...' -ForegroundColor Magenta
  Set-Location '$ROOT\ai-service'
  if (Test-Path '.\venv\Scripts\Activate.ps1') {
    Write-Host '  Using local venv...' -ForegroundColor DarkGray
    & '.\venv\Scripts\Activate.ps1'
  }
  python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
"@

Start-Sleep -Milliseconds 500

# ── 2. Frontend (Vite on port 5173) ──────────────────────────
Write-Host "  [2/3] Launching Frontend (React+Vite)  ->  http://localhost:5173" -ForegroundColor Blue
Start-Process powershell -ArgumentList "-NoExit", "-Command", @"
  `$host.UI.RawUI.WindowTitle = 'DermaSense -- Frontend :5173'
  Write-Host '[ FRONTEND ] Vite dev server starting...' -ForegroundColor Blue
  Set-Location '$ROOT\frontend'
  npm run dev
"@

Start-Sleep -Milliseconds 500

# ── 3. Backend (Spring Boot on port 8080) ────────────────────
Write-Host "  [3/3] Launching Backend (Spring Boot)  ->  http://localhost:8080" -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-File", "$ROOT\start_backend.ps1", "$ROOT\backend"

Write-Host ""
Write-Host "  All services launched in separate windows!" -ForegroundColor Green
Write-Host ""
Write-Host "  Frontend    ->  http://localhost:5173       (open this in browser)" -ForegroundColor White
Write-Host "  Backend     ->  http://localhost:8080       (Spring Boot Auth API)" -ForegroundColor White
Write-Host "  Backend API ->  http://localhost:8080/swagger-ui/index.html" -ForegroundColor White
Write-Host "  AI Service  ->  http://127.0.0.1:8000" -ForegroundColor White
Write-Host "  AI Docs     ->  http://127.0.0.1:8000/docs  (Swagger)" -ForegroundColor White
Write-Host "  Database    ->  mongodb://localhost:27017/dermasense" -ForegroundColor White
Write-Host ""
