# Spaceship Auto-Start Script for Viktoria's Bistro Server
# This script will automatically start the Node.js server when Spaceship opens

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Viktoria's Bistro Server" -ForegroundColor Cyan
Write-Host "   Spaceship Auto-Start" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get the workspace directory
$WorkspaceDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $WorkspaceDir

Write-Host "📁 Workspace Directory: $WorkspaceDir" -ForegroundColor Gray
Write-Host ""

# Check if Node.js is installed
try {
    $NodeVersion = node --version
    Write-Host "✅ Node.js version: $NodeVersion" -ForegroundColor Green
}
catch {
    Write-Host "❌ ERROR: Node.js is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if server.js exists
if (-not (Test-Path "server.js")) {
    Write-Host "❌ ERROR: server.js not found in workspace" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if PM2 is available
$PM2Available = $false
try {
    pm2 --version | Out-Null
    $PM2Available = $true
    Write-Host "✅ PM2 is available" -ForegroundColor Green
}
catch {
    Write-Host "⚠️ PM2 not available - will use direct Node.js" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🚀 Starting Viktoria's Bistro Server..." -ForegroundColor Green
Write-Host ""

# Start the server
if ($PM2Available) {
    Write-Host "Using PM2 to start server..." -ForegroundColor Cyan
    
    # Check if server is already running
    $PM2Status = pm2 status 2>$null
    if ($PM2Status -match "viktorias-bistro-server") {
        Write-Host "Server is already running with PM2" -ForegroundColor Yellow
        pm2 status
    }
    else {
        Write-Host "Starting server with PM2..." -ForegroundColor Cyan
        pm2 start ecosystem.config.json
        pm2 status
    }
    
    Write-Host ""
    Write-Host "📋 PM2 Commands:" -ForegroundColor Cyan
    Write-Host "   pm2 status          - Check server status" -ForegroundColor Gray
    Write-Host "   pm2 logs            - View server logs" -ForegroundColor Gray
    Write-Host "   pm2 restart all     - Restart server" -ForegroundColor Gray
    Write-Host "   pm2 stop all        - Stop server" -ForegroundColor Gray
    Write-Host "   pm2 delete all      - Remove server from PM2" -ForegroundColor Gray
    
}
else {
    Write-Host "Starting server directly with Node.js..." -ForegroundColor Cyan
    Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Gray
    Write-Host ""
    
    # Start server directly
    node server.js
}

Write-Host ""
Write-Host "Server startup completed!" -ForegroundColor Green
