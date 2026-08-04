@echo off
rem FocusTree 专注种树 - 一键启动客户端
rem 启动 Vite 开发服务器并打开浏览器

chcp 65001 >nul
title FocusTree · 专注种树

set PROJECT_DIR=C:\Users\朱梓纲\Projects\Engineering\Projects\FocusTree

cd /d "%PROJECT_DIR%"

echo.
echo  🌱 FocusTree 专注种树正在启动...
echo.

rem 检查 node_modules 是否存在
if not exist "%PROJECT_DIR%\node_modules" (
    echo 首次运行，正在安装依赖，请稍候...
    call npm install
)

rem 启动开发服务器（后台）
start /b cmd /c "npm run dev > "%PROJECT_DIR%\.dev-server.log" 2>&1"

rem 等待服务器就绪（最多等 20 秒）
set READY=0
for /l %%i in (1,1,20) do (
    timeout /t 1 /nobreak >nul
    curl -s -o nul http://localhost:5173 2>nul
    if not errorlevel 1 (
        set READY=1
        goto :ready
    )
)

:ready
if "%READY%"=="1" (
    echo  ✅ 服务器已就绪，正在打开浏览器...
    start "" http://localhost:5173
) else (
    echo  ⚠️ 服务器启动较慢，请手动打开 http://localhost:5173
    start "" http://localhost:5173
)

echo.
echo  💡 关闭本窗口不会停止服务器。如需停止，请运行 stop-focus-tree.bat
echo.
pause
