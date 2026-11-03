$SdkDir = "$env:LOCALAPPDATA\Android\Sdk"
$NdkDir = "$SdkDir\ndk\26.1.10909125"
$NdkBin = "$NdkDir\toolchains\llvm\prebuilt\windows-x86_64\bin"
$JdkDir = "C:\Program Files\Microsoft\jdk-21.0.13.21-hotspot"

$env:ANDROID_HOME = $SdkDir
$env:NDK_HOME = $NdkDir
$env:JAVA_HOME = $JdkDir
$env:PATH = "C:\nvm4w\nodejs;$JdkDir\bin;$NdkBin;$SdkDir\platform-tools;$SdkDir\cmdline-tools\latest\bin;$env:PATH"

$env:CC_aarch64_linux_android = "$NdkBin\aarch64-linux-android24-clang.cmd"
$env:AR_aarch64_linux_android = "$NdkBin\llvm-ar.exe"
$env:CARGO_TARGET_AARCH64_LINUX_ANDROID_LINKER = "$NdkBin\aarch64-linux-android24-clang.cmd"
$env:CARGO_BUILD_JOBS = "1"
$env:RUST_MIN_STACK = "67108864"

Set-Location "C:\Telegram Drive\src-tauri"
cargo build --package telecloud-vault --target aarch64-linux-android --release --lib --features custom-protocol --jobs 1
Write-Host "EXIT_CODE: $LASTEXITCODE"
