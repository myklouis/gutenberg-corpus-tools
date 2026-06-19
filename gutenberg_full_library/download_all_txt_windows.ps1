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
    [string]$Destination
  )

  if (Test-Path -LiteralPath $Destination) {
    Write-Host "Already exists: $Destination"
    return
  }

  Write-Host "Downloading: $Url"
  Write-Host "To:          $Destination"

  try {
    Start-BitsTransfer -Source $Url -Destination $Destination -DisplayName "Project Gutenberg bulk download"
  } catch {
    Write-Host "BITS download unavailable; falling back to standard web download."
    Invoke-WebRequest -Uri $Url -OutFile $Destination
  }
}

Download-File -Url $ArchiveUrl -Destination $ArchivePath
Download-File -Url $CatalogUrl -Destination $CatalogPath

if ($SkipExtract) {
  Write-Host "Download complete. Extraction skipped."
  exit 0
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
