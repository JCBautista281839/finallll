# Viktoria's Bistro Server Auto-Start Script
# PowerShell script for automatic server startup

param(
    [switch]$AutoRestart,
    [switch]$Background,
    [switch]$InstallService
)

# Set console title
$Host.UI.RawUI.WindowTitle = "Viktoria's Bistro Server"

# Get script directory
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ScriptDir

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Viktoria's Bistro Server Startup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js installation
try {
    $NodeVersion = node --version
    Write-Host "✅ Node.js version: $NodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ ERROR: Node.js is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if server.js exists
if (-not (Test-Path "server.js")) {
    Write-Host "❌ ERROR: server.js not found in current directory" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "🚀 Starting Viktoria's Bistro Server..." -ForegroundColor Green
Write-Host "📁 Working Directory: $ScriptDir" -ForegroundColor Gray
Write-Host ""

if ($AutoRestart) {
    Write-Host "🔄 Auto-restart mode enabled" -ForegroundColor Yellow
    Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Gray
    Write-Host ""
    
    do {
        try {
            Write-Host "Starting server at $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan
            node server.js
        } catch {
            Write-Host "Server crashed: $($_.Exception.Message)" -ForegroundColor Red
        }
        
        Write-Host "Server stopped. Restarting in 5 seconds..." -ForegroundColor Yellow
        Start-Sleep -Seconds 5
    } while ($true)
} elseif ($Background) {
    Write-Host "🔄 Starting server in background..." -ForegroundColor Yellow
    
    # Start server in background
    $Job = Start-Job -ScriptBlock {
        param($Path)
        Set-Location $Path
        node server.js
    } -ArgumentList $ScriptDir
    
    Write-Host "✅ Server started in background (Job ID: $($Job.Id))" -ForegroundColor Green
    Write-Host "Use 'Get-Job' to see status" -ForegroundColor Gray
    Write-Host "Use 'Stop-Job -Id $($Job.Id)' to stop the server" -ForegroundColor Gray
} else {
    Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Gray
    Write-Host ""
    
    # Start server normally
    node server.js
}

Write-Host ""
Write-Host "Server stopped." -ForegroundColor Red
Read-Host "Press Enter to exit"
