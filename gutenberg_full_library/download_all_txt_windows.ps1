param(
  [string]$OutDir = "$PSScriptRoot\..\gutenberg_all_txt",
  [switch]$SkipExtract
)

$ErrorActionPreference = "Stop"

$ArchiveUrl = "https://www.gutenberg.org/cache/epub/feeds/txt-files.tar.zip"
$CatalogUrl = "https://www.gutenberg.org/cache/epub/feeds/pg_catalog.csv.gz"

$OutDir = [System.IO.Path]::GetFullPath($OutDir)
$ArchiveDir = Join-Path $OutDir "archives"
$ContentDir = Join-Path $OutDir "content"
$ArchivePath = Join-Path $ArchiveDir "txt-files.tar.zip"
$CatalogPath = Join-Path $ArchiveDir "pg_catalog.csv.gz"

New-Item -ItemType Directory -Force -Path $ArchiveDir | Out-Null
New-Item -ItemType Directory -Force -Path $ContentDir | Out-Null

function Download-File {
  param(
    [string]$Url,
    [string]$Destination,
    [switch]$Resume
  )

  Write-Host "Downloading: $Url"
  Write-Host "To:          $Destination"

  if (-not (Get-Command curl.exe -ErrorAction SilentlyContinue)) {
    throw "curl.exe was not found. Install curl or use a recent Windows build that includes it."
  }

  $curlArgs = @(
    "--fail",
    "--location",
    "--output",
    $Destination
  )

  if ($Resume) {
    $curlArgs = @("--continue-at", "-") + $curlArgs
  }

  $curlArgs += $Url
  & curl.exe @curlArgs

  if ($LASTEXITCODE -ne 0) {
    throw "Download failed for $Url"
  }
}

function Test-ZipArchive {
  param([string]$Path)

  Add-Type -AssemblyName System.IO.Compression.FileSystem

  try {
    $archive = [System.IO.Compression.ZipFile]::OpenRead($Path)
    $archive.Dispose()
    return $true
  } catch {
    return $false
  }
}

Download-File -Url $ArchiveUrl -Destination $ArchivePath -Resume
Download-File -Url $CatalogUrl -Destination $CatalogPath -Resume

if ($SkipExtract) {
  Write-Host "Download complete. Extraction skipped."
  exit 0
}

if (-not (Test-ZipArchive -Path $ArchivePath)) {
  throw "The archive is incomplete or invalid. Re-run this script to resume the download: $ArchivePath"
}

Write-Host "Extracting zip archive..."
Expand-Archive -LiteralPath $ArchivePath -DestinationPath $ArchiveDir -Force

$TarFile = Get-ChildItem -LiteralPath $ArchiveDir -Filter "*.tar" | Select-Object -First 1
if (-not $TarFile) {
  throw "Could not find the .tar file after extracting $ArchivePath"
}

Write-Host "Extracting tar archive to: $ContentDir"
tar -xf $TarFile.FullName -C $ContentDir

Write-Host ""
Write-Host "Done."
Write-Host "Archive:  $ArchivePath"
Write-Host "Catalog:  $CatalogPath"
Write-Host "Content:  $ContentDir"
