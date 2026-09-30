# Helper script launched in the backend terminal window
$JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-17.0.20.101-hotspot"
$env:JAVA_HOME = $JAVA_HOME
$env:PATH = $env:PATH + ";$JAVA_HOME\bin;C:\Tools\maven\bin"

$host.UI.RawUI.WindowTitle = "DermaSense -- Backend :8080"
Write-Host "[ BACKEND ] Spring Boot starting..." -ForegroundColor Green

# Backend path: use passed argument, or fallback to backend subfolder relative to script
$BACKEND = if ($args.Count -gt 0 -and $args[0]) { $args[0] } else { Join-Path $PSScriptRoot "backend" }
Set-Location $BACKEND

# Ensure MongoDB is running on port 27017
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
    Write-Host "[ MONGODB ] Starting local MongoDB instance..." -ForegroundColor Yellow
    $dbDir = Join-Path $BACKEND "data\db"
    if (-not (Test-Path $dbDir)) { New-Item -ItemType Directory -Path $dbDir -Force | Out-Null }
    $mongodExe = "C:\Program Files\MongoDB\Server\8.2\bin\mongod.exe"
    if (Test-Path $mongodExe) {
        Start-Process $mongodExe -ArgumentList "--dbpath `"$dbDir`"", "--port", "27017", "--wiredTigerCacheSizeGB", "0.25", "--setParameter", "diagnosticDataCollectionEnabled=false" -WindowStyle Hidden
        Start-Sleep -Seconds 1
        Write-Host "[ MONGODB ] MongoDB started on port 27017." -ForegroundColor Green
    } else {
        Write-Host "[ MONGODB ] Warning: mongod.exe not found at $mongodExe. Ensure MongoDB is running." -ForegroundColor Red
    }
}

& "C:\Tools\maven\bin\mvn.cmd" spring-boot:run
