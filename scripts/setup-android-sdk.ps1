# Setup Android SDK Command-Line Tools, Platform 34, Build Tools, and NDK
$ErrorActionPreference = "Stop"

$SdkDir = "$env:LOCALAPPDATA\Android\Sdk"
$CmdLineToolsDir = "$SdkDir\cmdline-tools"
$LatestDir = "$CmdLineToolsDir\latest"
$ZipFile = "$SdkDir\cmdline-tools.zip"

Write-Host "Setting up Android SDK in $SdkDir..." -ForegroundColor Cyan

if (-not (Test-Path $LatestDir)) {
    Write-Host "Downloading Android Command-line Tools (~148 MB)..." -ForegroundColor Yellow
    $Url = "https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip"
    Invoke-WebRequest -Uri $Url -OutFile $ZipFile

    Write-Host "Extracting Command-line Tools..." -ForegroundColor Yellow
    $TempExtract = "$SdkDir\temp_extract"
    if (Test-Path $TempExtract) { Remove-Item -Recurse -Force $TempExtract }
    Expand-Archive -Path $ZipFile -DestinationPath $TempExtract -Force

    New-Item -ItemType Directory -Force -Path $CmdLineToolsDir | Out-Null
    Move-Item -Path "$TempExtract\cmdline-tools" -Destination $LatestDir -Force
    Remove-Item -Recurse -Force $TempExtract, $ZipFile
    Write-Host "Command-line tools installed at $LatestDir" -ForegroundColor Green
} else {
    Write-Host "Command-line tools already installed." -ForegroundColor Green
}

# Set environment for the current process
$env:ANDROID_HOME = $SdkDir
$env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-21.0.13.21-hotspot"
$env:PATH = "$env:JAVA_HOME\bin;$LatestDir\bin;$SdkDir\platform-tools;$env:PATH"

# Set permanently for user
[Environment]::SetEnvironmentVariable("ANDROID_HOME", $SdkDir, "User")
[Environment]::SetEnvironmentVariable("JAVA_HOME", $env:JAVA_HOME, "User")

Write-Host "Verifying sdkmanager..." -ForegroundColor Cyan
& "$LatestDir\bin\sdkmanager.bat" --version

Write-Host "Accepting licenses and installing platform-tools, platforms;android-34, build-tools;34.0.0, and ndk..." -ForegroundColor Yellow
# Accept licenses
$yesInput = "y`ny`ny`ny`ny`ny`ny`ny`ny`ny`n"
$yesInput | & "$LatestDir\bin\sdkmanager.bat" --licenses

Write-Host "Installing platform-tools and platform 34..." -ForegroundColor Cyan
& "$LatestDir\bin\sdkmanager.bat" "platform-tools" "platforms;android-34" "build-tools;34.0.0" "ndk;26.1.10909125"

$NdkDir = "$SdkDir\ndk\26.1.10909125"
[Environment]::SetEnvironmentVariable("NDK_HOME", $NdkDir, "User")

Write-Host "Android SDK & NDK setup completed successfully!" -ForegroundColor Green
