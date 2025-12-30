# Lapetus Installer for Windows
# Usage: irm https://lapetus-install.vulcanubi.workers.dev/install.ps1 | iex

$ErrorActionPreference = "Stop"

$APP = "lapetus"
$REPO = "dhhd67807-lgtm/lapetus-1"
$INSTALL_DIR = "$env:USERPROFILE\.lapetus\bin"

function Write-ColorOutput {
    param([string]$Message, [string]$Color = "White")
    Write-Host $Message -ForegroundColor $Color
}

# Detect architecture
$arch = if ([Environment]::Is64BitOperatingSystem) { "x64" } else { "x86" }
$filename = "$APP-windows-$arch.zip"

# Create install directory
if (-not (Test-Path $INSTALL_DIR)) {
    New-Item -ItemType Directory -Path $INSTALL_DIR -Force | Out-Null
}

# Get latest version
Write-ColorOutput "`nFetching latest version..." "Cyan"
try {
    $release = Invoke-RestMethod -Uri "https://api.github.com/repos/$REPO/releases/latest"
    $version = $release.tag_name -replace '^v', ''
    $downloadUrl = "https://github.com/$REPO/releases/latest/download/$filename"
} catch {
    Write-ColorOutput "Failed to fetch version information" "Red"
    exit 1
}

Write-ColorOutput "Installing lapetus version: $version" "White"

# Download and extract
$tempDir = Join-Path $env:TEMP "lapetus_install_$(Get-Random)"
$tempZip = Join-Path $tempDir $filename

New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

Write-ColorOutput "Downloading..." "Cyan"
try {
    Invoke-WebRequest -Uri $downloadUrl -OutFile $tempZip -UseBasicParsing
} catch {
    Write-ColorOutput "Failed to download: $_" "Red"
    Remove-Item -Path $tempDir -Recurse -Force -ErrorAction SilentlyContinue
    exit 1
}

Write-ColorOutput "Extracting..." "Cyan"
Expand-Archive -Path $tempZip -DestinationPath $tempDir -Force

# Move binary
$exePath = Join-Path $tempDir "lapetus.exe"
if (-not (Test-Path $exePath)) {
    $exePath = Join-Path $tempDir "lapetus"
}
Move-Item -Path $exePath -Destination (Join-Path $INSTALL_DIR "lapetus.exe") -Force

# Cleanup
Remove-Item -Path $tempDir -Recurse -Force

# Add to PATH
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($userPath -notlike "*$INSTALL_DIR*") {
    [Environment]::SetEnvironmentVariable("Path", "$INSTALL_DIR;$userPath", "User")
    Write-ColorOutput "Added $INSTALL_DIR to PATH" "Green"
}

# Print banner
Write-Host ""
Write-ColorOutput "██       █████  ██████  ███████ ████████ ██    ██ ███████" "Cyan"
Write-ColorOutput "██      ██   ██ ██   ██ ██         ██    ██    ██ ██     " "Cyan"
Write-ColorOutput "██      ███████ ██████  █████      ██    ██    ██ ███████" "Cyan"
Write-ColorOutput "██      ██   ██ ██      ██         ██    ██    ██      ██" "Cyan"
Write-ColorOutput "███████ ██   ██ ██      ███████    ██     ██████  ███████" "Cyan"
Write-Host ""
Write-Host ""
Write-ColorOutput "Lapetus includes free models, to start:" "DarkGray"
Write-Host ""
Write-Host "cd <project>  " -NoNewline; Write-ColorOutput "# Open directory" "DarkGray"
Write-Host "lapetus       " -NoNewline; Write-ColorOutput "# Run command" "DarkGray"
Write-Host ""
Write-ColorOutput "Restart your terminal to use lapetus" "Yellow"
Write-Host ""
