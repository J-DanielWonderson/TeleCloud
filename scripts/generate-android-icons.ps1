# Generates high-quality Android launcher icons with exact safe zone compliance
# Ensures borders are never cut off by any Android launcher mask (Circle, Squircle, Teardrop, etc.)

try {
    Add-Type -AssemblyName System.Drawing -ErrorAction Stop
} catch {
    Write-Warning "System.Drawing not available on this platform. Using pre-generated icons."
    return
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir
$SourcePng = Join-Path $RootDir "app-icon.png"

if (-not (Test-Path $SourcePng)) {
    throw "Source icon not found at $SourcePng"
}

Write-Host "Source image: $SourcePng" -ForegroundColor Cyan

$srcImg = [System.Drawing.Image]::FromFile($SourcePng)

# Density configurations
# dp-to-px ratios: mdpi=1x, hdpi=1.5x, xhdpi=2x, xxhdpi=3x, xxxhdpi=4x
$configs = @(
    @{ Density = "mdpi";    Scale = 1.0; FgCanvas = 108; FgBadge = 68;  LegacyCanvas = 48;  LegacyBadge = 40 },
    @{ Density = "hdpi";    Scale = 1.5; FgCanvas = 162; FgBadge = 102; LegacyCanvas = 72;  LegacyBadge = 60 },
    @{ Density = "xhdpi";   Scale = 2.0; FgCanvas = 216; FgBadge = 136; LegacyCanvas = 96;  LegacyBadge = 80 },
    @{ Density = "xxhdpi";  Scale = 3.0; FgCanvas = 324; FgBadge = 204; LegacyCanvas = 144; LegacyBadge = 120 },
    @{ Density = "xxxhdpi"; Scale = 4.0; FgCanvas = 432; FgBadge = 272; LegacyCanvas = 192; LegacyBadge = 160 }
)

function Create-CircularIcon {
    param(
        [System.Drawing.Image]$Source,
        [int]$CanvasSize,
        [float]$BadgeDiameter,
        [string]$OutputPath
    )

    $bitmap = New-Object System.Drawing.Bitmap $CanvasSize, $CanvasSize, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bitmap)

    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)

    # In app-icon.png (1254x1254), center is 627, outer rim is at r=540 (diameter 1080)
    $scale = $BadgeDiameter / 1080.0
    $drawW = 1254.0 * $scale
    $drawH = 1254.0 * $scale
    $drawX = ($CanvasSize - $drawW) / 2.0
    $drawY = ($CanvasSize - $drawH) / 2.0

    $clipX = ($CanvasSize - $BadgeDiameter) / 2.0
    $clipY = ($CanvasSize - $BadgeDiameter) / 2.0

    $clipPath = New-Object System.Drawing.Drawing2D.GraphicsPath
    $clipPath.AddEllipse([float]$clipX, [float]$clipY, [float]$BadgeDiameter, [float]$BadgeDiameter)
    $g.SetClip($clipPath)
    $g.DrawImage($Source, [float]$drawX, [float]$drawY, [float]$drawW, [float]$drawH)
    $g.ResetClip()

    # Ensure parent directory exists
    $dir = Split-Path -Parent $OutputPath
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Force -Path $dir | Out-Null
    }

    $bitmap.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bitmap.Dispose()
}

$targetDirs = @(
    (Join-Path $RootDir "src-tauri\icons\android"),
    (Join-Path $RootDir "src-tauri\gen\android\app\src\main\res")
)

foreach ($cfg in $configs) {
    $density = $cfg.Density
    Write-Host "Generating icons for mipmap-$density..." -ForegroundColor Yellow

    foreach ($baseDir in $targetDirs) {
        $folder = Join-Path $baseDir "mipmap-$density"
        
        # 1. Adaptive icon foreground (safe zone compliant: 68dp in 108dp canvas)
        $fgPath = Join-Path $folder "ic_launcher_foreground.png"
        Create-CircularIcon -Source $srcImg -CanvasSize $cfg.FgCanvas -BadgeDiameter $cfg.FgBadge -OutputPath $fgPath

        # 2. Legacy regular icon (40dp in 48dp canvas)
        $regPath = Join-Path $folder "ic_launcher.png"
        Create-CircularIcon -Source $srcImg -CanvasSize $cfg.LegacyCanvas -BadgeDiameter $cfg.LegacyBadge -OutputPath $regPath

        # 3. Legacy round icon (40dp in 48dp canvas with safe margin)
        $roundPath = Join-Path $folder "ic_launcher_round.png"
        Create-CircularIcon -Source $srcImg -CanvasSize $cfg.LegacyCanvas -BadgeDiameter $cfg.LegacyBadge -OutputPath $roundPath
    }
}

$srcImg.Dispose()

# Ensure XML manifests are consistent across both locations
$adaptiveXml = @"
<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@drawable/ic_launcher_background" />
    <foreground android:drawable="@mipmap/ic_launcher_foreground" />
</adaptive-icon>
"@

$colorXml = @"
<?xml version="1.0" encoding="utf-8"?>
<resources>
  <color name="ic_launcher_background">#FF06090E</color>
</resources>
"@

foreach ($baseDir in $targetDirs) {
    $anydpiDir = Join-Path $baseDir "mipmap-anydpi-v26"
    if (-not (Test-Path $anydpiDir)) {
        New-Item -ItemType Directory -Force -Path $anydpiDir | Out-Null
    }
    Set-Content -Path (Join-Path $anydpiDir "ic_launcher.xml") -Value $adaptiveXml -Encoding UTF8
    Set-Content -Path (Join-Path $anydpiDir "ic_launcher_round.xml") -Value $adaptiveXml -Encoding UTF8
}

Set-Content -Path (Join-Path $RootDir "src-tauri\icons\android\values\ic_launcher_background.xml") -Value $colorXml -Encoding UTF8

Write-Host "`nAll Android launcher icons successfully updated and safe-zoned!" -ForegroundColor Green
