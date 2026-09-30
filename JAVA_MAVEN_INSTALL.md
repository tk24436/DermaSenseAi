# Java JDK 17 + Maven 3.9.9 — Installation Guide for DermaSense AI

> This documents the exact steps taken to install Java and Maven on this machine
> so the Spring Boot backend (`backend/`) can be run locally.

---

## ✅ What Was Installed

| Tool | Version | Location |
|---|---|---|
| **Java JDK 17** | 17.0.20.1 (Eclipse Temurin / Adoptium) | `C:\Program Files\Eclipse Adoptium\jdk-17.0.20.101-hotspot\` |
| **Apache Maven** | 3.9.9 | `C:\Tools\maven\` |

---

## Step 1 — Download & Install Java JDK 17

`winget` didn't work (got stuck), so we downloaded the MSI directly via PowerShell:

```powershell
# Download JDK 17 MSI from Adoptium
$url = "https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17.0.13%2B11/OpenJDK17U-jdk_x64_windows_hotspot_17.0.13_11.msi"
$out = "$env:TEMP\jdk17.msi"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
Invoke-WebRequest -Uri $url -OutFile $out -UseBasicParsing

# Install silently
Start-Process msiexec.exe -ArgumentList "/i `"$env:TEMP\jdk17.msi`" /quiet /norestart ADDLOCAL=ALL" -Wait
```

**Verify:**
```powershell
java -version
# openjdk version "17.0.20.1" 2026-08-18
# OpenJDK Runtime Environment Temurin-17.0.20.1+1
```

---

## Step 2 — Download & Install Apache Maven 3.9.9

`winget` does NOT have Apache Maven in its registry. We downloaded and extracted the zip manually:

```powershell
# Download Maven zip
$mavenUrl = "https://archive.apache.org/dist/maven/maven-3/3.9.9/binaries/apache-maven-3.9.9-bin.zip"
$mavenZip = "$env:TEMP\maven.zip"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
Invoke-WebRequest -Uri $mavenUrl -OutFile $mavenZip -UseBasicParsing

# Extract to C:\Tools\maven
New-Item -ItemType Directory -Path "C:\Tools" -Force
Expand-Archive -Path $mavenZip -DestinationPath "C:\Tools" -Force
Rename-Item "C:\Tools\apache-maven-3.9.9" "maven"
```

**Verify:**
```powershell
& "C:\Tools\maven\bin\mvn.cmd" -version
# Apache Maven 3.9.9
# Java version: 17.0.20.1, vendor: Eclipse Adoptium
```

---

## Step 3 — Set JAVA_HOME & PATH (User Level, no Admin needed)

Setting at Machine level failed (no admin rights). Set at User level instead:

```powershell
$javaHome = "C:\Program Files\Eclipse Adoptium\jdk-17.0.20.101-hotspot"

[System.Environment]::SetEnvironmentVariable("JAVA_HOME", $javaHome, "User")
[System.Environment]::SetEnvironmentVariable("MAVEN_HOME", "C:\Tools\maven", "User")

$oldPath = [System.Environment]::GetEnvironmentVariable("PATH", "User")
[System.Environment]::SetEnvironmentVariable("PATH", "$oldPath;C:\Tools\maven\bin;$javaHome\bin", "User")
```

> ⚠️ You need to **restart your terminal** for these PATH changes to take effect globally.
> `start.ps1` handles this automatically by injecting the paths at runtime.

---

## Step 4 — Backend Config: Switched to H2 (No PostgreSQL Needed)

The original `backend/src/main/resources/application.yml` was configured for PostgreSQL.
We switched it to **H2 in-memory database** so the backend runs with zero extra setup:

```yaml
# Before (required a running PostgreSQL server):
datasource:
  url: jdbc:postgresql://localhost:5432/dermasense
  username: postgres
  password: postgres
  driver-class-name: org.postgresql.Driver

# After (H2 in-memory, works out of the box):
datasource:
  url: jdbc:h2:mem:dermasensedb;DB_CLOSE_DELAY=-1;DB_CLOSE_ON_EXIT=FALSE
  driver-class-name: org.h2.Driver
  username: sa
  password: ""
```

H2 web console is available at: `http://localhost:8080/h2-console`
- **JDBC URL**: `jdbc:h2:mem:dermasensedb`
- **Username**: `sa`
- **Password**: *(leave blank)*

---

## Step 5 — Security Config: Allow H2 Console

`backend/.../config/SecurityConfig.java` was updated to permit H2 console access without JWT:

```java
// Added this line to the permitAll block:
.requestMatchers("/h2-console/**").permitAll()
```

---

## Running the Backend

After installation, the backend can be started via `start.ps1` (recommended) or manually:

```powershell
# Option A: Use start.ps1 (starts all 3 services at once)
.\start.ps1

# Option B: Manual (open a new terminal first so PATH is loaded)
cd backend
mvn spring-boot:run
```

> ⚠️ **First run** downloads all Spring Boot Maven dependencies (~50MB). Takes 1-2 minutes.
> Subsequent runs start in ~10 seconds.

---

## All Service URLs

| Service | URL | Notes |
|---|---|---|
| **Frontend** | http://localhost:5173 | Open this in your browser |
| **Backend Auth API** | http://localhost:8080 | Spring Boot |
| **H2 DB Console** | http://localhost:8080/h2-console | Inspect the in-memory DB |
| **Backend Swagger** | http://localhost:8080/swagger-ui/index.html | API docs |
| **AI Service** | http://127.0.0.1:8000 | FastAPI |
| **AI Swagger** | http://127.0.0.1:8000/docs | AI API docs |

---

## If You Need to Reinstall

Re-run Steps 1–3 above. The downloaded files are:
- JDK MSI: `%TEMP%\jdk17.msi`
- Maven ZIP: `%TEMP%\maven.zip`
- Maven install dir: `C:\Tools\maven\`
- Java install dir: `C:\Program Files\Eclipse Adoptium\`
