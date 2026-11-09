# TeleCloud Windows Packaging Script
# Builds both:
# 1. Custom Borderless Neon Animated Installer (TeleCloud-1.0.0-Setup.exe)
# 2. Authentic Windows Integration (C:\Program Files\TeleCloud, HKLM Registry, Shortcuts, uninstall.exe)

$ErrorActionPreference = "Stop"
$env:CARGO_BUILD_JOBS = "1"
if (-not $env:VITE_FEEDBACK_RELAY_URL) {
    $env:VITE_FEEDBACK_RELAY_URL = "https://telecloud-feedback-relay.telegramcloud.workers.dev/api/feedback"
}
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  TeleCloud Windows Custom Installer Build Pipeline" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Build Main Application Frontend
Write-Host "`n[1/6] Building TeleCloud frontend assets..." -ForegroundColor Yellow
Set-Location $RootDir
npm run build
if ($LASTEXITCODE -ne 0) { throw "Frontend build failed" }

# 2. Build Main Application Rust Binary
Write-Host "`n[2/6] Compiling TeleCloud release binary (Rust)..." -ForegroundColor Yellow
Set-Location "$RootDir\src-tauri"
cargo build --bin telecloud-vault --release --features custom-protocol
if ($LASTEXITCODE -ne 0) { throw "TeleCloud release binary compilation failed" }

$MainExe = "$RootDir\src-tauri\target\release\telecloud-vault.exe"
if (-not (Test-Path $MainExe)) {
    throw "Main binary not found at $MainExe"
}

# 3. Compile Uninstaller Binary
Write-Host "`n[3/6] Compiling standalone uninstaller (uninstall.exe)..." -ForegroundColor Yellow
Set-Location "$RootDir\installer\src-tauri"
cargo build --release --features custom-protocol --bin uninstall
if ($LASTEXITCODE -ne 0) { throw "Uninstaller compilation failed" }

$UninstallExe = "$RootDir\installer\src-tauri\target\release\uninstall.exe"
if (-not (Test-Path $UninstallExe)) {
    throw "Uninstaller binary not found at $UninstallExe"
}

# 4. Assemble Payload Archive
Write-Host "`n[4/6] Creating compressed installation payload..." -ForegroundColor Yellow
$StagingDir = "$RootDir\installer\staging"
if (Test-Path $StagingDir) { Remove-Item -Recurse -Force $StagingDir }
New-Item -ItemType Directory -Force -Path $StagingDir | Out-Null

Copy-Item $MainExe "$StagingDir\TeleCloud.exe"
Copy-Item $UninstallExe "$StagingDir\uninstall.exe"
Copy-Item "$RootDir\src-tauri\icons\icon.ico" "$StagingDir\icon.ico"
Copy-Item "$RootDir\app-icon.png" "$StagingDir\app-icon.png"

$PayloadZip = "$RootDir\installer\src-tauri\payload.zip"
if (Test-Path $PayloadZip) { Remove-Item -Force $PayloadZip }
Compress-Archive -Path "$StagingDir\*" -DestinationPath $PayloadZip -CompressionLevel Optimal
Remove-Item -Recurse -Force $StagingDir

Write-Host "Payload archive created ($((Get-Item $PayloadZip).Length / 1MB | ForEach-Object { '{0:N2} MB' -f $_ }))" -ForegroundColor Green

# 5. Build Custom Installer Frontend
Write-Host "`n[5/6] Building custom installer frontend UI..." -ForegroundColor Yellow
Set-Location "$RootDir\installer"
if (-not (Test-Path "$RootDir\installer\node_modules")) {
    Write-Host "Installing installer dependencies..." -ForegroundColor Yellow
    npm install
}
npm run build
if ($LASTEXITCODE -ne 0) { throw "Installer frontend build failed" }

# 6. Compile Custom Installer Setup Executable
Write-Host "`n[6/6] Compiling final custom installer executable (TeleCloud-Setup.exe)..." -ForegroundColor Yellow
Set-Location "$RootDir\installer\src-tauri"
cargo build --release --features custom-protocol --bin TeleCloud-Setup
if ($LASTEXITCODE -ne 0) { throw "Setup compilation failed" }

$OutputReleaseDir = "$RootDir\release"
if (-not (Test-Path $OutputReleaseDir)) {
    New-Item -ItemType Directory -Force -Path $OutputReleaseDir | Out-Null
}

$pkgJson = Get-Content (Join-Path $RootDir "package.json") -Raw | ConvertFrom-Json
$appVer = $pkgJson.version
$FinalSetupExe = "$OutputReleaseDir\TeleCloud-$appVer-Setup.exe"
Copy-Item "$RootDir\installer\src-tauri\target\release\TeleCloud-Setup.exe" $FinalSetupExe -Force
Copy-Item $MainExe "$OutputReleaseDir\TeleCloud.exe" -Force

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host "  WINDOWS PACKAGING COMPLETED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "Installer Executable: $FinalSetupExe" -ForegroundColor Cyan
Write-Host "Standalone Binary:    $OutputReleaseDir\TeleCloud.exe" -ForegroundColor Cyan
Write-Host "Setup File Size:      $((Get-Item $FinalSetupExe).Length / 1MB | ForEach-Object { '{0:N2} MB' -f $_ })" -ForegroundColor Cyan
Write-Host "Target Directory:  C:\Program Files\TeleCloud" -ForegroundColor Cyan
Write-Host "Elevation Level:   requireAdministrator (UAC)" -ForegroundColor Cyan
Write-Host "Registry Target:   HKLM\Software\Microsoft\Windows\CurrentVersion\Uninstall\TeleCloud" -ForegroundColor Cyan
Write-Host "Uninstaller:       C:\Program Files\TeleCloud\uninstall.exe" -ForegroundColor Cyan
Write-Host "==========================================================`n" -ForegroundColor Green

Set-Location $RootDir
