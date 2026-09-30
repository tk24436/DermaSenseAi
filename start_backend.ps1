# Detect or set Java + Maven paths
if (-not $env:JAVA_HOME -and (Test-Path "C:\Program Files\Eclipse Adoptium\jdk-17.0.20.101-hotspot")) {
    $env:JAVA_HOME = "C:\Program Files\Eclipse Adoptium\jdk-17.0.20.101-hotspot"
    $env:PATH = "$env:PATH;$env:JAVA_HOME\bin"
}
if ((Get-Command mvn -ErrorAction SilentlyContinue) -eq $null -and (Test-Path "C:\Tools\maven\bin")) {
    $env:PATH = "$env:PATH;C:\Tools\maven\bin"
}

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

if (Get-Command mvn -ErrorAction SilentlyContinue) {
    mvn spring-boot:run
} elseif (Test-Path "C:\Tools\maven\bin\mvn.cmd") {
    & "C:\Tools\maven\bin\mvn.cmd" spring-boot:run
} else {
    Write-Host "Maven not found in PATH or C:\Tools\maven\bin. Please install Maven." -ForegroundColor Red
}
