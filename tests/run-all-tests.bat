@echo off
cd /d C:\Projects\lucaverse\lucaverse.com\tests

echo ==================================
echo Running Unit Tests...
echo ==================================
call npx vitest run --reporter=verbose

echo.
echo ==================================
echo Running GUI Tests...
echo ==================================
call npx playwright test gui-tests/ --workers=2

echo.
echo ==================================
echo Running Integration Tests...
echo ==================================
call npx playwright test integration-tests/ --workers=2

echo.
echo ==================================
echo All tests completed!
echo ==================================