@echo off
rem FocusTree - 停止开发服务器
chcp 65001 >nul

echo 正在停止 FocusTree 开发服务器...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5173 ^| findstr LISTENING') do (
    taskkill /f /pid %%a >nul 2>&1
)
echo  ✅ 已停止。
pause
