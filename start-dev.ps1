# start-dev.ps1 — starts backend and frontend in separate terminal windows

$root = Split-Path -Parent $MyInvocation.MyCommand.Path

Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\backend'; npm run dev" -WindowStyle Normal
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\frontend'; npm run dev" -WindowStyle Normal

Write-Host ""
Write-Host "Both servers are starting in separate windows."
Write-Host "  Backend  > http://localhost:5000"
Write-Host "  Frontend > http://localhost:5173"
Write-Host ""
