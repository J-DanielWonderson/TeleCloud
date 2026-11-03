# TeleCloud Android APK Build Pipeline
$ErrorActionPreference = "Stop"
$env:CARGO_BUILD_JOBS = "1"
$env:RUST_MIN_STACK = "67108864"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  TeleCloud Android APK Packaging Pipeline" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Configure Android Toolchain Environment
$isWindows = ($env:OS -eq "Windows_NT") -or ($PSVersionTable.Platform -eq "Win32NT")

if (-not $isWindows) {
    # Linux / CI environment
    $SdkDir = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } elseif ($env:ANDROID_SDK_ROOT) { $env:ANDROID_SDK_ROOT } else { "/usr/local/lib/android/sdk" }
    
    if (-not $env:NDK_HOME) {
        if (Test-Path "$SdkDir/ndk/26.1.10909125") {
            $env:NDK_HOME = "$SdkDir/ndk/26.1.10909125"
        } elseif (Test-Path "$SdkDir/ndk") {
            $latestNdk = Get-ChildItem "$SdkDir/ndk" | Sort-Object Name -Descending | Select-Object -First 1
            if ($latestNdk) { $env:NDK_HOME = $latestNdk.FullName }
        }
    }
    $NdkDir = $env:NDK_HOME
    $NdkBin = "$NdkDir/toolchains/llvm/prebuilt/linux-x86_64/bin"

    $env:ANDROID_HOME = $SdkDir
    $env:PATH = "$NdkBin:$SdkDir/platform-tools:$SdkDir/cmdline-tools/latest/bin:$env:PATH"

    $env:CC_aarch64_linux_android = "$NdkBin/aarch64-linux-android24-clang"
    $env:AR_aarch64_linux_android = "$NdkBin/llvm-ar"
    $env:CARGO_TARGET_AARCH64_LINUX_ANDROID_LINKER = "$NdkBin/aarch64-linux-android24-clang"
    $Gradlew = "./gradlew"
} else {
    # Windows environment
    $SdkDir = if ($env:ANDROID_HOME) { $env:ANDROID_HOME } else { "$env:LOCALAPPDATA\Android\Sdk" }
    $NdkDir = if ($env:NDK_HOME) { $env:NDK_HOME } else { "$SdkDir\ndk\26.1.10909125" }
    $NdkBin = "$NdkDir\toolchains\llvm\prebuilt\windows-x86_64\bin"
    $JdkDir = if ($env:JAVA_HOME) { $env:JAVA_HOME } else { "C:\Program Files\Microsoft\jdk-21.0.13.21-hotspot" }

    $env:ANDROID_HOME = $SdkDir
    $env:NDK_HOME = $NdkDir
    if (-not $env:JAVA_HOME) { $env:JAVA_HOME = $JdkDir }
    $env:PATH = "C:\nvm4w\nodejs;$JdkDir\bin;$NdkBin;$SdkDir\platform-tools;$SdkDir\cmdline-tools\latest\bin;$env:PATH"

    $env:CC_aarch64_linux_android = "$NdkBin\aarch64-linux-android24-clang.cmd"
    $env:AR_aarch64_linux_android = "$NdkBin\llvm-ar.exe"
    $env:CARGO_TARGET_AARCH64_LINUX_ANDROID_LINKER = "$NdkBin\aarch64-linux-android24-clang.cmd"
    $Gradlew = ".\gradlew.bat"
}

Write-Host "Android SDK: $env:ANDROID_HOME" -ForegroundColor Green
Write-Host "Android NDK: $env:NDK_HOME" -ForegroundColor Green
Write-Host "Java JDK:    $env:JAVA_HOME" -ForegroundColor Green

# 2. Build Frontend Production Bundle
Write-Host "`n[1/5] Building frontend production bundle..." -ForegroundColor Yellow
Set-Location $RootDir
if (-not (Test-Path (Join-Path $RootDir "node_modules"))) {
    Write-Host "Installing frontend dependencies..." -ForegroundColor Yellow
    npm install
}
npm run build
if ($LASTEXITCODE -ne 0) { throw "Frontend build failed" }

