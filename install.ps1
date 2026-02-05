# LOGify Windows Installer
# Installs dependencies, creates DB directory, and sets up environment.

Write-Host "LOGify Installer..." -ForegroundColor Green

# Check for Administrator privileges
if (-NOT ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Warning "Please run this script as Administrator!"
    exit 1
}

# Check Requirements
if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Error "Python is not installed or not in PATH."
    exit 1
}

$hasNpm = $true
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Warning "npm is not installed. Web dashboard building will be skipped."
    $hasNpm = $false
}

# Create Directories
$projectDir = Get-Location
$dbDir = Join-Path $projectDir "Logs_DB"

Write-Host "Setting up in: $projectDir"

if (-not (Test-Path $dbDir)) {
    New-Item -ItemType Directory -Force -Path $dbDir | Out-Null
    Write-Host "Created Logs_DB directory."
}

# Install Python Requirements
Write-Host "Installing Python Dependencies..." -ForegroundColor Green
# CLI dependencies
pip install -e ./cli

# Server dependencies
pip install -r ./server/requirements.txt

# Install Web Dependencies (if npm exists)
if ($hasNpm) {
    Write-Host "Installing Web Dependencies..." -ForegroundColor Green
    Set-Location web
    npm install
    Set-Location ..
}

# Ensure 'logify' is in PATH
Write-Host "Configuring PATH..." -ForegroundColor Green
$pythonPath = (Get-Command python).Source
$scriptsPath = Join-Path (Split-Path (Split-Path $pythonPath)) "Scripts"

# Verify Scripts path existence
if (-not (Test-Path $scriptsPath)) {
    # Fallback for some installs
    $scriptsPath = Join-Path (Split-Path $pythonPath) "Scripts"
}

if (Test-Path $scriptsPath) {
    $currentPath = [Environment]::GetEnvironmentVariable("Path", "Machine")
    if (-not $currentPath.Contains($scriptsPath)) {
        [Environment]::SetEnvironmentVariable("Path", $currentPath + ";$scriptsPath", "Machine")
        Write-Host "Added $scriptsPath to System PATH."
    } else {
        Write-Host "PATH already configured."
    }
} else {
    Write-Warning "Could not locate Python Scripts directory. You may need to add it to PATH manually."
}

# Final Instructions
Write-Host "Installation Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "To start LOGify:"
Write-Host "  1. Run the GUI (Server + Web):"
Write-Host "     logify gui" -ForegroundColor Yellow
Write-Host ""
Write-Host "  2. Run a standard Scan:"
Write-Host "     logify scan" -ForegroundColor Yellow
