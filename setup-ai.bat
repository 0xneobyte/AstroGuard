@echo off
echo ========================================
echo   ASTROGUARD AI Chatbot Setup
echo ========================================
echo.

REM Check if .env file exists
if exist backend\.env (
    echo Found existing .env file in backend/
    echo.
    choice /C YN /M "Do you want to update your OpenAI API key"
    if errorlevel 2 goto :end
) else (
    echo Creating new .env file from template...
    copy backend\.env.example backend\.env
    echo.
)

echo.
echo Please enter your OpenAI API key:
echo (Get it from: https://platform.openai.com/api-keys)
echo.
set /p OPENAI_KEY="API Key: "

if "%OPENAI_KEY%"=="" (
    echo Error: API key cannot be empty!
    pause
    exit /b 1
)

echo.
echo Updating .env file...

REM Read existing .env and update OPENAI_API_KEY
powershell -Command "(Get-Content backend\.env) -replace 'OPENAI_API_KEY=.*', 'OPENAI_API_KEY=%OPENAI_KEY%' | Set-Content backend\.env"

echo.
echo ========================================
echo   Configuration Complete!
echo ========================================
echo.
echo Your OpenAI API key has been saved to backend/.env
echo.
echo Next steps:
echo 1. Install OpenAI library: cd backend ^&^& pip install openai
echo 2. Start the backend server: cd backend ^&^& python main.py
echo 3. The AI chatbot button will appear when you select an asteroid!
echo.
echo ========================================

:end
pause