# 3. Compile Rust Android Library
Write-Host "`n[2/5] Compiling Rust MTProto client & SQLite VFS for Android (aarch64)..." -ForegroundColor Yellow
Set-Location (Join-Path $RootDir "src-tauri")
cargo build --jobs 1 --package telecloud-vault --target aarch64-linux-android --release --lib --features custom-protocol
if ($LASTEXITCODE -ne 0) { throw "Rust release compilation for Android failed" }
$CompiledSo = Join-Path $RootDir "src-tauri/target/aarch64-linux-android/release/libtelecloud_vault_lib.so"

if (-not (Test-Path $CompiledSo)) {
    throw "Compiled shared library not found at $CompiledSo"
}

# 4. Stage Native Library & Assets in Android Project
Write-Host "`n[3/5] Staging native library and webview assets..." -ForegroundColor Yellow
$JniLibsDir = Join-Path $RootDir "src-tauri/gen/android/app/src/main/jniLibs/arm64-v8a"
if (-not (Test-Path $JniLibsDir)) {
    New-Item -ItemType Directory -Force -Path $JniLibsDir | Out-Null
}
Copy-Item $CompiledSo (Join-Path $JniLibsDir "libtelecloud_vault_lib.so") -Force

$AndroidAssetsDir = Join-Path $RootDir "src-tauri/gen/android/app/src/main/assets"
if (-not (Test-Path $AndroidAssetsDir)) {
    New-Item -ItemType Directory -Force -Path $AndroidAssetsDir | Out-Null
}
Copy-Item (Join-Path $RootDir "dist/*") $AndroidAssetsDir -Recurse -Force

# Ensure launcher icons are properly safe-zoned and copied to Android res directory
if ($isWindows) {
    try {
        & (Join-Path $ScriptDir "generate-android-icons.ps1")
    } catch {
        Write-Warning "Icon generation skipped: $_"
    }
}
$IconSrc = Join-Path $RootDir "src-tauri/icons/android/mipmap-*"
$IconDst = Join-Path $RootDir "src-tauri/gen/android/app/src/main/res"
Copy-Item $IconSrc $IconDst -Recurse -Force

# 5. Run Gradle Build
Write-Host "`n[4/5] Executing Gradle APK packaging (assembleArm64Release)..." -ForegroundColor Yellow
$GradleDir = Join-Path $RootDir "src-tauri/gen/android"
Set-Location $GradleDir
if (-not $isWindows -and (Test-Path (Join-Path $GradleDir "gradlew"))) {
    chmod +x (Join-Path $GradleDir "gradlew")
}
& $Gradlew assembleArm64Release -x rustBuildArm64Release -x rustBuildArmRelease
if ($LASTEXITCODE -ne 0) { throw "Gradle APK release build failed" }

# 6. Copy Output Artifact
Write-Host "`n[5/5] Exporting APK artifact to release directory..." -ForegroundColor Yellow
$ReleaseDir = Join-Path $RootDir "release"
if (-not (Test-Path $ReleaseDir)) {
    New-Item -ItemType Directory -Force -Path $ReleaseDir | Out-Null
}

$ApkSource = Join-Path $RootDir "src-tauri/gen/android/app/build/outputs/apk/arm64/release/app-arm64-release.apk"
if (-not (Test-Path $ApkSource)) {
    # Check if another release apk was produced
    $fallbackApk = Get-ChildItem -Path (Join-Path $RootDir "src-tauri/gen/android/app/build/outputs/apk") -Filter "*.apk" -Recurse | Select-Object -First 1
    if ($fallbackApk) {
        $ApkSource = $fallbackApk.FullName
    } else {
        throw "Generated release APK not found at $ApkSource"
    }
}

$FinalApk = Join-Path $ReleaseDir "TeleCloud-1.0.0-arm64.apk"
Copy-Item $ApkSource $FinalApk -Force
Write-Host "Output APK: $FinalApk ($((Get-Item $FinalApk).Length / 1MB | ForEach-Object { '{0:N2} MB' -f $_ }))" -ForegroundColor Green

Write-Host "`n==========================================================" -ForegroundColor Green
Write-Host "  ANDROID APK PACKAGED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "==========================================================`n" -ForegroundColor Green

Set-Location $RootDir
