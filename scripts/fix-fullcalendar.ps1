# PowerShell script to fix FullCalendar installation
Write-Host "Clearing Next.js cache..." -ForegroundColor Yellow
if (Test-Path ".next") {
    Remove-Item -Recurse -Force ".next"
    Write-Host "✓ .next folder deleted" -ForegroundColor Green
}

Write-Host "`nInstalling FullCalendar packages..." -ForegroundColor Yellow
npm install @fullcalendar/react@6.1.19 @fullcalendar/core@6.1.19 @fullcalendar/daygrid@6.1.19 @fullcalendar/timegrid@6.1.19 @fullcalendar/interaction@6.1.19 @fullcalendar/list@6.1.19 --save

Write-Host "`nVerifying installation..." -ForegroundColor Yellow
if (Test-Path "node_modules\@fullcalendar\daygrid") {
    Write-Host "✓ FullCalendar packages installed successfully!" -ForegroundColor Green
} else {
    Write-Host "✗ Installation may have failed. Please run 'npm install' manually." -ForegroundColor Red
}

Write-Host "`nDone! Please restart your dev server." -ForegroundColor Cyan

