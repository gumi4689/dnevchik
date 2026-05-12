@echo off
echo Останавливаем старые процессы...
taskkill /F /IM node.exe /IM dnevchik.exe 2>nul

echo Запускаем Vite dev сервер...
start /min cmd /c "cd /d %~dp0 && npx vite --host 127.0.0.1 --port 5175"

echo Ожидаем запуска сервера...
timeout /t 7 /nobreak >nul

echo Запускаем приложение...
start "" "%~dp0src-tauri\target\debug\dnevchik.exe"

exit
