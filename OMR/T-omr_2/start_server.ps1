# OMR Testing System - PowerShell Startup Script
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "OMR Testing System - Server Startup" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Function to find Python
function Find-Python {
    # Try system Python first
    try {
        $pythonVersion = python --version 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Found system Python: $pythonVersion" -ForegroundColor Green
            return "python"
        }
    } catch {
        # Continue to check other locations
    }
    
    # Check common Python installation locations
    $pythonPaths = @(
        "$env:USERPROFILE\AppData\Local\Programs\Python\Python313\python.exe",
        "$env:USERPROFILE\AppData\Local\Programs\Python\Python312\python.exe",
        "$env:USERPROFILE\AppData\Local\Programs\Python\Python311\python.exe",
        "$env:USERPROFILE\AppData\Local\Programs\Python\Python310\python.exe",
        "$env:USERPROFILE\AppData\Local\Programs\Python\Python39\python.exe",
        "$env:USERPROFILE\AppData\Local\Programs\Python\Python38\python.exe",
        "C:\Program Files\Python313\python.exe",
        "C:\Program Files\Python312\python.exe",
        "C:\Program Files\Python311\python.exe"
    )
    
    foreach ($path in $pythonPaths) {
        if (Test-Path $path) {
            try {
                $version = & $path --version 2>$null
                if ($LASTEXITCODE -eq 0) {
                    Write-Host "✅ Found Python: $version at $path" -ForegroundColor Green
                    return $path
                }
            } catch {
                # Continue checking other paths
            }
        }
    }
    
    return $null
}

# Find Python
$pythonPath = Find-Python

if (-not $pythonPath) {
    Write-Host "❌ Python not found!" -ForegroundColor Red
    Write-Host "Please install Python 3.7+ from https://python.org" -ForegroundColor Yellow
    Write-Host "Or add Python to your system PATH" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "🚀 Starting OMR Testing Server..." -ForegroundColor Green
Write-Host ""
Write-Host "Server will be available at: http://localhost:5003" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

# Start the server
try {
    & $pythonPath start_server.py
} catch {
    Write-Host "❌ Error starting server: $_" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Read-Host "Press Enter to exit"
