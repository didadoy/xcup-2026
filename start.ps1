# xCup 2026 - Start script
Write-Host "Starting xCup 2026..." -ForegroundColor Cyan

# Kill previous instances
Get-Process python -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep 1

# Start backend
Write-Host "Starting backend (port 8000)..." -ForegroundColor Yellow
Start-Process python -ArgumentList "-m", "uvicorn", "main:app", "--port", "8000", "--reload" `
  -WorkingDirectory "$PSScriptRoot\backend" -WindowStyle Minimized
Start-Sleep 4

# Verify backend
try {
  $h = Invoke-RestMethod http://localhost:8000/api/health -TimeoutSec 5
  Write-Host "Backend OK (API key: $($h.has_api_key))" -ForegroundColor Green
} catch {
  Write-Host "Backend may still be starting..." -ForegroundColor Yellow
}

# Start frontend
Write-Host "Starting frontend (port 5173)..." -ForegroundColor Yellow
Start-Process cmd -ArgumentList "/c", "cd /d `"$PSScriptRoot\frontend`" && npm run dev" -WindowStyle Minimized
Start-Sleep 4

Write-Host ""
Write-Host "App running at: http://localhost:5173" -ForegroundColor Cyan
Write-Host ""
Write-Host "Optional: add your football-data.org API key for live data:" -ForegroundColor White
Write-Host "  Create backend\.env with: FOOTBALL_DATA_API_KEY=your_key" -ForegroundColor Gray
Write-Host ""

# Open browser
Start-Process "http://localhost:5173"
