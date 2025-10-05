# PowerShell script to create secure .env file for Viktoria's Bistro
Write-Host "Creating secure .env file for Viktoria's Bistro..." -ForegroundColor Green
Write-Host ""
Write-Host "This script will create a .env file using the template." -ForegroundColor Yellow
Write-Host "You need to manually fill in your actual API keys." -ForegroundColor Yellow
Write-Host ""

# Copy template to .env
if (Test-Path "env.template") {
    Copy-Item "env.template" ".env"
    Write-Host ".env file created from template!" -ForegroundColor Green
} else {
    Write-Host "ERROR: env.template file not found!" -ForegroundColor Red
    Write-Host "Please ensure env.template exists in the current directory." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "IMPORTANT: You must now edit .env file and replace placeholder values with your actual API keys:" -ForegroundColor Cyan
Write-Host ""
Write-Host "Required values to update:" -ForegroundColor Yellow
Write-Host "  - SENDGRID_API_KEY=your_sendgrid_api_key_here" -ForegroundColor White
Write-Host "  - FIREBASE_PROJECT_ID=your_firebase_project_id" -ForegroundColor White
Write-Host "  - FIREBASE_PRIVATE_KEY=`"your_private_key_here`"" -ForegroundColor White
Write-Host "  - FIREBASE_CLIENT_EMAIL=your_client_email_here" -ForegroundColor White
Write-Host "  - LALAMOVE_API_KEY=your_lalamove_api_key_here" -ForegroundColor White
Write-Host "  - LALAMOVE_API_SECRET=your_lalamove_api_secret_here" -ForegroundColor White
Write-Host ""
Write-Host "Optional values:" -ForegroundColor Yellow
Write-Host "  - GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here" -ForegroundColor White
Write-Host ""
Write-Host "After updating .env file, your application will be secure for Git commits." -ForegroundColor Green
Write-Host ""
Write-Host "Press any key to continue..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
