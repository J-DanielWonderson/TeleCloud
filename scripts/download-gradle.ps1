$ErrorActionPreference = "Stop"
$destDir = "$env:USERPROFILE\.gradle\wrapper\dists\gradle-9.6.1-bin\4ticwg1pgcbps2hj28r8so764"
if (-not (Test-Path $destDir)) {
    New-Item -ItemType Directory -Force -Path $destDir | Out-Null
}

Get-ChildItem -Path $destDir -Filter "*.part" -ErrorAction SilentlyContinue | Remove-Item -Force
Get-ChildItem -Path $destDir -Filter "*.lck" -ErrorAction SilentlyContinue | Remove-Item -Force

$zipPath = "$destDir\gradle-9.6.1-bin.zip"
Write-Host "Downloading Gradle 9.6.1 to $zipPath..." -ForegroundColor Cyan
Invoke-WebRequest -Uri "https://services.gradle.org/distributions/gradle-9.6.1-bin.zip" -OutFile $zipPath

Write-Host "Downloaded successfully ($((Get-Item $zipPath).Length / 1MB | ForEach-Object { '{0:N2} MB' -f $_ }))" -ForegroundColor Green
