# PowerShell script to run tests
Set-Location -Path $PSScriptRoot

Write-Host "Running Unit Tests..." -ForegroundColor Green
$unitResult = & npx vitest run --reporter=verbose 2>&1
Write-Host $unitResult

Write-Host "`nRunning GUI Tests..." -ForegroundColor Green
$guiResult = & npx playwright test gui-tests/ --workers=2 2>&1
Write-Host $guiResult

Write-Host "`nRunning Integration Tests..." -ForegroundColor Green
$integrationResult = & npx playwright test integration-tests/ --workers=2 2>&1
Write-Host $integrationResult