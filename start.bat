@echo off
echo Pornire AI Server...
start "AI Server" cmd /k "cd /d %~dp0 && python -m uvicorn ai.main:app --host 0.0.0.0 --port 8000"

echo Pornire Frontend...
start "Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo Ambele servicii au fost pornite!
