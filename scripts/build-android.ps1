$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$workspaceRoot = [System.IO.Path]::GetFullPath((Split-Path -Parent $PSScriptRoot))
$builtApk = Join-Path $workspaceRoot 'android\app\build\outputs\apk\debug\app-debug.apk'
$releaseApk = Join-Path $workspaceRoot 'releases\android\grain.apk'
$workspacePrefix = $workspaceRoot.TrimEnd('\') + '\'

foreach ($path in @($builtApk, $releaseApk)) {
    if (-not [System.IO.Path]::GetFullPath($path).StartsWith($workspacePrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw 'APK path leaves the workspace.'
    }
}

Push-Location $workspaceRoot
try {
    & npm.cmd run build
    if ($LASTEXITCODE -ne 0) { throw 'Web build failed.' }
    & npx.cmd cap sync android
    if ($LASTEXITCODE -ne 0) { throw 'Capacitor sync failed.' }
    Push-Location (Join-Path $workspaceRoot 'android')
    try {
        & .\gradlew.bat assembleDebug --quiet
        if ($LASTEXITCODE -ne 0) { throw 'Android build failed.' }
    } finally {
        Pop-Location
    }
    if (-not (Test-Path -LiteralPath $builtApk)) { throw 'Android build did not produce an APK.' }
    New-Item -ItemType Directory -Path (Split-Path -Parent $releaseApk) -Force | Out-Null
    Copy-Item -LiteralPath $builtApk -Destination $releaseApk -Force
    if ((Get-FileHash -LiteralPath $builtApk).Hash -ne (Get-FileHash -LiteralPath $releaseApk).Hash) {
        throw 'APK copy verification failed; the intermediate APK has been preserved.'
    }
    Remove-Item -LiteralPath $builtApk -Force
    Write-Output ('APK ready: ' + $releaseApk)
} finally {
    Pop-Location
}
