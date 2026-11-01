param(
    [string]$InputPath = (Join-Path $PSScriptRoot 'media\Video-JanetSingingSongToBill.MOV'),
    [string]$OutputPath = (Join-Path $PSScriptRoot 'media\Video-JanetSingingSongToBill-24dB.mp4'),
    [ValidateRange(-24, 24)]
    [double]$AudioGainDb = 24,
    [switch]$UpdateMediaRegistry
)

$ErrorActionPreference = 'Stop'

$ffmpeg = Get-Command ffmpeg -ErrorAction SilentlyContinue
if (-not $ffmpeg) {
    throw 'FFmpeg was not found on PATH. Install FFmpeg, reopen PowerShell, and run this script again.'
}

$inputFullPath = [System.IO.Path]::GetFullPath($InputPath)
$outputFullPath = [System.IO.Path]::GetFullPath($OutputPath)

if (-not (Test-Path -LiteralPath $inputFullPath -PathType Leaf)) {
    throw "Input video was not found: $inputFullPath"
}
if (Test-Path -LiteralPath $outputFullPath) {
    throw "Output already exists; refusing to overwrite it: $outputFullPath"
}

$registryPath = Join-Path $PSScriptRoot 'media-data.js'
$registryContent = $null
$sourceFileName = [System.IO.Path]::GetFileName($inputFullPath)
$outputFileName = [System.IO.Path]::GetFileName($outputFullPath)
$registrySourcePattern = [regex]::Escape($sourceFileName)

if ($UpdateMediaRegistry) {
    $mediaRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot 'media'))
    $mediaPrefix = $mediaRoot.TrimEnd([System.IO.Path]::DirectorySeparatorChar) + [System.IO.Path]::DirectorySeparatorChar
    if (-not $outputFullPath.StartsWith($mediaPrefix, [System.StringComparison]::OrdinalIgnoreCase)) {
        throw "Registry updates require the output video to be saved inside: $mediaRoot"
    }
    if ([System.IO.Path]::GetExtension($outputFullPath) -ine '.mp4') {
        throw 'Registry updates require an .mp4 output file.'
    }
    if (-not (Test-Path -LiteralPath $registryPath -PathType Leaf)) {
        throw "Media registry was not found: $registryPath"
    }

    $registryContent = [System.IO.File]::ReadAllText($registryPath)
    if (-not $registryContent.Contains($sourceFileName)) {
        $sourceBaseName = [System.IO.Path]::GetFileNameWithoutExtension($sourceFileName)
        $registrySourcePattern = [regex]::Escape($sourceBaseName) + '(?:-[^"/\\]+)?\.(?:mov|mp4)'
        if (-not [regex]::IsMatch($registryContent, $registrySourcePattern, [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)) {
            throw "The media registry does not contain the input filename or a converted version of it: $sourceFileName"
        }
    }
}

$audioFilter = "volume=${AudioGainDb}dB,alimiter=limit=0.98:attack=5:release=50"
$ffmpegArguments = @(
    '-hide_banner',
    '-n',
    '-i', $inputFullPath,
    '-map', '0:v:0',
    '-map', '0:a:0?',
    '-map_metadata', '0',
    '-c:v', 'libx264',
    '-preset', 'medium',
    '-crf', '20',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-b:a', '192k',
    '-ar', '48000',
    '-ac', '2',
    '-af', $audioFilter,
    '-movflags', '+faststart',
    $outputFullPath
)

Write-Host "Converting: $sourceFileName"
Write-Host "Audio gain: $AudioGainDb dB (limiter enabled)"
& $ffmpeg.Source @ffmpegArguments
if ($LASTEXITCODE -ne 0) {
    if (Test-Path -LiteralPath $outputFullPath) {
        Remove-Item -LiteralPath $outputFullPath
    }
    throw "FFmpeg conversion failed with exit code $LASTEXITCODE."
}

Write-Host "Created: $outputFullPath" -ForegroundColor Green

if ($UpdateMediaRegistry) {
    $replaceFileName = [System.Text.RegularExpressions.MatchEvaluator]{
        param($match)
        $outputFileName
    }
    $updatedRegistry = [regex]::Replace(
        $registryContent,
        $registrySourcePattern,
        $replaceFileName,
        [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
    )
    [System.IO.File]::WriteAllText($registryPath, $updatedRegistry)
    Write-Host "Updated media registry: $registryPath" -ForegroundColor Green
}
