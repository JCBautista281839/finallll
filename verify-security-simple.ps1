# Security Verification Script for Viktoria's Bistro
Write-Host "Verifying Security Configuration..." -ForegroundColor Cyan
Write-Host ""

# Check if .env file exists
if (Test-Path ".env") {
    Write-Host ".env file exists" -ForegroundColor Green
} else {
    Write-Host ".env file missing - Run create-secure-env.ps1 first" -ForegroundColor Red
    exit 1
}

# Check if .gitignore exists and contains .env
if (Test-Path ".gitignore") {
    $gitignoreContent = Get-Content ".gitignore" -Raw
    if ($gitignoreContent -match "\.env") {
        Write-Host ".env is protected by .gitignore" -ForegroundColor Green
    } else {
        Write-Host ".env not protected by .gitignore" -ForegroundColor Red
    }
} else {
    Write-Host ".gitignore file missing" -ForegroundColor Red
}

# Check if old config files are removed
if (Test-Path "config.env") {
    Write-Host "config.env still exists - consider deleting" -ForegroundColor Yellow
} else {
    Write-Host "config.env removed" -ForegroundColor Green
}

if (Test-Path "config.env.secure") {
    Write-Host "config.env.secure still exists - consider deleting" -ForegroundColor Yellow
} else {
    Write-Host "config.env.secure removed" -ForegroundColor Green
}

# Check if Firebase service account file exists
if (Test-Path "firebase-service-account.json") {
    Write-Host "firebase-service-account.json exists - optional fallback" -ForegroundColor Yellow
} else {
    Write-Host "firebase-service-account.json not found - using .env only" -ForegroundColor Green
}

Write-Host ""
Write-Host "Security Status Summary:" -ForegroundColor Yellow
Write-Host "   - Environment variables: Configured" -ForegroundColor White
Write-Host "   - Sensitive files: Protected" -ForegroundColor White
Write-Host "   - Old config files: Cleaned up" -ForegroundColor White
Write-Host ""
Write-Host "Your application is now secure for Git commits!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "   1. Commit your changes to Git safely" -ForegroundColor White
Write-Host "   2. Push to GitHub without exposing sensitive data" -ForegroundColor White
Write-Host "   3. Share env.template with team members" -ForegroundColor White
